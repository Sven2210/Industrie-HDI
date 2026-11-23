import type { AntragData, BhvKategorieErgebnis, RisikoAmpel, RisikoZusammenfassung } from '../types/antrag';
import { berechneGesamteinschaetzung } from './bhvAnalyse';

// Eingabe für die KI-Zusammenfassung: nur bereits berechnete Analyseergebnisse und Merkmale —
// bewusst ohne Name, Anschrift oder Ansprechpartner des Kunden.
export interface ZusammenfassungEingabe {
  sparte: string;
  betriebsbeschreibung: string;
  versicherungssumme: string;
  bhvGesamt: { stufe: string; empfehlung: string } | null;
  bhvKategorien: { titel: string; stufe: string; begruendung: string }[];
  standort: { gesamtAmpel: RisikoAmpel } | null;
  naturgefahren: { name: string; ampel: RisikoAmpel; score: number }[];
  umweltrisiko: { ampel: RisikoAmpel; kategorien: { name: string; ampel: RisikoAmpel; begruendung: string }[] } | null;
  sanktionen: { ampel: RisikoAmpel; anzahlTreffer: number } | null;
  risikocheck: { label: string; wert: string; anmerkung: string }[];
}

const NATURGEFAHREN = [
  ['hochwasser', 'Hochwasser'], ['sturm', 'Sturm'], ['erdbeben', 'Erdbeben'],
  ['hagel', 'Hagel'], ['waldbrand', 'Waldbrand'], ['schnee', 'Schnee'],
] as const;

const UMWELT = [
  ['luftemissionen', 'Luftemissionen'], ['gewaesserBoden', 'Gewässer/Boden'], ['abfall', 'Abfall'],
  ['laerm', 'Lärm'], ['brandExplosion', 'Brand/Explosion'],
] as const;

export function baueZusammenfassungEingabe(data: AntragData): ZusammenfassungEingabe {
  const analyse = data.analyse;
  const ueberschreibungen = analyse?.manuelleUeberschreibungen ?? [];
  // Es zählt die aktuell gültige Stufe: manuelle Korrektur, sonst automatische Bewertung.
  const kategorien: BhvKategorieErgebnis[] = (analyse?.bhvErgebnis?.kategorien ?? []).map((k) => {
    const u = ueberschreibungen.find((x) => x.kategorieId === k.id);
    return u ? { ...k, stufe: u.stufe } : k;
  });
  const gesamtUeberschreibung = analyse?.manuelleGesamtUeberschreibung;
  const gesamt = kategorien.length > 0 ? berechneGesamteinschaetzung(kategorien) : null;

  const ra = data.risikoAnalyse;
  const ua = data.umweltrisikoAnalyse;
  const sa = data.sanktionsAnalyse;

  return {
    sparte: data.anbahnungsdaten.sparten.map((s) => [s.sparte, s.betriebsart].filter(Boolean).join(': ')).filter(Boolean).join('; '),
    betriebsbeschreibung: data.anbahnungsdaten.betriebsbeschreibung,
    versicherungssumme: data.risikokalkulation.versicherungssumme,
    bhvGesamt: gesamt
      ? {
          stufe: gesamtUeberschreibung?.stufe ?? gesamt.stufe,
          empfehlung: gesamtUeberschreibung?.kommentar || gesamt.empfehlung,
        }
      : null,
    bhvKategorien: kategorien.map((k) => ({ titel: k.titel, stufe: k.stufe, begruendung: k.begruendung })),
    standort: ra ? { gesamtAmpel: ra.gesamtAmpel } : null,
    naturgefahren: ra ? NATURGEFAHREN.map(([key, name]) => ({ name, ampel: ra[key].ampel, score: ra[key].score })) : [],
    umweltrisiko: ua
      ? { ampel: ua.ampel, kategorien: UMWELT.map(([key, name]) => ({ name, ampel: ua[key].ampel, begruendung: ua[key].begruendung })) }
      : null,
    sanktionen: sa && !sa.fehler ? { ampel: sa.ampel, anzahlTreffer: sa.treffer.length } : null,
    risikocheck: data.risikocheck
      .filter((r) => r.value !== '')
      .map((r) => ({ label: r.label, wert: r.value, anmerkung: r.anmerkungen })),
  };
}

export function hatAnalyseErgebnisse(e: ZusammenfassungEingabe): boolean {
  return e.bhvKategorien.length > 0 || e.naturgefahren.length > 0 || e.umweltrisiko !== null || e.sanktionen !== null || e.risikocheck.length > 0;
}

// Kurzer, stabiler Fingerabdruck der Eingabe (djb2) — nur zum Erkennen von Änderungen.
export function eingabeStand(e: ZusammenfassungEingabe): string {
  const text = JSON.stringify(e);
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return String(h >>> 0);
}

export async function erzeugeRisikoZusammenfassung(eingabe: ZusammenfassungEingabe): Promise<RisikoZusammenfassung> {
  let res: Response;
  try {
    res = await fetch('/api/ki/risikozusammenfassung', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eingabe),
    });
  } catch {
    throw new Error('Der Server ist nicht erreichbar.');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.fehler?.meldung ?? `Fehler ${res.status} bei der Zusammenfassung.`);
  }
  const z = body?.zusammenfassung;
  if (!z || typeof z.kurzfazit !== 'string') throw new Error('Unerwartete Antwort vom Server.');
  return {
    kurzfazit: z.kurzfazit,
    stichpunkte: Array.isArray(z.stichpunkte) ? z.stichpunkte : [],
    offenePunkte: Array.isArray(z.offenePunkte) ? z.offenePunkte : [],
    erstelltAm: body.erstelltAm ?? new Date().toISOString(),
    modell: body.modell ?? '',
    eingabeStand: eingabeStand(eingabe),
  };
}
