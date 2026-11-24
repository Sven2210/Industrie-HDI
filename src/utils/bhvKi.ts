import type { BhvAnalyseErgebnis, BhvRisikoStufe } from '../types/antrag';

const formatMio = (betragInEuro: number): string =>
  (betragInEuro / 1_000_000).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ---- KI-gestützte Ergänzung ----------------------------------------------------------------
// Die KI liefert je Abschnitt nur gelesene Fakten (siehe server/fragebogenKi.js). Die Risikostufe
// berechnen weiterhin feste Regeln — hier, nach denselben Kriterien wie in ABSCHNITTE.

export interface BhvKiFakten {
  ausgefuellt: boolean;
  angaben: string;
  [merkmal: string]: unknown;
}

const NICHT_ZUVERLAESSIG = 'nicht zuverlässig auslesen';

// Die Regeln allein reichen nicht, wenn ein Abschnitt als "nicht ausgefüllt" gilt (z. B. Scan ohne
// Textebene) oder nur "ausgefüllt" erkannt wurde, ohne zu wissen, was angekreuzt ist.
export function bhvBrauchtKi(ergebnis: BhvAnalyseErgebnis): boolean {
  return ergebnis.kategorien.some((k) => k.stufe === 'unbeantwortet' || k.begruendung.includes(NICHT_ZUVERLAESSIG));
}

function stufeAusFakten(id: string, f: BhvKiFakten): { stufe: BhvRisikoStufe; begruendung: string } {
  const gelesen = f.angaben ? `Per KI gelesen: ${f.angaben}` : 'Per KI gelesen.';
  const leer = (text: string) => ({ stufe: 'unbeantwortet' as BhvRisikoStufe, begruendung: text });
  switch (id) {
    case 'produktion':
      if (f.gefahrenbranche === true) return { stufe: 'hoch', begruendung: `${gelesen} Produkte für die Auto-, Luftfahrt- oder Wasserfahrzeugindustrie — erhöhtes Produkthaftpflichtrisiko.` };
      return f.ausgefuellt ? { stufe: 'niedrig', begruendung: `${gelesen} Keine der bekannten Risikobranchen (Auto/Luftfahrt/Wasserfahrzeug).` } : leer('Abschnitt im Dokument nicht ausgefüllt (per KI geprüft).');
    case 'export-usa-kanada':
      return f.hatUmsatz === true
        ? { stufe: 'hoch', begruendung: `${gelesen} Angaben zu Produkt/Umsatz im USA/Kanada-Export — erfahrungsgemäß deutlich erhöhtes Haftungsrisiko.` }
        : leer('Keine Export-Angaben (Produkt/Umsatz) zu USA/Kanada im Dokument gefunden (per KI geprüft).');
    case 'vorversicherung':
      if (f.versichererGekuendigt === true) return { stufe: 'hoch', begruendung: `${gelesen} Der Vorversicherer hat gekündigt — automatisch als hohes Risiko eingestuft.` };
      return f.ausgefuellt ? { stufe: 'niedrig', begruendung: `${gelesen} Keine Kündigung durch den Versicherer erkannt.` } : leer('Keine Angaben zu einer Vorversicherung im Dokument gefunden (per KI geprüft).');
    case 'deckungssummen': {
      const summe = typeof f.hoechsteSumme === 'number' ? f.hoechsteSumme : undefined;
      if (summe === undefined) return leer('Keine gewünschten Deckungssummen im Dokument gefunden (per KI geprüft).');
      if (summe > 10_000_000) return { stufe: 'hoch', begruendung: `${gelesen} Höchste Deckungssumme ca. ${formatMio(summe)} Mio Euro — über 10 Mio Euro gilt als hohes Risiko.` };
      if (summe > 5_000_000) return { stufe: 'mittel', begruendung: `${gelesen} Höchste Deckungssumme ca. ${formatMio(summe)} Mio Euro — zwischen 5,01 und 10 Mio Euro gilt als mittleres Risiko.` };
      return { stufe: 'niedrig', begruendung: `${gelesen} Höchste Deckungssumme ca. ${formatMio(summe)} Mio Euro — bis 5 Mio Euro gilt als niedriges Risiko.` };
    }
    case 'reklamationen':
    case 'schadenverlauf':
      if (f.eintraege === 'vorhanden') return { stufe: 'hoch', begruendung: `${gelesen} Konkrete Einträge (Jahr/Forderung) im Dokument.` };
      if (f.eintraege === 'keine') return { stufe: 'niedrig', begruendung: `${gelesen} Im Dokument ist ausdrücklich vermerkt, dass nichts vorliegt.` };
      return leer('Abschnitt im Dokument nicht ausgefüllt (per KI geprüft).');
    default:
      // Ja/Nein- und Zahlenabschnitte ohne eigene Stufenregel: ausgefüllt = niedrig
      return f.ausgefuellt ? { stufe: 'niedrig', begruendung: gelesen } : leer('Abschnitt im Dokument nicht ausgefüllt (per KI geprüft).');
  }
}

// Ergänzt die Regel-Auswertung um KI-Fakten — nur für Abschnitte, bei denen die Regeln unsicher waren.
// Was die Regeln sicher erkannt haben, bleibt unverändert.
export function wendeBhvKiFaktenAn(ergebnis: BhvAnalyseErgebnis, fakten: Record<string, BhvKiFakten>): BhvAnalyseErgebnis {
  return {
    ...ergebnis,
    kategorien: ergebnis.kategorien.map((k) => {
      const f = fakten[k.id];
      const unsicher = k.stufe === 'unbeantwortet' || k.begruendung.includes(NICHT_ZUVERLAESSIG);
      if (!f || !unsicher) return k;
      // Hat die KI nichts gefunden, wo die Regeln "ausgefüllt" meinten, bleibt das Regelergebnis stehen.
      if (k.stufe !== 'unbeantwortet' && !f.ausgefuellt) return k;
      const { stufe, begruendung } = stufeAusFakten(k.id, f);
      if (stufe === 'unbeantwortet' && k.stufe === 'unbeantwortet') return k;
      return { ...k, stufe, begruendung, quelle: 'ki' as const };
    }),
  };
}
