import type { AntragData } from '../types/antrag';

export interface RueckfrageEntwurf {
  betreff: string;
  nachricht: string;
}

// Eingabe für den KI-Entwurf: nur die offenen Punkte (unbeantwortete BHV-Kategorien mit Hinweis
// und im Fragebogen nicht gefundene Felder) — bewusst ohne Kunden- oder Personennamen.
export function baueRueckfrageEingabe(data: AntragData, zusatzhinweis: string) {
  const offenePunkte = (data.analyse?.bhvErgebnis?.kategorien ?? [])
    .filter((k) => k.stufe === 'unbeantwortet')
    .map((k) => ({ titel: k.titel, hinweis: k.begruendung }));
  const fehlendeAngaben = data.fragebogenUebernahme?.nichtGefunden ?? [];
  return { offenePunkte, fehlendeAngaben, zusatzhinweis };
}

export async function erzeugeRueckfrageEntwurf(eingabe: ReturnType<typeof baueRueckfrageEingabe>): Promise<RueckfrageEntwurf> {
  let res: Response;
  try {
    res = await fetch('/api/ki/rueckfrage-entwurf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eingabe),
    });
  } catch {
    throw new Error('Der Server ist nicht erreichbar.');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.fehler?.meldung ?? `Fehler ${res.status} beim Erstellen des Entwurfs.`);
  const e = body?.entwurf;
  if (!e || typeof e.nachricht !== 'string') throw new Error('Unerwartete Antwort vom Server.');
  return { betreff: typeof e.betreff === 'string' ? e.betreff : '', nachricht: e.nachricht };
}
