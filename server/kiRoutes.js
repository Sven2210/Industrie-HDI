// HTTP-Routen für den AI Hub. Bewusst KEIN generischer Chat-Proxy: Der Browser bekommt nur
// Status, Modellliste, einen festen Verbindungstest und fachliche Funktionen mit festem Prompt
// (z. B. Risikozusammenfassung), damit über das Backend nicht beliebig Token auf Kosten des
// AI-Hub-Keys verbraucht werden können.

import express, { Router } from 'express';
import { AiHubError, httpStatusFuerClient } from './aiHub.js';
import { bereinigeEingabe, baueMessages, parseZusammenfassung } from './risikoZusammenfassung.js';

export function sendeFehler(res, e) {
  if (!(e instanceof AiHubError)) {
    console.error('[ki] Unerwarteter Fehler', e);
    return res.status(500).json({ fehler: { art: 'intern', meldung: 'Interner Fehler.' } });
  }
  if (e.retryAfterMs !== undefined) res.setHeader('Retry-After', String(Math.ceil(e.retryAfterMs / 1000)));
  // Zur Diagnose nur Art/Status loggen — niemals Header oder Key.
  console.error(`[ki] AI Hub Fehler: ${e.art}${e.status ? ` (HTTP ${e.status})` : ''}`);
  return res.status(httpStatusFuerClient(e.art)).json({ fehler: { art: e.art, meldung: e.message } });
}

// Einfaches Fenster-Limit pro Prozess (reicht für den Verbindungstest).
export function createRateLimiter({ max, fensterMs, jetzt = Date.now }) {
  let start = jetzt();
  let zaehler = 0;
  return () => {
    const t = jetzt();
    if (t - start >= fensterMs) {
      start = t;
      zaehler = 0;
    }
    zaehler += 1;
    return zaehler <= max ? 0 : Math.ceil((start + fensterMs - t) / 1000);
  };
}

export function createKiRouter(client, {
  pingLimit = createRateLimiter({ max: 10, fensterMs: 60_000 }),
  zusammenfassungLimit = createRateLimiter({ max: 20, fensterMs: 60_000 }),
} = {}) {
  const router = Router();

  router.get('/status', (_req, res) => {
    res.json(client.status());
  });

  router.get('/modelle', async (_req, res) => {
    try {
      res.json({ modelle: await client.modelle() });
    } catch (e) {
      sendeFehler(res, e);
    }
  });

  router.post('/ping', async (_req, res) => {
    const warten = pingLimit();
    if (warten > 0) {
      res.setHeader('Retry-After', String(warten));
      return res.status(429).json({ fehler: { art: 'rate_limit', meldung: 'Zu viele Verbindungstests — bitte kurz warten.' } });
    }
    try {
      const ergebnis = await client.chat({
        messages: [{ role: 'user', content: 'Antworte nur mit dem Wort: OK' }],
        maxTokens: 16,
        temperature: 0,
      });
      res.json({ ok: true, antwort: ergebnis.text.slice(0, 100), modell: ergebnis.modell });
    } catch (e) {
      sendeFehler(res, e);
    }
  });

  // Risikozusammenfassung: fester Prompt, Eingabe wird geprüft und gekürzt (siehe risikoZusammenfassung.js).
  router.post('/risikozusammenfassung', express.json({ limit: '64kb' }), async (req, res) => {
    const warten = zusammenfassungLimit();
    if (warten > 0) {
      res.setHeader('Retry-After', String(warten));
      return res.status(429).json({ fehler: { art: 'rate_limit', meldung: 'Zu viele Anfragen — bitte kurz warten.' } });
    }
    const eingabe = bereinigeEingabe(req.body);
    if (!eingabe) {
      return res.status(400).json({ fehler: { art: 'ungueltige_anfrage', meldung: 'Keine Analyseergebnisse zum Zusammenfassen übergeben.' } });
    }
    try {
      const ergebnis = await client.chat({ messages: baueMessages(eingabe), maxTokens: 4000 });
      const zusammenfassung = parseZusammenfassung(ergebnis.text);
      if (!zusammenfassung) {
        // Nur Form der Antwort loggen (Abbruchgrund, Länge, Anfang) — zur Diagnose, ohne Eingabedaten.
        console.error(`[ki] Zusammenfassung: Modellantwort nicht lesbar (finish_reason=${ergebnis.finishReason}, ${ergebnis.text.length} Zeichen): ${JSON.stringify(ergebnis.text.slice(0, 200))}`);
        return res.status(502).json({ fehler: { art: 'antwortformat', meldung: `Die Antwort des Modells war nicht auswertbar (Abbruchgrund: ${ergebnis.finishReason ?? 'unbekannt'}, ${ergebnis.text.length} Zeichen). Bitte erneut versuchen.` } });
      }
      res.json({ zusammenfassung, modell: ergebnis.modell, erstelltAm: new Date().toISOString() });
    } catch (e) {
      sendeFehler(res, e);
    }
  });

  // Fehler des JSON-Parsers (kaputtes JSON, zu groß) als JSON statt Express-HTML melden
  router.use((err, _req, res, next) => {
    if (res.headersSent) return next(err);
    const zuGross = err?.type === 'entity.too.large';
    res.status(zuGross ? 413 : 400).json({ fehler: { art: zuGross ? 'zu_gross' : 'ungueltige_anfrage', meldung: zuGross ? 'Die Anfrage ist zu groß.' : 'Ungültige Anfrage.' } });
  });

  return router;
}
