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
