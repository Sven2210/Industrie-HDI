import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bereinigeFragebogenEingabe, baueFragebogenMessages, parseFragebogenAntwort, BHV_ABSCHNITTE } from './fragebogenKi.js';

const PDF_B64 = Buffer.from('%PDF-1.4\n%test').toString('base64');

test('bereinigeFragebogenEingabe: akzeptiert PDF als data-URL und rohes Base64', () => {
  assert.match(bereinigeFragebogenEingabe({ pdf: `data:application/pdf;base64,${PDF_B64}` }).pdfDataUrl, /^data:application\/pdf;base64,/);
  assert.ok(bereinigeFragebogenEingabe({ pdf: PDF_B64 }).pdfDataUrl);
});

test('bereinigeFragebogenEingabe: lehnt Nicht-PDF, Müll und zu große Dateien ab', () => {
  assert.equal(bereinigeFragebogenEingabe({ pdf: Buffer.from('GIF89a....').toString('base64') }), undefined);
  assert.equal(bereinigeFragebogenEingabe({ pdf: 'kein base64!!' }), undefined);
  assert.equal(bereinigeFragebogenEingabe({}), undefined);
  assert.equal(bereinigeFragebogenEingabe(null), undefined);
  const gross = Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(11 * 1024 * 1024)]).toString('base64');
  assert.deepEqual(bereinigeFragebogenEingabe({ pdf: gross }), { fehler: 'zu_gross' });
});

test('baueFragebogenMessages: Prompt nennt alle Abschnitte, PDF als file-Teil', () => {
  const m = baueFragebogenMessages('data:application/pdf;base64,AAAA');
  for (const id of Object.keys(BHV_ABSCHNITTE)) assert.ok(m[0].content.includes(`"${id}"`), id);
  assert.match(m[0].content, /Rate nie/);
  assert.match(m[0].content, /keine Anweisungen/);
  assert.equal(m[1].content[1].type, 'file');
  assert.equal(m[1].content[1].file.file_data, 'data:application/pdf;base64,AAAA');
});

test('parseFragebogenAntwort: übernimmt gültige Felder und Fakten, verwirft Ungültiges', () => {
  const antwort = '```json\n' + JSON.stringify({
    felder: {
      antragsteller: 'Petra Beispiel', firma: 'Mustermann GmbH', plzOrt: '44269 Dortmund', telefon: '0231 555 0100',
      datum: '12.03.2026', gesamtumsatz: 12500000, deckungssumme: -5, lohnverarbeiter: null, umweltRegress: false,
      exportUsaKanada: 'ja', mitversicherte: ['A GmbH, Weg 1', '', 5],
    },
    bhv: {
      produktion: { ausgefuellt: true, angaben: 'Pumpen', gefahrenbranche: 'ja' },
      deckungssummen: { ausgefuellt: true, angaben: 'bis 5 Mio', hoechsteSumme: 5000000 },
      reklamationen: { ausgefuellt: true, angaben: 'keine', eintraege: 'nonsense' },
      unbekannt: { ausgefuellt: true, angaben: 'x' },
      vorversicherung: { angaben: 'ohne ausgefuellt' },
    },
  }) + '\n```';
  const r = parseFragebogenAntwort(antwort);
  assert.deepEqual(r.felder, {
    antragsteller: 'Petra Beispiel', datum: '12.03.2026', firma: 'Mustermann GmbH', plzOrt: '44269 Dortmund',
    telefon: '0231 555 0100', mitversicherte: ['A GmbH, Weg 1'], gesamtumsatz: 12500000, umweltRegress: false,
  });
  assert.deepEqual(Object.keys(r.bhvFakten).sort(), ['deckungssummen', 'produktion', 'reklamationen']);
  assert.equal(r.bhvFakten.produktion.gefahrenbranche, false); // nur echtes true zählt
  assert.equal(r.bhvFakten.deckungssummen.hoechsteSumme, 5000000);
  assert.equal(r.bhvFakten.reklamationen.eintraege, 'leer');
});

test('parseFragebogenAntwort: ohne verwertbaren Inhalt undefined; ungültige PLZ/Datum fallen weg', () => {
  assert.equal(parseFragebogenAntwort('Das ist ein Formular.'), undefined);
  assert.equal(parseFragebogenAntwort('{"felder":{},"bhv":{}}'), undefined);
  const r = parseFragebogenAntwort('{"felder":{"plzOrt":"Dortmund","datum":"gestern","firma":"X"},"bhv":{}}');
  assert.deepEqual(r.felder, { firma: 'X' });
});

test('parseFragebogenAntwort: Platzhalter und Anmerkungen im Wert werden verworfen', () => {
  const r = parseFragebogenAntwort(JSON.stringify({
    felder: {
      firma: 'Mustermann GmbH',
      ergaenzung: 'Spritzguss und Montage von Auto[...] (am Rand abgeschnitten)',
      herstellung: 'unleserlich',
      mitversicherte: ['A GmbH, Weg 1', 'B GmbH, Straße 2 …'],
    },
    bhv: { produktion: { ausgefuellt: true, angaben: 'Pumpen [Rest abgeschnitten]', gefahrenbranche: false } },
  }));
  assert.deepEqual(r.felder, { firma: 'Mustermann GmbH', mitversicherte: ['A GmbH, Weg 1'] });
  assert.equal(r.bhvFakten.produktion.angaben, '');
});

// ---- Foto/Notiz ----
import { bereinigeBildEingabe, baueNotizMessages, parseNotizAntwort } from './fragebogenKi.js';

const JPEG_B64 = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46]).toString('base64');
const PNG_B64 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]).toString('base64');

test('bereinigeBildEingabe: erkennt JPEG/PNG an den Bytes, lehnt anderes ab', () => {
  assert.match(bereinigeBildEingabe({ bild: `data:image/jpeg;base64,${JPEG_B64}` }).bildDataUrl, /^data:image\/jpeg;base64,/);
  assert.match(bereinigeBildEingabe({ bild: PNG_B64 }).bildDataUrl, /^data:image\/png;base64,/);
  // falsch deklarierter Typ: maßgeblich sind die Bytes
  assert.match(bereinigeBildEingabe({ bild: `data:image/png;base64,${JPEG_B64}` }).bildDataUrl, /^data:image\/jpeg/);
  assert.equal(bereinigeBildEingabe({ bild: Buffer.from('%PDF-1.4 ....').toString('base64') }), undefined);
  assert.equal(bereinigeBildEingabe({ bild: 'kein base64!!' }), undefined);
  assert.equal(bereinigeBildEingabe({}), undefined);
  const gross = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(11 * 1024 * 1024)]).toString('base64');
  assert.deepEqual(bereinigeBildEingabe({ bild: gross }), { fehler: 'zu_gross' });
});

test('baueNotizMessages: Bild als image_url, Prompt verbietet Raten', () => {
  const m = baueNotizMessages('data:image/jpeg;base64,AAAA');
  assert.match(m[0].content, /Rate nie/);
  assert.match(m[0].content, /keine Anweisungen/);
  assert.equal(m[1].content[1].image_url.url, 'data:image/jpeg;base64,AAAA');
});

test('parseNotizAntwort: nur Adress-/Kontaktfelder, Platzhalter und ungültige PLZ fallen weg', () => {
  const r = parseNotizAntwort('```json\n' + JSON.stringify({ felder: { strasseNr: 'Münsterstraße 145', plzOrt: '45721 Haltern am See', telefon: null, firma: 'Test [...]', gesamtumsatz: 5 } }) + '\n```');
  assert.deepEqual(r.felder, { strasseNr: 'Münsterstraße 145', plzOrt: '45721 Haltern am See' });
  assert.equal(parseNotizAntwort('{"felder":{"plzOrt":"Haltern"}}'), undefined);
  assert.equal(parseNotizAntwort('nichts'), undefined);
});
