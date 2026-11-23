import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAiHubClient, AiHubError } from './aiHub.js';

const TEST_KEY = 'sk-aihub-TESTKEY-nicht-echt';
const ENV = { AI_HUB_API_KEY: TEST_KEY, AI_HUB_MODEL: 'test-modell' };

const json = (body, init = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' }, ...init });

const sse = (zeilen) =>
  new Response(
    new ReadableStream({
      start(c) {
        const enc = new TextEncoder();
        for (const z of zeilen) c.enqueue(enc.encode(z));
        c.close();
      },
    }),
    { status: 200, headers: { 'content-type': 'text/event-stream' } },
  );

function mock(antworten) {
  const aufrufe = [];
  const fetchImpl = async (url, opts) => {
    aufrufe.push({ url, opts });
    const a = antworten.shift();
    if (a instanceof Error) throw a;
    return typeof a === 'function' ? a() : a;
  };
  return { fetchImpl, aufrufe };
}

const client = (antworten, env = ENV) => {
  const m = mock(antworten);
  const warten = [];
  const c = createAiHubClient({ env, fetchImpl: m.fetchImpl, sleep: async (ms) => warten.push(ms), zufall: () => 0 });
  return { c, ...m, warten };
};

const NACHRICHTEN = [{ role: 'user', content: 'Hallo' }];

test('status: ohne Key/Modell nicht konfiguriert, Key wird nie ausgegeben', () => {
  const { c } = client([], {});
  assert.deepEqual(c.status(), { konfiguriert: false, modellGesetzt: false, modell: null });
  const voll = client([]).c.status();
  assert.equal(voll.konfiguriert, true);
  assert.ok(!JSON.stringify(voll).includes(TEST_KEY));
});

test('chat: sendet Bearer-Key, Modell und Nachrichten an /v1/chat/completions', async () => {
  const { c, aufrufe } = client([
    json({ model: 'test-modell', choices: [{ message: { content: 'Hi' }, finish_reason: 'stop' }], usage: { total_tokens: 5 } }),
  ]);
  const r = await c.chat({ messages: NACHRICHTEN, maxTokens: 50 });
  assert.equal(r.text, 'Hi');
  assert.equal(r.finishReason, 'stop');
  assert.deepEqual(r.nutzung, { total_tokens: 5 });
  const { url, opts } = aufrufe[0];
  assert.equal(url, 'https://adesso-ai-hub.3asabc.de/v1/chat/completions');
  assert.equal(opts.method, 'POST');
  assert.equal(opts.headers.Authorization, `Bearer ${TEST_KEY}`);
  assert.deepEqual(JSON.parse(opts.body), { model: 'test-modell', messages: NACHRICHTEN, max_tokens: 50 });
});

test('chat: Basis-URL überschreibbar, Slash am Ende wird entfernt', async () => {
  const { c, aufrufe } = client([json({ choices: [{ message: { content: 'x' } }] })], { ...ENV, AI_HUB_BASE_URL: 'http://lokal:1234/' });
  await c.chat({ messages: NACHRICHTEN });
  assert.equal(aufrufe[0].url, 'http://lokal:1234/v1/chat/completions');
});

test('chat: ohne Key oder Modell kein Netzwerkaufruf', async () => {
  const a = client([], { AI_HUB_MODEL: 'm' });
  await assert.rejects(a.c.chat({ messages: NACHRICHTEN }), (e) => e.art === 'nicht_konfiguriert' && /AI_HUB_API_KEY/.test(e.message));
  const b = client([], { AI_HUB_API_KEY: TEST_KEY });
  await assert.rejects(b.c.chat({ messages: NACHRICHTEN }), (e) => e.art === 'nicht_konfiguriert' && /AI_HUB_MODEL/.test(e.message));
  assert.equal(a.aufrufe.length + b.aufrufe.length, 0);
});

test('chat: ungültige messages werden abgelehnt', async () => {
  const { c, aufrufe } = client([]);
  await assert.rejects(c.chat({ messages: [] }), (e) => e.art === 'ungueltige_anfrage');
  await assert.rejects(c.chat({ messages: [{ role: 'user' }] }), (e) => e.art === 'ungueltige_anfrage');
  assert.equal(aufrufe.length, 0);
});

test('chat: Fehlerstatus werden auf Arten abgebildet (problem+json und error-Objekt)', async () => {
  const faelle = [
    [401, { title: 'Unauthorized', detail: 'Key ungültig', status: 401 }, 'authentifizierung'],
    [402, { error: { message: 'Budget erschöpft' } }, 'budget'],
    [403, { detail: 'Modell gesperrt' }, 'modell_nicht_erlaubt'],
    [400, { detail: 'kaputt' }, 'ungueltige_anfrage'],
    [413, { detail: 'zu groß' }, 'zu_gross'],
  ];
  for (const [status, body, art] of faelle) {
    const { c, aufrufe } = client([json(body, { status })]);
    await assert.rejects(c.chat({ messages: NACHRICHTEN }), (e) => e instanceof AiHubError && e.art === art && e.status === status);
    assert.equal(aufrufe.length, 1, `${status} darf nicht wiederholt werden`);
  }
});

test('chat: Fehlermeldung enthält Detail, aber nie den Key', async () => {
  const { c } = client([json({ detail: 'Key ungültig' }, { status: 401 })]);
  await assert.rejects(c.chat({ messages: NACHRICHTEN }), (e) => /Key ungültig/.test(e.message) && !e.message.includes(TEST_KEY));
});

test('chat: 429 mit Retry-After wird wiederholt und wartet die angegebene Zeit', async () => {
  const { c, aufrufe, warten } = client([
    json({ detail: 'langsam' }, { status: 429, headers: { 'retry-after': '2' } }),
    json({ choices: [{ message: { content: 'ok' } }] }),
  ]);
  assert.equal((await c.chat({ messages: NACHRICHTEN })).text, 'ok');
  assert.equal(aufrufe.length, 2);
  assert.deepEqual(warten, [2000]);
});

test('chat: 503 bleibt nach 3 Versuchen ein Fehler mit Backoff', async () => {
  const { c, aufrufe, warten } = client([
    json({ detail: 'a' }, { status: 503 }),
    json({ detail: 'b' }, { status: 503 }),
    json({ detail: 'c' }, { status: 503, headers: { 'retry-after': '7' } }),
  ]);
  await assert.rejects(c.chat({ messages: NACHRICHTEN }), (e) => e.art === 'nicht_verfuegbar' && e.retryAfterMs === 7000);
  assert.equal(aufrufe.length, 3);
  assert.deepEqual(warten, [500, 1000]);
});

test('chat: Netzwerkfehler wird wiederholt, danach als netzwerk gemeldet', async () => {
  const ok = client([new Error('ECONNRESET'), json({ choices: [{ message: { content: 'ok' } }] })]);
  assert.equal((await ok.c.chat({ messages: NACHRICHTEN })).text, 'ok');
  const kaputt = client([new Error('a'), new Error('b'), new Error('c')]);
  await assert.rejects(kaputt.c.chat({ messages: NACHRICHTEN }), (e) => e.art === 'netzwerk');
  assert.equal(kaputt.aufrufe.length, 3);
});

test('chat: Timeout bricht ab und wird als timeout gemeldet', async () => {
  const fetchImpl = (url, opts) =>
    new Promise((_, reject) => opts.signal.addEventListener('abort', () => reject(new Error('aborted'))));
  const c = createAiHubClient({ env: { ...ENV, AI_HUB_TIMEOUT_MS: '20' }, fetchImpl, sleep: async () => {}, zufall: () => 0 });
  await assert.rejects(c.chat({ messages: NACHRICHTEN }), (e) => e.art === 'timeout');
});

test('chat: unerwartetes Antwortformat → antwortformat', async () => {
  const { c } = client([json({ irgendwas: 1 })]);
  await assert.rejects(c.chat({ messages: NACHRICHTEN }), (e) => e.art === 'antwortformat');
  const k = client([new Response('<html>', { status: 200 })]);
  await assert.rejects(k.c.chat({ messages: NACHRICHTEN }), (e) => e.art === 'antwortformat');
});

test('chat: content als Teile-Liste wird zusammengesetzt', async () => {
  const { c } = client([json({ choices: [{ message: { content: [{ type: 'text', text: 'A' }, { type: 'text', text: 'B' }] } }] })]);
  assert.equal((await c.chat({ messages: NACHRICHTEN })).text, 'AB');
});

test('chatStream: liest SSE-Blöcke über Chunk-Grenzen hinweg, Usage und [DONE]', async () => {
  const { c, aufrufe } = client([
    sse([
      ': keep-alive\n\n',
      'data: {"choices":[{"delta":{"content":"Hal"}}]}\n\nda',
      'ta: {"choices":[{"delta":{"content":"lo"}}]}\r\n\r\n',
      'data: {"choices":[],"usage":{"total_tokens":9}}\n\n',
      'data: [DONE]\n\n',
      'data: {"choices":[{"delta":{"content":"NACH DONE"}}]}\n\n',
    ]),
  ]);
  const teile = [];
  for await (const t of c.chatStream({ messages: NACHRICHTEN })) teile.push(t);
  assert.deepEqual(teile, [{ text: 'Hal' }, { text: 'lo' }, { nutzung: { total_tokens: 9 } }]);
  assert.equal(JSON.parse(aufrufe[0].opts.body).stream, true);
});

test('chatStream: HTTP-Fehler vor dem Stream und kaputte Blöcke werden gemeldet', async () => {
  const a = client([json({ detail: 'Key ungültig' }, { status: 401 })]);
  await assert.rejects(async () => { for await (const _ of a.c.chatStream({ messages: NACHRICHTEN })); }, (e) => e.art === 'authentifizierung');
  const b = client([sse(['data: {kaputt\n\n'])]);
  await assert.rejects(async () => { for await (const _ of b.c.chatStream({ messages: NACHRICHTEN })); }, (e) => e.art === 'antwortformat');
  const c2 = client([sse(['data: {"error":{"message":"Abbruch"}}\n\n'])]);
  await assert.rejects(async () => { for await (const _ of c2.c.chatStream({ messages: NACHRICHTEN })); }, (e) => /Abbruch/.test(e.message));
});

test('modelle: liest die Modellliste (GET /v1/models)', async () => {
  const { c, aufrufe } = client([json({ data: [{ id: 'm1', context_length: 1000 }, { id: 'm2' }] })], { AI_HUB_API_KEY: TEST_KEY });
  assert.deepEqual(await c.modelle(), [
    { id: 'm1', kontext: 1000, maxAusgabe: null, modus: null },
    { id: 'm2', kontext: null, maxAusgabe: null, modus: null },
  ]);
  assert.equal(aufrufe[0].url, 'https://adesso-ai-hub.3asabc.de/v1/models');
  assert.equal(aufrufe[0].opts.method, 'GET');
  assert.equal(aufrufe[0].opts.body, undefined);
});
