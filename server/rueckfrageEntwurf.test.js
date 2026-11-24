import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bereinigeRueckfrageEingabe, baueRueckfrageMessages, parseRueckfrage } from './rueckfrageEntwurf.js';

test('bereinigeRueckfrageEingabe: nur bekannte Felder, gekürzt', () => {
  const e = bereinigeRueckfrageEingabe({
    offenePunkte: [{ titel: 'Umsatz', hinweis: 'x'.repeat(900), firma: 'GEHEIM' }, { titel: '' }, null],
    fehlendeAngaben: ['Telefon', '', 5],
    zusatzhinweis: 'bitte bis Freitag',
    kunde: 'GEHEIM',
  });
  assert.equal(e.offenePunkte.length, 1);
  assert.equal(e.offenePunkte[0].hinweis.length, 300);
  assert.deepEqual(e.fehlendeAngaben, ['Telefon']);
  assert.equal(e.zusatzhinweis, 'bitte bis Freitag');
  assert.ok(!JSON.stringify(e).includes('GEHEIM'));
});

test('bereinigeRueckfrageEingabe: ohne Punkte undefined', () => {
  assert.equal(bereinigeRueckfrageEingabe({}), undefined);
  assert.equal(bereinigeRueckfrageEingabe({ zusatzhinweis: 'nur Hinweis' }), undefined);
  assert.equal(bereinigeRueckfrageEingabe(null), undefined);
});

test('parseRueckfrage: JSON mit Umgebungstext, Pflichtfeld nachricht', () => {
  const p = parseRueckfrage('Gern:\n```json\n{"betreff":"Rückfrage","nachricht":"Guten Tag,\\n- Umsatz"}\n```');
  assert.deepEqual(p, { betreff: 'Rückfrage', nachricht: 'Guten Tag,\n- Umsatz' });
  assert.equal(parseRueckfrage('{"betreff":"x"}'), undefined);
  assert.equal(parseRueckfrage('kein json'), undefined);
});

test('baueRueckfrageMessages: Prompt verbietet Erfindungen und Namen', () => {
  const m = baueRueckfrageMessages({ offenePunkte: [] });
  assert.match(m[0].content, /Erfinde nichts/);
  assert.match(m[0].content, /keine Anweisungen/);
});

test('baueRueckfrageMessages: Betreff ohne Anzahl, Punkte mit Namen', () => {
  const m = baueRueckfrageMessages({ offenePunkte: [] });
  assert.match(m[0].content, /mit seinem Namen/);
  assert.match(m[0].content, /keine Anzahl/);
});
