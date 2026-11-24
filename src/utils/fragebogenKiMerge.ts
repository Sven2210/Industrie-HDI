import type { FragebogenFelder } from './fragebogenExtraktion';

// Reine Logik der kombinierten Fragebogen-Auslese (ohne Netzwerk/PDF, damit sie einzeln testbar ist).

export type FeldSchluessel = keyof FragebogenFelder;

const KERNFELDER: FeldSchluessel[] = [
  'antragsteller', 'datum', 'firma', 'strasseNr', 'plzOrt', 'telefon', 'gesamtumsatz', 'deckungssumme',
];
const JA_NEIN_FELDER: FeldSchluessel[] = ['lohnverarbeiter', 'umweltRegress', 'exportUsaKanada'];

const ALLE_FELDER: FeldSchluessel[] = [
  'antragsteller', 'datum', 'firma', 'strasseNr', 'plzOrt', 'telefon', 'mitversicherte', 'herstellung', 'lizenzen',
  'handel', 'sonstiges', 'ergaenzung', 'gesamtumsatz', 'deckungssumme', 'lohnverarbeiter', 'umweltRegress',
  'exportUsaKanada', 'exportUsaKanadaUmsatz',
];

const hatWert = (felder: FragebogenFelder, k: FeldSchluessel): boolean => {
  const v = felder[k];
  return Array.isArray(v) ? v.length > 0 : v !== undefined;
};

// Eine Auslese per KI lohnt sich, wenn das PDF keinen Text hat, Kernangaben oder die Betriebsbeschreibung
// fehlen oder mindestens zwei der drei Ja/Nein-Fragen nicht erkannt wurden. Ein einzelnes nicht
// angekreuztes Kästchen ist oft eine echte Nicht-Antwort und löst keinen KI-Aufruf aus.
export function hatLuecken(felder: FragebogenFelder): boolean {
  if (!felder.textVorhanden) return true;
  const beschreibung = ['herstellung', 'lizenzen', 'handel', 'sonstiges', 'ergaenzung'] as FeldSchluessel[];
  const jaNeinFehlt = JA_NEIN_FELDER.filter((k) => !hatWert(felder, k)).length;
  return KERNFELDER.some((k) => !hatWert(felder, k)) || !beschreibung.some((k) => hatWert(felder, k)) || jaNeinFehlt >= 2;
}

export function fuehreZusammen(regel: FragebogenFelder, ki: Record<string, unknown>): { felder: FragebogenFelder; kiFelder: FeldSchluessel[] } {
  const felder: FragebogenFelder = { ...regel, mitversicherte: [...regel.mitversicherte] };
  const kiFelder: FeldSchluessel[] = [];
  for (const schluessel of ALLE_FELDER) {
    if (schluessel === 'textVorhanden') continue;
    const wert = ki[schluessel];
    if (wert === undefined || wert === null || hatWert(regel, schluessel)) continue;
    if (schluessel === 'mitversicherte') {
      if (Array.isArray(wert) && wert.length > 0) {
        felder.mitversicherte = wert.filter((w): w is string => typeof w === 'string');
        kiFelder.push(schluessel);
      }
      continue;
    }
    (felder as unknown as Record<string, unknown>)[schluessel] = wert;
    kiFelder.push(schluessel);
  }
  // Mit KI-Werten gilt das Dokument als gelesen (kein "gescannt"-Hinweis mehr)
  if (kiFelder.length > 0) felder.textVorhanden = true;
  return { felder, kiFelder };
}
