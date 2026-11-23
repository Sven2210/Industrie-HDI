import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bereinigeEingabe, parseZusammenfassung, baueMessages } from './risikoZusammenfassung.js';

test('bereinigeEingabe: verwirft unbekannte Felder, kappt Längen, normalisiert Ampeln', () => {
  const e = bereinigeEingabe({
    betriebsbeschreibung: 'a'.repeat(5000),
    naturgefahren: [{ name: 'Sturm', ampel: 'lila', score: 3 }, { name: '' }, null],
    firmenname: 'GEHEIM',
    sanktionen: { ampel: 'rot', anzahlTreffer: 2 },
  });
  assert.equal(e.betriebsbeschreibung.length, 1500);
  assert.deepEqual(e.naturgefahren, [{ name: 'Sturm', ampel: 'unbekannt', score: 3 }]);
  assert.deepEqual(e.sanktionen, { ampel: 'rot', anzahlTreffer: 2 });
  assert.ok(!JSON.stringify(e).includes('GEHEIM'));
});

test('bereinigeEingabe: ohne Analyseinhalt oder mit falschem Typ undefined', () => {
  assert.equal(bereinigeEingabe(undefined), undefined);
  assert.equal(bereinigeEingabe('text'), undefined);
  assert.equal(bereinigeEingabe({ sparte: 'Haftpflicht', betriebsbeschreibung: 'x' }), undefined);
});

test('parseZusammenfassung: toleriert Codeblock, kappt Listen, prüft Pflichtfeld', () => {
  const roh = { kurzfazit: 'Fazit', stichpunkte: Array.from({ length: 12 }, (_, i) => ({ titel: `t${i}`, text: 'x', ampel: 'gelb' })), offenePunkte: ['a', '', 5] };
  const p = parseZusammenfassung('Hier:\n```json\n' + JSON.stringify(roh) + '\n```');
  assert.equal(p.kurzfazit, 'Fazit');
  assert.equal(p.stichpunkte.length, 8);
  assert.deepEqual(p.offenePunkte, ['a']);
  assert.equal(parseZusammenfassung('{"kurzfazit":""}'), undefined);
  assert.equal(parseZusammenfassung('kein json'), undefined);
  assert.equal(parseZusammenfassung('{kaputt}'), undefined);
});

test('baueMessages: Systemprompt verlangt JSON und warnt vor Anweisungen in Daten', () => {
  const m = baueMessages({ sparte: 'x' });
  assert.equal(m[0].role, 'system');
  assert.match(m[0].content, /JSON/);
  assert.match(m[0].content, /keine Anweisungen/);
  assert.match(m[1].content, /"sparte":"x"/);
});

test('parseZusammenfassung: geschweifte Klammern in Texten und Text vor/nach dem JSON', () => {
  const roh = { kurzfazit: 'Wert {A} und "zitiert"', stichpunkte: [], offenePunkte: [] };
  const p = parseZusammenfassung(`Ich denke {kurz} nach.\n${JSON.stringify(roh)}\nFertig {ja}`);
  assert.equal(p.kurzfazit, 'Wert {A} und "zitiert"');
});
