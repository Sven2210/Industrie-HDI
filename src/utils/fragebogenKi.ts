import type { HochgeladenesDokument, KiAuslese } from '../types/antrag';
import { extrahiereTextElemente } from './pdfLader';
import { liesFragebogen } from './fragebogenExtraktion';
import type { FragebogenFelder } from './fragebogenExtraktion';
import { fuehreZusammen, hatLuecken } from './fragebogenKiMerge';
import type { FeldSchluessel } from './fragebogenKiMerge';

// Kombinierte Fragebogen-Auslese: die Regeln lesen zuerst (schnell, ohne Datenversand). Nur bei
// Lücken oder wenn das PDF ein Scan ohne Textebene ist, liest der adesso AI Hub nach. Werte der Regeln
// haben immer Vorrang — die KI füllt nur, was die Regeln nicht gefunden haben.

export interface KombiAuslese {
  regelFelder: FragebogenFelder;
  felder: FragebogenFelder; // Regeln + KI
  kiFelder: FeldSchluessel[]; // Felder, die erst die KI geliefert hat
  kiAuslese?: KiAuslese;
  kiHinweis?: string;
}

let statusCache: Promise<boolean> | undefined;

// Ist der AI Hub im Backend konfiguriert? (einmal pro Seitenaufruf abgefragt)
export function kiVerfuegbar(): Promise<boolean> {
  statusCache ??= fetch('/api/ki/status')
    .then((res) => (res.ok ? res.json() : null))
    .then((s) => Boolean(s?.konfiguriert && s?.modellGesetzt))
    .catch(() => false);
  return statusCache;
}

export async function leseFragebogenMitKi(dokument: HochgeladenesDokument): Promise<KiAuslese> {
  let res: Response;
  try {
    res = await fetch('/api/ki/fragebogen-lesen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdf: dokument.inhaltBase64 }),
    });
  } catch {
    throw new Error('Der Server ist nicht erreichbar.');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.fehler?.meldung ?? `Fehler ${res.status} bei der KI-Auslese.`);
  if (!body?.felder || !body?.bhvFakten) throw new Error('Unerwartete Antwort vom Server.');
  return {
    dokumentId: dokument.id,
    erstelltAm: body.erstelltAm ?? new Date().toISOString(),
    modell: body.modell ?? '',
    felder: body.felder,
    bhvFakten: body.bhvFakten,
  };
}

// Holt die KI-Auslese eines Dokuments — eine bereits vorhandene wird wiederverwendet, damit das
// Dokument nicht mehrfach an den Hub gesendet wird.
export async function holeKiAuslese(dokument: HochgeladenesDokument, vorhanden?: KiAuslese): Promise<KiAuslese> {
  if (vorhanden && vorhanden.dokumentId === dokument.id) return vorhanden;
  return leseFragebogenMitKi(dokument);
}

export async function leseFragebogenKombiniert(dokument: HochgeladenesDokument, vorhanden?: KiAuslese): Promise<KombiAuslese> {
  const regelFelder = liesFragebogen(await extrahiereTextElemente(dokument));
  const nurRegel: KombiAuslese = { regelFelder, felder: regelFelder, kiFelder: [] };
  if (!hatLuecken(regelFelder) || !(await kiVerfuegbar())) return nurRegel;

  try {
    const kiAuslese = await holeKiAuslese(dokument, vorhanden);
    const { felder, kiFelder } = fuehreZusammen(regelFelder, kiAuslese.felder);
    return { regelFelder, felder, kiFelder, kiAuslese };
  } catch (e) {
    console.error('[fragebogenKi] KI-Auslese nicht möglich', e);
    return { ...nurRegel, kiHinweis: `KI-Auslese nicht möglich: ${e instanceof Error ? e.message : 'unbekannter Fehler'}` };
  }
}
