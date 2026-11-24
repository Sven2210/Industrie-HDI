import type { AntragData, Firmierung, RisikocheckItem } from '../types/antrag';
import type { FragebogenFelder } from './fragebogenExtraktion';
import type { KombiAuslese } from './fragebogenKi';

// Überträgt ausgelesene Fragebogen-Angaben in den Antrag. Es werden nur leere Felder gefüllt —
// bereits Erfasstes wird nie überschrieben. Welche Felder übernommen wurden, wird im Antrag
// (fragebogenUebernahme) protokolliert, damit sie in der Oberfläche markiert werden können.

export const UEBERNOMMEN_FARBE = '#EAF5EE';
// Per KI gelesene Felder: gelblich, damit sie sich von sicher erkannten Regel-Werten abheben
export const KI_FARBE = '#FEF9C3';

const FIRMIERUNGEN: Firmierung[] = ['GbR', 'OHG', 'KG', 'GmbH', 'UG', 'AG', 'Limited', 'SE'];

export function trenneFirmierung(text: string): { name: string; firmierung: Firmierung | '' } {
  const t = text.trim();
  const gmbhCoKg = t.match(/^(.*?)[\s,]+GmbH\s*&\s*Co\.?\s*KG$/i);
  if (gmbhCoKg) return { name: gmbhCoKg[1].trim(), firmierung: 'KG' };

  const m = t.match(/^(.*?)[\s,]+(GbR|OHG|KG|GmbH|UG(?:\s*\(haftungsbeschränkt\))?|AG|Limited|Ltd\.?|SE)\.?$/i);
  if (!m) return { name: t, firmierung: '' };
  const roh = m[2].toLowerCase().replace(/\s*\(haftungsbeschränkt\)/, '').replace(/\.$/, '');
  const treffer = roh === 'ltd' ? 'Limited' : FIRMIERUNGEN.find((f) => f.toLowerCase() === roh);
  return treffer ? { name: m[1].trim(), firmierung: treffer } : { name: t, firmierung: '' };
}

export function trenneStrasse(text: string): { strasse: string; hausnummer: string } {
  const t = text.trim();
  const m = t.match(/^(.*\S)\s+(\d+\s*[a-zA-Z]?(?:\s*[-–/]\s*\d+\s*[a-zA-Z]?)?)$/);
  return m ? { strasse: m[1].trim(), hausnummer: m[2].replace(/\s+/g, '') } : { strasse: t, hausnummer: '' };
}

export function trennePlzOrt(text: string): { plz: string; ort: string } {
  const t = text.trim();
  const m = t.match(/^(\d{5})\s+(.+)$/);
  return m ? { plz: m[1], ort: m[2].trim() } : { plz: '', ort: t };
}

export function trenneAntragsteller(text: string): { name: string; vorname: string } {
  const t = text.trim();
  if (t.includes(',')) {
    const [name, ...rest] = t.split(',');
    return { name: name.trim(), vorname: rest.join(',').trim() };
  }
  const teile = t.split(/\s+/);
  if (teile.length === 1) return { name: teile[0], vorname: '' };
  return { name: teile[teile.length - 1], vorname: teile.slice(0, -1).join(' ') };
}

function normalisiereDatum(text: string): string {
  const m = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (!m) return text;
  const jahr = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${m[1].padStart(2, '0')}.${m[2].padStart(2, '0')}.${jahr}`;
}

const formatiereZahl = (n: number): string => n.toLocaleString('de-DE');

export function holePfad(obj: unknown, pfad: string): unknown {
  return pfad.split('.').reduce<unknown>(
    (o, k) => (o === null || o === undefined ? undefined : (o as Record<string, unknown>)[k]),
    obj,
  );
}

function setzePfad(obj: unknown, pfad: string, wert: unknown): void {
  const teile = pfad.split('.');
  const letzter = teile.pop() as string;
  const ziel = teile.reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], obj) as Record<string, unknown>;
  ziel[letzter] = wert;
}

export interface AnwendenOptionen {
  // Beim Anlegen eines neuen Vorgangs ist das Eingangsdatum nur mit "heute" vorbelegt —
  // das ist keine Benutzereingabe und darf durch das Datum aus dem Fragebogen ersetzt werden.
  ersetzeStandardwerte?: boolean;
}

export function wendeFragebogenAn(
  antrag: AntragData,
  felder: FragebogenFelder,
  dokumentName: string,
  optionen: AnwendenOptionen = {},
): AntragData {
  const neu: AntragData = structuredClone(antrag);
  const werte: Record<string, string> = { ...(antrag.fragebogenUebernahme?.werte ?? {}) };

  const setze = (pfad: string, wert: string | undefined, istLeer: (aktuell: string) => boolean = (a) => a.trim() === '') => {
    if (!wert) return;
    const aktuell = holePfad(neu, pfad);
    if (typeof aktuell !== 'string' || !istLeer(aktuell)) return;
    setzePfad(neu, pfad, wert);
    werte[pfad] = wert;
  };

  // Reiter 1: Versicherungsnehmer
  const firma = felder.firma ? trenneFirmierung(felder.firma) : undefined;
  if (firma) {
    setze('interessent.name', firma.name);
    setze('interessent.firmierung', firma.firmierung);
  }
  const strasse = felder.strasseNr ? trenneStrasse(felder.strasseNr) : undefined;
  if (strasse) {
    setze('interessent.strasse', strasse.strasse);
    setze('interessent.hausnummer', strasse.hausnummer);
  }
  const ort = felder.plzOrt ? trennePlzOrt(felder.plzOrt) : undefined;
  if (ort) {
    setze('interessent.plz', ort.plz);
    setze('interessent.ort', ort.ort);
  }
  if (felder.antragsteller) {
    const ap = trenneAntragsteller(felder.antragsteller);
    setze('interessent.ansprechpartner.name', ap.name);
    setze('interessent.ansprechpartner.vorname', ap.vorname);
  }
  setze('interessent.ansprechpartner.telefon', felder.telefon);

  // Der Fragebogen kennt keine eigene Wagnisanschrift — als Vorschlag gilt der Hauptbetrieb.
  if (strasse) {
    setze('wagnisanschrift.strasse', strasse.strasse);
    setze('wagnisanschrift.hausnummer', strasse.hausnummer);
  }
  if (ort) {
    setze('wagnisanschrift.plz', ort.plz);
    setze('wagnisanschrift.ort', ort.ort);
  }

  // Reiter 2: Anbahnungsdaten
  if (felder.datum) {
    setze(
      'anbahnungsdaten.eingangsdatum',
      normalisiereDatum(felder.datum),
      (a) => a.trim() === '' || optionen.ersetzeStandardwerte === true,
    );
  }
  const beschreibung = [
    felder.herstellung && `Herstellung von: ${felder.herstellung}`,
    felder.lizenzen && `Vergabe von Lizenzen für: ${felder.lizenzen}`,
    felder.handel && `Handel mit/Import von: ${felder.handel}`,
    felder.sonstiges && `Sonstiges: ${felder.sonstiges}`,
    felder.ergaenzung,
  ].filter(Boolean).join('. ');
  setze('anbahnungsdaten.betriebsbeschreibung', beschreibung ? `${beschreibung.replace(/\.$/, '')}.` : undefined);

  // Reiter 4: Risikocheck (nur eindeutig zuordenbare Ja/Nein-Antworten)
  const risikocheck = (id: string, wert: RisikocheckItem['value'], quelle: string) => {
    const item = neu.risikocheck.find((i) => i.id === id);
    if (!item || item.value !== '' || !item.options.includes(wert)) return;
    item.value = wert;
    if (!item.anmerkungen.trim()) item.anmerkungen = `Aus Fragebogen, ${quelle}`;
    werte[`risikocheck.${id}`] = wert;
  };
  if (felder.lohnverarbeiter !== undefined) {
    risikocheck('lohnherstellung', felder.lohnverarbeiter ? 'ja' : 'nein', `Ziffer 3.4: ${felder.lohnverarbeiter ? 'ja' : 'nein'}`);
  }
  if (felder.umweltRegress !== undefined) {
    risikocheck('umweltregress', felder.umweltRegress ? 'ja' : 'nein', `Ziffer 4.2: ${felder.umweltRegress ? 'ja' : 'nein'}`);
  }
  if (felder.exportUsaKanada !== undefined) {
    risikocheck('us_exporte', felder.exportUsaKanada ? 'hoch' : 'niedrig', `Ziffer 6.1: Export USA/Kanada ${felder.exportUsaKanada ? 'ja' : 'nein'}`);
  }

  // Reiter 5: Risikokalkulation
  setze('risikokalkulation.versicherungssumme', felder.deckungssumme !== undefined ? formatiereZahl(felder.deckungssumme) : undefined);

  // Reiter 6: Unternehmen (Hauptbetrieb + Mitversicherte). Die Risikobelegenheit beschreibt
  // Berechnungspositionen: Betriebe in Deutschland sind "DE (ex. USA/CAN)"; die Exportumsätze
  // USA/Kanada bilden eine eigene Position "USCAN".
  const deutscheAdresse = ort !== undefined && /^\d{5}$/.test(ort.plz);
  if (neu.unternehmen.length > 0) {
    setze('unternehmen.0.name', felder.firma);
    setze('unternehmen.0.jahresumsatz', felder.gesamtumsatz !== undefined ? formatiereZahl(felder.gesamtumsatz) : undefined);
    setze('unternehmen.0.risikobelegenheit', deutscheAdresse ? 'DE_ex_USCAN' : undefined);
  }
  felder.mitversicherte.forEach((text, i) => {
    const name = text.split(',')[0].trim();
    if (!name || neu.unternehmen.some((u) => u.name.trim().toLowerCase() === name.toLowerCase())) return;
    const index = neu.unternehmen.length;
    neu.unternehmen.push({
      id: `fb-${Date.now()}-${i}`,
      risikobelegenheit: 'DE_ex_USCAN',
      name,
      land: 'Deutschland',
      jahresumsatz: '',
      steuersatz: '19',
      mindestbeitrag: '',
    });
    werte[`unternehmen.${index}.name`] = name;
    werte[`unternehmen.${index}.risikobelegenheit`] = 'DE_ex_USCAN';
  });
  if (felder.exportUsaKanada === true && !neu.unternehmen.some((u) => u.risikobelegenheit === 'USCAN')) {
    const index = neu.unternehmen.length;
    const basisName = felder.firma ?? neu.unternehmen[0]?.name ?? '';
    const name = basisName ? `${basisName} – Exporte USA/Kanada` : 'Exporte USA/Kanada';
    const umsatz = felder.exportUsaKanadaUmsatz !== undefined ? formatiereZahl(felder.exportUsaKanadaUmsatz) : '';
    neu.unternehmen.push({
      id: `fb-${Date.now()}-usa`,
      risikobelegenheit: 'USCAN',
      name,
      land: 'Deutschland',
      jahresumsatz: umsatz,
      steuersatz: '19',
      mindestbeitrag: '',
    });
    werte[`unternehmen.${index}.name`] = name;
    werte[`unternehmen.${index}.risikobelegenheit`] = 'USCAN';
    if (umsatz) werte[`unternehmen.${index}.jahresumsatz`] = umsatz;
  }

  // Sparte nur setzen, wenn das Dokument als dieser Fragebogen erkannt wurde
  if (Object.keys(werte).length > 0 && neu.anbahnungsdaten.sparten?.length > 0) {
    setze('anbahnungsdaten.sparten.0.sparte', 'Haftpflicht');
  }

  const nichtGefunden: string[] = [];
  if (!felder.firma) nichtGefunden.push('Firmenname');
  if (!felder.strasseNr) nichtGefunden.push('Straße/Hausnummer');
  if (!felder.plzOrt) nichtGefunden.push('PLZ/Ort');
  if (!felder.antragsteller) nichtGefunden.push('Antragsteller');
  if (!felder.telefon) nichtGefunden.push('Telefon');
  if (!felder.datum) nichtGefunden.push('Antragsdatum');
  if (!beschreibung) nichtGefunden.push('Betriebsbeschreibung');
  if (felder.gesamtumsatz === undefined) nichtGefunden.push('Gesamtumsatz');
  if (felder.deckungssumme === undefined) nichtGefunden.push('Deckungssumme');

  neu.fragebogenUebernahme = {
    dokumentName,
    uebernommenAm: new Date().toISOString(),
    werte,
    nichtGefunden,
    hinweis: felder.textVorhanden
      ? undefined
      : 'Aus dem Dokument konnte kein Text gelesen werden (z. B. gescannte PDF) — bitte die Angaben manuell erfassen.',
  };
  return neu;
}

// Wie wendeFragebogenAn, berücksichtigt aber zusätzlich per KI gelesene Felder: erst die Regel-Werte,
// dann (nur in noch leere Felder) die KI-Werte. Pfade, die erst dadurch gefüllt wurden, werden in
// `kiPfade` vermerkt und in der Oberfläche gesondert markiert.
export function wendeKombiniertAn(
  antrag: AntragData,
  kombi: KombiAuslese,
  dokumentName: string,
  optionen: AnwendenOptionen = {},
): AntragData {
  const nurRegel = wendeFragebogenAn(antrag, kombi.regelFelder, dokumentName, optionen);
  let ergebnis = nurRegel;
  let kiPfade = [...(antrag.fragebogenUebernahme?.kiPfade ?? [])];

  if (kombi.kiFelder.length > 0) {
    ergebnis = wendeFragebogenAn(nurRegel, kombi.felder, dokumentName, optionen);
    const vorher = new Set(Object.keys(nurRegel.fragebogenUebernahme?.werte ?? {}));
    const neu = Object.keys(ergebnis.fragebogenUebernahme?.werte ?? {}).filter((k) => !vorher.has(k));
    kiPfade = [...new Set([...kiPfade, ...neu])];
    for (const pfad of neu) {
      const m = pfad.match(/^risikocheck\.(.+)$/);
      const item = m ? ergebnis.risikocheck.find((i) => i.id === m[1]) : undefined;
      if (item) item.anmerkungen = `${item.anmerkungen} (per KI gelesen, bitte prüfen)`;
    }
  }

  if (ergebnis.fragebogenUebernahme) {
    ergebnis.fragebogenUebernahme.kiPfade = kiPfade.length > 0 ? kiPfade : undefined;
    ergebnis.fragebogenUebernahme.kiHinweis = kombi.kiHinweis;
  }
  if (kombi.kiAuslese) ergebnis.kiAuslese = kombi.kiAuslese;
  return ergebnis;
}

// Ein Feld gilt als "aus dem Fragebogen", solange sein Wert noch dem übernommenen entspricht.
export function istAusFragebogen(antrag: AntragData, pfad: string): boolean {
  const uebernommen = antrag.fragebogenUebernahme?.werte[pfad];
  return uebernommen !== undefined && holePfad(antrag, pfad) === uebernommen;
}

// Props zum Einstreuen in ein MUI-TextField: dezente Hintergrundtönung + Tooltip. Ein bereits
// vorhandenes sx des Felds wird über basisSx mitgegeben, da ein zweites sx es sonst überschriebe.
export function markierung(antrag: AntragData, pfad: string, basisSx: object = {}): { title?: string; sx: object } {
  if (!istAusFragebogen(antrag, pfad)) return { sx: basisSx };
  const perKi = antrag.fragebogenUebernahme?.kiPfade?.includes(pfad) === true;
  return {
    title: perKi ? 'Per KI aus dem Fragebogen gelesen — bitte prüfen' : 'Aus Fragebogen übernommen',
    sx: { ...basisSx, '& .MuiOutlinedInput-root': { backgroundColor: perKi ? KI_FARBE : UEBERNOMMEN_FARBE } },
  };
}
