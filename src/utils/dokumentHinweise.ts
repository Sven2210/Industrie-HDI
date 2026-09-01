import type { DokumentHinweis, HochgeladenesDokument, NaturgefahrKategorie, UmweltrisikoKategorieKey } from '../types/antrag';
import { extrahierePlainText } from './pdfLader';

const NATURGEFAHR_STICHWORTE: Record<NaturgefahrKategorie, string[]> = {
  hochwasser: ['hochwasser', 'überschwemmung', 'überflutung'],
  sturm: ['sturm', 'orkan', 'windgeschwindigkeit'],
  erdbeben: ['erdbeben', 'seismisch', 'erdstoß'],
  hagel: ['hagel'],
  waldbrand: ['waldbrand', 'flächenbrand', 'vegetationsbrand'],
  schnee: ['schneelast', 'eislast', 'schneedruck'],
};

const UMWELTRISIKO_STICHWORTE: Record<UmweltrisikoKategorieKey, string[]> = {
  luftemissionen: ['luftemission', 'abgase', 'schadstoffausstoß'],
  gewaesserBoden: ['gewässerkontamination', 'bodenkontamination', 'grundwasserverunreinigung'],
  abfall: ['sondermüll', 'gefahrstoffabfall', 'abfallentsorgung'],
  laerm: ['lärmemission', 'schallpegel', 'lärmbelastung'],
  brandExplosion: ['explosionsgefahr', 'brandgefahr', 'explosionsrisiko'],
};

// Zerlegt den Text in Sätze. Ohne echte Sprachverarbeitung dient das Satzende
// (. ! ?) als bester verfügbarer Anhaltspunkt dafür, wann ein neues Thema beginnt.
function splitteSaetze(text: string): string[] {
  const normalisiert = text.replace(/\s+/g, ' ').trim();
  return normalisiert.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ])/);
}

function ausschnittUmWort(text: string, stichwort: string): string {
  const saetze = splitteSaetze(text);
  const treffer = saetze.find((satz) => satz.toLowerCase().includes(stichwort.toLowerCase()));
  return treffer?.trim() ?? '';
}

export async function findeDokumentHinweise(dokumente: HochgeladenesDokument[]): Promise<DokumentHinweis[]> {
  const hinweise: DokumentHinweis[] = [];

  for (const dokument of dokumente) {
    const text = await extrahierePlainText(dokument);
    if (!text) continue;

    for (const [kategorie, stichworte] of Object.entries(NATURGEFAHR_STICHWORTE) as [NaturgefahrKategorie, string[]][]) {
      const treffer = stichworte.find((s) => text.toLowerCase().includes(s));
      if (treffer) {
        hinweise.push({
          bereich: 'naturgefahr',
          kategorie,
          ausschnitt: ausschnittUmWort(text, treffer),
          quelle: dokument.dateiname,
          dokumentId: dokument.id,
        });
      }
    }

    for (const [kategorie, stichworte] of Object.entries(UMWELTRISIKO_STICHWORTE) as [UmweltrisikoKategorieKey, string[]][]) {
      const treffer = stichworte.find((s) => text.toLowerCase().includes(s));
      if (treffer) {
        hinweise.push({
          bereich: 'umweltrisiko',
          kategorie,
          ausschnitt: ausschnittUmWort(text, treffer),
          quelle: dokument.dateiname,
          dokumentId: dokument.id,
        });
      }
    }
  }

  return hinweise;
}
