import type { TextElement } from './pdfLader';

// Liest die Angaben aus einem digital ausgefüllten Kurzfragebogen (Betriebs-/Produkthaftpflicht)
// anhand der Lage der Textelemente: Werte stehen rechts neben oder direkt unter ihrer
// Feldbeschriftung. Bewusst regelbasiert (kein KI-Dienst) — was nicht eindeutig gefunden wird,
// bleibt undefined und wird nicht geraten.

export interface FragebogenFelder {
  textVorhanden: boolean;
  datum?: string;
  antragsteller?: string;
  firma?: string;
  strasseNr?: string;
  plzOrt?: string;
  telefon?: string;
  mitversicherte: string[];
  herstellung?: string;
  lizenzen?: string;
  handel?: string;
  sonstiges?: string;
  ergaenzung?: string;
  gesamtumsatz?: number;
  deckungssumme?: number;
  lohnverarbeiter?: boolean;
  umweltRegress?: boolean;
  exportUsaKanada?: boolean;
  exportUsaKanadaUmsatz?: number;
}

const ZEILEN_TOLERANZ = 3.5;

const BEKANNTE_LABELS: RegExp[] = [
  /^Name, Firma$/, /^Internetadresse$/, /^Straße, Hausnummer$/, /^Telefon$/, /^PLZ, Ort$/, /^Fax$/,
  /^Name des Antragstellers$/, /^Tag der$/, /^Antragsaufnahme$/, /^\d\)$/,
  /^Herstellung von:?$/, /^Vergabe von Lizenzen für:?$/, /^Handel mit\/Import von:?$/,
  /^Lohnverarbeitung/, /^Sonstiges$/, /^Ergänzende Betriebsbeschreibung:?$/,
];

const istLabel = (text: string): boolean => BEKANNTE_LABELS.some((re) => re.test(text));

function zeilenGruppieren(elemente: TextElement[]): TextElement[][] {
  const sortiert = [...elemente].sort((a, b) => b.y - a.y);
  const zeilen: TextElement[][] = [];
  for (const e of sortiert) {
    const zeile = zeilen.find((z) => Math.abs(z[0].y - e.y) <= ZEILEN_TOLERANZ);
    if (zeile) zeile.push(e);
    else zeilen.push([e]);
  }
  return zeilen.map((z) => z.sort((a, b) => a.x - b.x));
}

// Wert zu einer Feldbeschriftung: zuerst rechts auf derselben Zeile (bis zur nächsten
// Beschriftung), sonst in den Zeilen direkt darunter.
function wertNebenLabel(
  elemente: TextElement[],
  label: TextElement,
  optionen: { bisX?: number; maxZeilen?: number } = {},
): string | undefined {
  const maxZeilen = optionen.maxZeilen ?? 1;
  const seite = elemente.filter((e) => e.seite === label.seite && e !== label);

  const naechstesLabelX = seite
    .filter((e) => istLabel(e.text) && Math.abs(e.y - label.y) <= ZEILEN_TOLERANZ && e.x > label.x + 1)
    .reduce((min, e) => Math.min(min, e.x), Infinity);
  const bisX = Math.min(optionen.bisX ?? Infinity, naechstesLabelX);

  const werte = seite.filter((e) => !istLabel(e.text));

  const rechts = werte
    .filter((e) => Math.abs(e.y - label.y) <= ZEILEN_TOLERANZ && e.x >= label.x + label.breite - 1 && e.x < bisX)
    .sort((a, b) => a.x - b.x);
  if (rechts.length > 0) return rechts.map((e) => e.text).join(' ');

  const darunter = werte.filter(
    (e) => e.y < label.y - ZEILEN_TOLERANZ && e.y >= label.y - (14 * maxZeilen + 6) && e.x >= label.x - 4 && e.x < bisX,
  );
  if (darunter.length === 0) return undefined;
  return zeilenGruppieren(darunter)
    .slice(0, maxZeilen)
    .map((z) => z.map((e) => e.text).join(' '))
    .join(' ');
}

export function parseBetrag(text: string): number | undefined {
  const bereinigt = text.replace(/\s*(Euro|EUR|€)\s*$/i, '').replace(/,\s*[–-]+\s*$/, '').trim();
  const mio = bereinigt.match(/^(\d+(?:[.,]\d+)?)\s*Mio\.?$/i);
  if (mio) return Math.round(parseFloat(mio[1].replace(',', '.')) * 1_000_000);
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(bereinigt) || /^\d+(,\d+)?$/.test(bereinigt)) {
    return Math.round(parseFloat(bereinigt.replace(/\./g, '').replace(',', '.')));
  }
  return undefined;
}

function labelMit(elemente: TextElement[], re: RegExp, seite?: number): TextElement | undefined {
  return elemente.find((e) => (seite === undefined || e.seite === seite) && re.test(e.text));
}

// Ja/Nein-Frage: das Kreuz steht ca. 10–12 pt links vom gewählten "ja" bzw. "nein".
function antwortJaNein(elemente: TextElement[], frage: RegExp): boolean | undefined {
  const f = labelMit(elemente, frage);
  if (!f) return undefined;
  const aufSeite = elemente.filter((e) => e.seite === f.seite && e.x > f.x);
  const optionen = aufSeite.filter((e) => (e.text === 'ja' || e.text === 'nein') && Math.abs(e.y - f.y) <= 4);
  const kreuze = aufSeite.filter((e) => /^[xX✓✔]$/.test(e.text) && Math.abs(e.y - f.y) <= 6);
  for (const kreuz of kreuze) {
    const ziel = optionen
      .filter((o) => o.x - kreuz.x > 1 && o.x - kreuz.x <= 24)
      .sort((a, b) => a.x - b.x)[0];
    if (ziel) return ziel.text === 'ja';
  }
  return undefined;
}

function zahlInZeile(elemente: TextElement[], label: TextElement): number | undefined {
  const kandidaten = elemente
    .filter((e) => e.seite === label.seite && Math.abs(e.y - label.y) <= 4 && e.x > label.x + label.breite)
    .sort((a, b) => a.x - b.x);
  for (const k of kandidaten) {
    const betrag = parseBetrag(k.text);
    if (betrag !== undefined) return betrag;
  }
  return undefined;
}

const DATUM = /(\d{1,2})\.(\d{1,2})\.(\d{2,4})/;

export function liesFragebogen(elemente: TextElement[]): FragebogenFelder {
  const felder: FragebogenFelder = { textVorhanden: elemente.length > 20, mitversicherte: [] };
  if (!felder.textVorhanden) return felder;

  const wert = (re: RegExp, seite: number, optionen?: { bisX?: number; maxZeilen?: number }) => {
    const label = labelMit(elemente, re, seite);
    return label ? wertNebenLabel(elemente, label, optionen) : undefined;
  };

  // Kopfbereich und Abschnitt 1 (Versicherungsnehmer)
  felder.antragsteller = wert(/^Name des Antragstellers$/, 1, { bisX: 490 });
  const datumText = wert(/^Antragsaufnahme$/, 1);
  felder.datum = datumText?.match(DATUM)?.[0];
  felder.firma = wert(/^Name, Firma$/, 1);
  felder.strasseNr = wert(/^Straße, Hausnummer$/, 1);
  felder.plzOrt = wert(/^PLZ, Ort$/, 1);
  felder.telefon = wert(/^Telefon$/, 1);

  // 1.2 Mitversicherte: nummerierte Zeilen "1)", "2)" … zwischen 1.2 und Abschnitt 2
  const mitversichertenLabels = elemente
    .filter((e) => e.seite === 1 && /^\d\)$/.test(e.text) && e.x < 130)
    .sort((a, b) => b.y - a.y);
  for (const label of mitversichertenLabels) {
    const text = wertNebenLabel(elemente, label);
    if (text) felder.mitversicherte.push(text);
  }

  // 3.1 Tätigkeitsprogramm
  felder.herstellung = wert(/^Herstellung von:?$/, 1);
  felder.lizenzen = wert(/^Vergabe von Lizenzen für:?$/, 1);
  felder.handel = wert(/^Handel mit\/Import von:?$/, 1);
  felder.sonstiges = wert(/^Sonstiges$/, 1);
  felder.ergaenzung = wert(/^Ergänzende Betriebsbeschreibung:?$/, 1, { maxZeilen: 3 });

  // Ja/Nein-Fragen
  felder.lohnverarbeiter = antwortJaNein(elemente, /Sind Sie als Lohnverarbeiter tätig/);
  felder.umweltRegress = antwortJaNein(elemente, /^Umweltschaden-Regressrisiko/);
  felder.exportUsaKanada = antwortJaNein(elemente, /Exportieren Sie in die USA und nach Kanada/);

  // 6.1 Exportumsatz USA/Kanada: Summe der Einträge in der Spalte "Umsatz in Mio Euro" zwischen
  // Tabellenkopf und Ziffer 6.2. Kleine Zahlen gelten als Mio Euro, Zahlen mit Tausenderpunkt als Euro.
  if (felder.exportUsaKanada) {
    const kopf = labelMit(elemente, /^Umsatz in Mio$/, 2);
    const grenze = labelMit(elemente, /Niederlassungen in den USA oder in Kanada/, 2);
    if (kopf && grenze) {
      const betraege = elemente
        .filter((e) => e.seite === 2 && e.y < kopf.y - 3 && e.y > grenze.y + 3 && e.x >= kopf.x - 12 && e.x < kopf.x + 110)
        .filter((e) => /^\d+(?:[.,]\d+)*$/.test(e.text))
        .map((e) =>
          /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(e.text)
            ? parseBetrag(e.text)
            : Math.round(parseFloat(e.text.replace(',', '.')) * 1_000_000),
        )
        .filter((b): b is number => b !== undefined && !Number.isNaN(b));
      if (betraege.length > 0) felder.exportUsaKanadaUmsatz = betraege.reduce((a, b) => a + b, 0);
    }
  }

  // 7.1 Gesamtumsatz
  const umsatzLabel = labelMit(elemente, /^Gesamtumsatz$/, 2);
  if (umsatzLabel) felder.gesamtumsatz = zahlInZeile(elemente, umsatzLabel);

  // Abschnitt 9: höchster eingetragener Betrag zwischen "9. Gewünschte" und "10. Selbst-",
  // ohne Selbstbeteiligungen (stehen hinter "SB:")
  const oben = labelMit(elemente, /^9\.\s*Gewünschte/, 2);
  const unten = labelMit(elemente, /^10\.\s*Selbst/, 2);
  if (oben && unten) {
    const summen = elemente
      .filter((e) => e.seite === 2 && e.y < oben.y + 3 && e.y > unten.y + 3 && e.x > 100)
      .filter((e) => !elemente.some((l) => l.text === 'SB:' && l.seite === 2 && Math.abs(l.y - e.y) <= 4 && e.x > l.x && e.x - l.x < 60))
      .map((e) => parseBetrag(e.text))
      .filter((b): b is number => b !== undefined);
    if (summen.length > 0) felder.deckungssumme = Math.max(...summen);
  }

  return felder;
}
