import type { BundesanzeigerAnalyse, InsolvenzEintrag, RisikoAmpel } from '../types/antrag';

const TIMEOUT_MS = 12000;

function fetchMitTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

// ── Insolvenzbekanntmachungen.de ──────────────────────────────────────────────
// Hinweis: insolvenzbekanntmachungen.de verwendet seit 2024 eine JSF-Architektur
// (Jakarta Faces) mit sessionbasierter Authentifizierung. Die Abfrage ist über einen
// einfachen HTTP-Proxy nicht mehr automatisierbar. Für die Produktionsumgebung ist eine
// Backend-Integration oder die INSOLVANZEREGISTER-API des Bundesjustizamts erforderlich.

async function pruefeInsolvenz(_firma: string): Promise<InsolvenzEintrag[]> {
  throw new Error(
    'insolvenzbekanntmachungen.de: JSF-Session erforderlich – direkte Abfrage nicht möglich'
  );
}

// ── Bundesanzeiger — Jahresabschluss ──────────────────────────────────────────
// Der Bundesanzeiger erfordert für strukturierten Datenzugang einen authentifizierten
// Zugang über die Bundesanzeiger GmbH oder über das Unternehmensregister (XBRL-API).

async function pruefeJahresabschluss(firma: string): Promise<{
  status: 'aktuell' | 'fehlt' | 'unbekannt';
  letzterJahresabschluss?: string;
}> {
  // Wir können die Suche aufrufen, aber ohne Session-Cookies keine firmenspezifischen Ergebnisse
  const params = new URLSearchParams({ fulltext: firma });
  const res = await fetchMitTimeout(`/proxy/bundesanzeiger/pub/de/suche?${params.toString()}`);
  if (!res.ok) throw new Error(`Bundesanzeiger: HTTP ${res.status}`);
  const html = await res.text();

  // Prüfe ob der Seiteninhalt firmenspezifische Jahresabschluss-Daten enthält
  // (nur möglich wenn Bundesanzeiger ohne Auth ausliefert — i.d.R. nicht der Fall)
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const bodyText = doc.body?.textContent ?? '';
  const currentYear = new Date().getFullYear();

  const hasSpecificEntry =
    bodyText.includes(firma.substring(0, Math.min(firma.length, 8))) &&
    (bodyText.includes(String(currentYear)) || bodyText.includes(String(currentYear - 1)));

  if (hasSpecificEntry) {
    const yearMatch = bodyText.match(/(\d{4})/);
    return { status: 'aktuell', letzterJahresabschluss: yearMatch?.[1] };
  }

  // Ohne Authentifizierung keine verlässliche Aussage möglich
  throw new Error('Bundesanzeiger: Firmenspezifische Daten nur mit authentifiziertem API-Zugang');
}

// ── Hauptfunktion ─────────────────────────────────────────────────────────────

export async function pruefeBundesanzeiger(firma: string): Promise<BundesanzeigerAnalyse> {
  const [insolvenzResult, jahresabschlussResult] = await Promise.allSettled([
    pruefeInsolvenz(firma),
    pruefeJahresabschluss(firma),
  ]);

  const insolvenzeintraege =
    insolvenzResult.status === 'fulfilled' ? insolvenzResult.value : [];

  const jahresabschluss =
    jahresabschlussResult.status === 'fulfilled' ? jahresabschlussResult.value : null;

  const fehlerTeile = [
    insolvenzResult.status === 'rejected'
      ? (insolvenzResult.reason as Error)?.message ?? 'Insolvenz: Fehler'
      : null,
    jahresabschlussResult.status === 'rejected'
      ? (jahresabschlussResult.reason as Error)?.message ?? 'Jahresabschluss: Fehler'
      : null,
  ].filter((x): x is string => x !== null);

  const fehler = fehlerTeile.length > 0 ? fehlerTeile.join(' | ') : undefined;

  let ampel: RisikoAmpel;
  if (insolvenzeintraege.length > 0) ampel = 'rot';
  else if (jahresabschluss?.status === 'fehlt') ampel = 'gelb';
  else if (fehlerTeile.length >= 1) ampel = 'unbekannt';
  else ampel = 'gruen';

  return {
    ampel,
    insolvenzeintraege,
    jahresabschlussStatus: jahresabschluss?.status ?? 'unbekannt',
    letzterJahresabschluss: jahresabschluss?.letzterJahresabschluss,
    fehler,
    geprueftAm: new Date().toISOString(),
    gepruefteFirma: firma,
  };
}
