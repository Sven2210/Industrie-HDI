// Client für den adesso AI Hub (OpenAI-kompatibles Gateway). Läuft ausschließlich im Backend;
// der API-Key kommt aus der Umgebungsvariable AI_HUB_API_KEY und taucht weder in Antworten,
// Fehlermeldungen noch Logs auf.
//
// Laut OpenAPI-Spezifikation des Hubs (GET /openapi.json) dokumentiert:
//   POST /v1/chat/completions, GET /v1/models, Anmeldung per "Authorization: Bearer sk-aihub-…",
//   "stream": true liefert Server-Sent Events, Fehler als application/problem+json
//   ({title, detail, status}) oder {error:{message,…}}.
// Nur als "OpenAI-kompatibel" beschrieben (nicht im Detail): Aufbau der Erfolgsantwort — sie wird
// deshalb defensiv gelesen (choices[0].message.content) und bei Abweichung als 'antwortformat' gemeldet.

const STANDARD_BASIS_URL = 'https://adesso-ai-hub.3asabc.de';
const STANDARD_TIMEOUT_MS = 60_000;
const MAX_VERSUCHE = 3;
const MAX_WARTEZEIT_MS = 10_000;
const WIEDERHOLBARE_STATUS = new Set([429, 502, 503, 504]);

const ARTEN = {
  400: 'ungueltige_anfrage',
  401: 'authentifizierung',
  402: 'budget',
  403: 'modell_nicht_erlaubt',
  413: 'zu_gross',
  429: 'rate_limit',
  503: 'nicht_verfuegbar',
};

const MELDUNGEN = {
  ungueltige_anfrage: 'Die Anfrage wurde vom AI Hub abgelehnt.',
  authentifizierung: 'Der API-Key für den AI Hub fehlt, ist falsch oder abgelaufen.',
  budget: 'Das Budget für den AI Hub ist aufgebraucht.',
  modell_nicht_erlaubt: 'Dieses Modell darf mit dem aktuellen API-Key nicht genutzt werden.',
  zu_gross: 'Die Anfrage an den AI Hub ist zu groß.',
  rate_limit: 'Zu viele Anfragen an den AI Hub — bitte später erneut versuchen.',
  nicht_verfuegbar: 'Der AI Hub ist gerade überlastet oder nicht verfügbar.',
  unbekannt: 'Unerwartete Antwort des AI Hub.',
};

const CLIENT_STATUS = {
  nicht_konfiguriert: 503,
  ungueltige_anfrage: 400,
  zu_gross: 413,
  rate_limit: 429,
  nicht_verfuegbar: 503,
  budget: 503,
  timeout: 504,
};

export class AiHubError extends Error {
  constructor(art, message, { status, retryAfterMs, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'AiHubError';
    this.art = art;
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

// Status, den unser eigenes Backend an den Browser zurückgibt. Ein 401/403 des Hubs ist ein
// Konfigurationsproblem des Servers und darf nicht wie eine fehlende Anmeldung des Nutzers wirken.
export function httpStatusFuerClient(art) {
  return CLIENT_STATUS[art] ?? 502;
}

function parseRetryAfter(wert) {
  if (!wert) return undefined;
  const sekunden = Number(wert);
  if (Number.isFinite(sekunden)) return Math.max(0, sekunden * 1000);
  const datum = Date.parse(wert);
  return Number.isNaN(datum) ? undefined : Math.max(0, datum - Date.now());
}

async function fehlerAusAntwort(res) {
  let detail;
  try {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      detail = json?.detail ?? json?.error?.message ?? json?.title;
    } catch {
      detail = text.slice(0, 200) || undefined;
    }
  } catch {
    // Body nicht lesbar — der Status allein genügt für die Meldung.
  }
  const art = ARTEN[res.status] ?? 'unbekannt';
  const meldung = `${MELDUNGEN[art]}${detail ? ` (${String(detail).slice(0, 200)})` : ''}`;
  return new AiHubError(art, meldung, { status: res.status, retryAfterMs: parseRetryAfter(res.headers.get('retry-after')) });
}

function erstelleTimeout(controller, ms) {
  let timer = setTimeout(() => controller.abort(), ms);
  return {
    neu() {
      clearTimeout(timer);
      timer = setTimeout(() => controller.abort(), ms);
    },
    stopp() {
      clearTimeout(timer);
    },
  };
}

function extrahiereText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((teil) => (typeof teil === 'string' ? teil : teil?.type === 'text' ? teil.text ?? '' : '')).join('');
  }
  return undefined;
}

export function createAiHubClient({ env = process.env, fetchImpl, sleep, zufall = Math.random } = {}) {
  const holeFetch = () => fetchImpl ?? globalThis.fetch;
  const warte = sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));

  function konfiguration() {
    const timeout = Number(env.AI_HUB_TIMEOUT_MS);
    return {
      apiKey: env.AI_HUB_API_KEY?.trim() || undefined,
      modell: env.AI_HUB_MODEL?.trim() || undefined,
      basisUrl: (env.AI_HUB_BASE_URL?.trim() || STANDARD_BASIS_URL).replace(/\/+$/, ''),
      timeoutMs: timeout > 0 ? timeout : STANDARD_TIMEOUT_MS,
    };
  }

  function status() {
    const { apiKey, modell } = konfiguration();
    return { konfiguriert: Boolean(apiKey), modellGesetzt: Boolean(modell), modell: modell ?? null };
  }

  const wartezeit = (versuch, retryAfterMs) =>
    retryAfterMs !== undefined
      ? Math.min(retryAfterMs, MAX_WARTEZEIT_MS)
      : 500 * 2 ** (versuch - 1) + Math.floor(zufall() * 250);

  // Eine Anfrage mit Wiederholung bei 429/502/503/504, Netzwerkfehlern und Timeouts
  // (exponentieller Backoff, Retry-After wird beachtet). Alle anderen Fehler sofort.
  async function sende(pfad, { method = 'POST', body } = {}) {
    const { apiKey, basisUrl, timeoutMs } = konfiguration();
    if (!apiKey) throw new AiHubError('nicht_konfiguriert', 'AI_HUB_API_KEY ist nicht gesetzt.');

    for (let versuch = 1; ; versuch++) {
      const controller = new AbortController();
      const timer = erstelleTimeout(controller, timeoutMs);
      let res;
      try {
        res = await holeFetch()(`${basisUrl}${pfad}`, {
          method,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json, text/event-stream',
            ...(body ? { 'Content-Type': 'application/json' } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
      } catch (e) {
        timer.stopp();
        if (versuch < MAX_VERSUCHE) {
          await warte(wartezeit(versuch));
          continue;
        }
        if (controller.signal.aborted) {
          throw new AiHubError('timeout', 'Zeitüberschreitung bei der Anfrage an den AI Hub.', { cause: e });
        }
        throw new AiHubError('netzwerk', 'Der AI Hub ist nicht erreichbar.', { cause: e });
      }

      if (res.ok) return { res, timer, controller };

      timer.stopp();
      const fehler = await fehlerAusAntwort(res);
      if (WIEDERHOLBARE_STATUS.has(res.status) && versuch < MAX_VERSUCHE) {
        await warte(wartezeit(versuch, fehler.retryAfterMs));
        continue;
      }
      throw fehler;
    }
  }

  function baueChatBody({ messages, modell, temperature, maxTokens, stream }) {
    if (!Array.isArray(messages) || messages.length === 0 || messages.some((m) => !m || typeof m.role !== 'string' || m.content === undefined)) {
      throw new AiHubError('ungueltige_anfrage', 'messages muss eine nicht leere Liste aus {role, content} sein.');
    }
    const modellId = modell ?? konfiguration().modell;
    if (!modellId) {
      throw new AiHubError('nicht_konfiguriert', 'AI_HUB_MODEL ist nicht gesetzt (Modell-ID aus dem AI-Hub-Portal).');
    }
    return {
      model: modellId,
      messages,
      ...(temperature !== undefined ? { temperature } : {}),
      ...(maxTokens !== undefined ? { max_tokens: maxTokens } : {}),
      ...(stream ? { stream: true } : {}),
    };
  }

  async function chat({ messages, modell, temperature, maxTokens } = {}) {
    const body = baueChatBody({ messages, modell, temperature, maxTokens, stream: false });
    const { res, timer, controller } = await sende('/v1/chat/completions', { body });
    try {
      let daten;
      try {
        daten = await res.json();
      } catch (e) {
        const art = controller.signal.aborted ? 'timeout' : 'antwortformat';
        throw new AiHubError(art, art === 'timeout' ? 'Zeitüberschreitung beim Lesen der AI-Hub-Antwort.' : 'Die Antwort des AI Hub ist kein gültiges JSON.', { cause: e });
      }
      const text = extrahiereText(daten?.choices?.[0]?.message?.content);
      if (text === undefined) throw new AiHubError('antwortformat', 'Die Antwort des AI Hub enthält keinen Text.');
      return {
        text,
        modell: daten.model ?? body.model,
        finishReason: daten.choices[0].finish_reason ?? null,
        nutzung: daten.usage ?? null,
      };
    } finally {
      timer.stopp();
    }
  }

  // Liefert nacheinander { text } je Textstück und am Ende ggf. { nutzung }.
  async function* chatStream({ messages, modell, temperature, maxTokens } = {}) {
    const body = baueChatBody({ messages, modell, temperature, maxTokens, stream: true });
    const { res, timer } = await sende('/v1/chat/completions', { body });
    try {
      if (!res.body) throw new AiHubError('antwortformat', 'Der AI Hub lieferte keinen Stream.');
      const decoder = new TextDecoder();
      let puffer = '';

      const verarbeiteZeile = (zeile) => {
        if (!zeile.startsWith('data:')) return undefined; // Kommentare/Keep-alive und andere SSE-Felder
        const nutzlast = zeile.slice(5).trim();
        if (nutzlast === '[DONE]') return { fertig: true };
        let daten;
        try {
          daten = JSON.parse(nutzlast);
        } catch (e) {
          throw new AiHubError('antwortformat', 'Ungültiger Stream-Block vom AI Hub.', { cause: e });
        }
        if (daten.error) {
          throw new AiHubError('unbekannt', `${MELDUNGEN.unbekannt} (${String(daten.error.message ?? daten.error).slice(0, 200)})`);
        }
        return { daten };
      };

      for await (const stueck of res.body) {
        timer.neu();
        puffer += decoder.decode(stueck, { stream: true });
        let ende;
        while ((ende = puffer.indexOf('\n')) >= 0) {
          const zeile = puffer.slice(0, ende).replace(/\r$/, '');
          puffer = puffer.slice(ende + 1);
          const ergebnis = verarbeiteZeile(zeile);
          if (!ergebnis) continue;
          if (ergebnis.fertig) return;
          const delta = extrahiereText(ergebnis.daten.choices?.[0]?.delta?.content);
          if (delta) yield { text: delta };
          if (ergebnis.daten.usage) yield { nutzung: ergebnis.daten.usage };
        }
      }
    } catch (e) {
      if (e instanceof AiHubError) throw e;
      throw new AiHubError('netzwerk', 'Die Verbindung zum AI Hub wurde unterbrochen.', { cause: e });
    } finally {
      timer.stopp();
    }
  }

  async function modelle() {
    const { res, timer } = await sende('/v1/models', { method: 'GET' });
    try {
      const daten = await res.json();
      return (daten?.data ?? []).map((m) => ({
        id: m.id,
        kontext: m.context_length ?? null,
        maxAusgabe: m.max_output_tokens ?? null,
        modus: m.mode ?? null,
      }));
    } catch (e) {
      throw new AiHubError('antwortformat', 'Die Modellliste des AI Hub ist nicht lesbar.', { cause: e });
    } finally {
      timer.stopp();
    }
  }

  return { status, chat, chatStream, modelle };
}
