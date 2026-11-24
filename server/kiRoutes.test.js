import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createKiRouter, createRateLimiter } from './kiRoutes.js';
import { createAiHubClient } from './aiHub.js';

const TEST_KEY = 'sk-aihub-TESTKEY-nicht-echt';

async function mitServer(env, fetchImpl, optionen, fn) {
  const client = createAiHubClient({ env, fetchImpl, sleep: async () => {}, zufall: () => 0 });
  const app = express();
  app.use('/api/ki', createKiRouter(client, optionen));
  const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  try {
    await fn(`http://127.0.0.1:${server.address().port}/api/ki`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const antwort = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

test('GET /status gibt nie den Key aus', async () => {
  await mitServer({ AI_HUB_API_KEY: TEST_KEY, AI_HUB_MODEL: 'm' }, async () => assert.fail('kein Netzwerk'), undefined, async (basis) => {
    const text = await (await fetch(`${basis}/status`)).text();
    assert.deepEqual(JSON.parse(text), { konfiguriert: true, modellGesetzt: true, modell: 'm' });
    assert.ok(!text.includes(TEST_KEY));
  });
});

test('POST /ping: Erfolg liefert ok und Modell', async () => {
  const fetchImpl = async () => antwort({ model: 'm', choices: [{ message: { content: 'OK' } }] });
  await mitServer({ AI_HUB_API_KEY: TEST_KEY, AI_HUB_MODEL: 'm' }, fetchImpl, undefined, async (basis) => {
    const res = await fetch(`${basis}/ping`, { method: 'POST' });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true, antwort: 'OK', modell: 'm' });
  });
});

test('POST /ping ohne Konfiguration → 503 nicht_konfiguriert', async () => {
  await mitServer({}, async () => assert.fail('kein Netzwerk'), undefined, async (basis) => {
    const res = await fetch(`${basis}/ping`, { method: 'POST' });
    assert.equal(res.status, 503);
    assert.equal((await res.json()).fehler.art, 'nicht_konfiguriert');
  });
});

test('POST /ping: ungültiger Key beim Hub → 502 ohne Key im Body', async () => {
  const fetchImpl = async () => antwort({ detail: 'Key ungültig' }, 401);
  await mitServer({ AI_HUB_API_KEY: TEST_KEY, AI_HUB_MODEL: 'm' }, fetchImpl, undefined, async (basis) => {
    const res = await fetch(`${basis}/ping`, { method: 'POST' });
    const text = await res.text();
    assert.equal(res.status, 502);
    assert.equal(JSON.parse(text).fehler.art, 'authentifizierung');
    assert.ok(!text.includes(TEST_KEY));
  });
});

test('POST /ping: 429 des Hubs wird mit Retry-After weitergegeben', async () => {
  const fetchImpl = async () => new Response('{}', { status: 429, headers: { 'retry-after': '5' } });
  await mitServer({ AI_HUB_API_KEY: TEST_KEY, AI_HUB_MODEL: 'm' }, fetchImpl, undefined, async (basis) => {
    const res = await fetch(`${basis}/ping`, { method: 'POST' });
    assert.equal(res.status, 429);
    assert.equal(res.headers.get('retry-after'), '5');
  });
});

test('POST /ping: eigenes Rate-Limit greift ohne Aufruf beim Hub', async () => {
  let aufrufe = 0;
  const fetchImpl = async () => { aufrufe++; return antwort({ choices: [{ message: { content: 'OK' } }] }); };
  const pingLimit = createRateLimiter({ max: 2, fensterMs: 60_000 });
  await mitServer({ AI_HUB_API_KEY: TEST_KEY, AI_HUB_MODEL: 'm' }, fetchImpl, { pingLimit }, async (basis) => {
    for (let i = 0; i < 2; i++) assert.equal((await fetch(`${basis}/ping`, { method: 'POST' })).status, 200);
    const res = await fetch(`${basis}/ping`, { method: 'POST' });
    assert.equal(res.status, 429);
    assert.ok(Number(res.headers.get('retry-after')) > 0);
    assert.equal(aufrufe, 2);
  });
});

test('GET /modelle liefert die Modell-IDs', async () => {
  const fetchImpl = async () => antwort({ data: [{ id: 'm1' }] });
  await mitServer({ AI_HUB_API_KEY: TEST_KEY }, fetchImpl, undefined, async (basis) => {
    const res = await fetch(`${basis}/modelle`);
    assert.equal((await res.json()).modelle[0].id, 'm1');
  });
});

test('Rate-Limiter: Fenster läuft ab', () => {
  let t = 0;
  const limit = createRateLimiter({ max: 1, fensterMs: 1000, jetzt: () => t });
  assert.equal(limit(), 0);
  assert.equal(limit(), 1);
  t = 1000;
  assert.equal(limit(), 0);
});

// ---- Risikozusammenfassung ----

const EINGABE = {
  sparte: 'Haftpflicht',
  betriebsbeschreibung: 'Herstellung von Pumpen',
  bhvKategorien: [{ titel: 'Export', stufe: 'hoch', begruendung: 'USA-Anteil' }],
  naturgefahren: [{ name: 'Hochwasser', ampel: 'gelb', score: 5 }],
  sanktionen: { ampel: 'gruen', anzahlTreffer: 0 },
  firmenname: 'GEHEIM GmbH', // unbekanntes Feld: darf nie ans Modell gehen
};

const modellAntwort = (inhalt) => antwort({ model: 'm', choices: [{ message: { content: inhalt } }] });
const ZUSAMMENFASSUNG = { kurzfazit: 'Mittleres Risiko.', stichpunkte: [{ titel: 'Export', text: 'USA-Anteil hoch.', ampel: 'rot' }], offenePunkte: ['Umsätze prüfen'] };
const postJson = (basis, body) => fetch(`${basis}/risikozusammenfassung`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('POST /risikozusammenfassung: sendet nur bereinigte Daten und liefert strukturierte Antwort', async () => {
  let gesendet;
  const fetchImpl = async (_url, opts) => { gesendet = JSON.parse(opts.body); return modellAntwort('```json\n' + JSON.stringify(ZUSAMMENFASSUNG) + '\n```'); };
  await mitServer({ AI_HUB_API_KEY: TEST_KEY, AI_HUB_MODEL: 'm' }, fetchImpl, undefined, async (basis) => {
    const res = await postJson(basis, EINGABE);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.zusammenfassung, ZUSAMMENFASSUNG);
    assert.equal(body.modell, 'm');
    assert.ok(body.erstelltAm);
    const alles = JSON.stringify(gesendet);
    assert.ok(!alles.includes('GEHEIM'), 'Kundendaten dürfen nicht ans Modell');
    assert.ok(alles.includes('USA-Anteil') && alles.includes('Hochwasser'));
    assert.equal(gesendet.messages[0].role, 'system');
  });
});

test('POST /risikozusammenfassung: Eingabe ohne Analysen → 400, kein Hub-Aufruf', async () => {
  await mitServer({ AI_HUB_API_KEY: TEST_KEY, AI_HUB_MODEL: 'm' }, async () => assert.fail('kein Netzwerk'), undefined, async (basis) => {
    for (const body of [{}, { sparte: 'x' }, []]) {
      const res = await postJson(basis, body);
      assert.equal(res.status, 400);
      assert.equal((await res.json()).fehler.art, 'ungueltige_anfrage');
    }
    const kaputt = await fetch(`${basis}/risikozusammenfassung`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{kaputt' });
    assert.equal(kaputt.status, 400);
    assert.equal((await kaputt.json()).fehler.art, 'ungueltige_anfrage');
  });
});

test('POST /risikozusammenfassung: zu große Eingabe → 413', async () => {
  await mitServer({ AI_HUB_API_KEY: TEST_KEY, AI_HUB_MODEL: 'm' }, async () => assert.fail('kein Netzwerk'), undefined, async (basis) => {
    const res = await postJson(basis, { ...EINGABE, betriebsbeschreibung: 'x'.repeat(70_000) });
    assert.equal(res.status, 413);
    assert.equal((await res.json()).fehler.art, 'zu_gross');
  });
});

test('POST /risikozusammenfassung: Modell liefert kein JSON → 502 antwortformat', async () => {
  await mitServer({ AI_HUB_API_KEY: TEST_KEY, AI_HUB_MODEL: 'm' }, async () => modellAntwort('Das Risiko ist mittel.'), undefined, async (basis) => {
    const res = await postJson(basis, EINGABE);
    assert.equal(res.status, 502);
    assert.equal((await res.json()).fehler.art, 'antwortformat');
  });
});

test('POST /risikozusammenfassung: Hub-Fehler und Rate-Limit', async () => {
  await mitServer({ AI_HUB_API_KEY: TEST_KEY, AI_HUB_MODEL: 'm' }, async () => antwort({ detail: 'Budget' }, 402), undefined, async (basis) => {
    const res = await postJson(basis, EINGABE);
    assert.equal(res.status, 503);
    assert.equal((await res.json()).fehler.art, 'budget');
  });
  let aufrufe = 0;
  const fetchImpl = async () => { aufrufe++; return modellAntwort(JSON.stringify(ZUSAMMENFASSUNG)); };
  const zusammenfassungLimit = createRateLimiter({ max: 1, fensterMs: 60_000 });
  await mitServer({ AI_HUB_API_KEY: TEST_KEY, AI_HUB_MODEL: 'm' }, fetchImpl, { zusammenfassungLimit }, async (basis) => {
    assert.equal((await postJson(basis, EINGABE)).status, 200);
    assert.equal((await postJson(basis, EINGABE)).status, 429);
    assert.equal(aufrufe, 1);
  });
});

// ---- Rückfrage-Entwurf ----

const postRueckfrage = (basis, body) => fetch(`${basis}/rueckfrage-entwurf`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('POST /rueckfrage-entwurf: liefert Entwurf, Kundendaten gehen nicht ans Modell', async () => {
  let gesendet;
  const fetchImpl = async (_u, opts) => {
    gesendet = JSON.parse(opts.body);
    return modellAntwort(JSON.stringify({ betreff: 'Rückfrage', nachricht: 'Guten Tag,\n- Umsatz' }));
  };
  await mitServer({ AI_HUB_API_KEY: TEST_KEY, AI_HUB_MODEL: 'm' }, fetchImpl, undefined, async (basis) => {
    const res = await postRueckfrage(basis, { offenePunkte: [{ titel: 'Umsatz', hinweis: 'fehlt' }], kunde: 'GEHEIM GmbH' });
    assert.equal(res.status, 200);
    assert.deepEqual((await res.json()).entwurf, { betreff: 'Rückfrage', nachricht: 'Guten Tag,\n- Umsatz' });
    assert.ok(!JSON.stringify(gesendet).includes('GEHEIM'));
  });
});

test('POST /rueckfrage-entwurf: ohne Punkte 400, unlesbare Modellantwort 502', async () => {
  await mitServer({ AI_HUB_API_KEY: TEST_KEY, AI_HUB_MODEL: 'm' }, async () => modellAntwort('Hallo'), undefined, async (basis) => {
    assert.equal((await postRueckfrage(basis, {})).status, 400);
    const res = await postRueckfrage(basis, { offenePunkte: [{ titel: 'Umsatz' }] });
    assert.equal(res.status, 502);
    assert.equal((await res.json()).fehler.art, 'antwortformat');
  });
});
