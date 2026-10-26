import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { createSessionSaver } from '../src/storage.js';

const session = () => ({
  session_id: '11111111-1111-4111-8111-111111111111',
  participant_id: '11111111-1111-4111-8111-111111111111',
  completed: true,
  participant: { age: 25, sex: 'Femenino' },
  trials: [{ task: 'recognition', response: 'a', rt: 450 }],
});

function setup(respond, options = {}) {
  const requests = [];
  const delays = [];
  const client = createClient('https://test.supabase.co', 'public-test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (url, init) => {
        const request = { url: new URL(url), ...init, payload: JSON.parse(init.body) };
        requests.push(request);
        return respond(request, requests.length);
      },
    },
  });
  const save = createSessionSaver(client, 'famous_people_attribute', {
    waitForRetry: async ms => { delays.push(ms); },
    ...options,
  });
  return { save, requests, delays };
}

const reply = (status, body) => new Response(body ? JSON.stringify(body) : '', {
  status, headers: { 'content-type': 'application/json' },
});

test('envía el JSON completo a la tabla nueva sin solicitar su lectura', async () => {
  const { save, requests, delays } = setup(() => reply(201));
  const data = session();
  assert.deepEqual(await save(data), { ok: true });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url.pathname, '/rest/v1/famous_people_attribute');
  assert.equal(requests[0].method, 'POST');
  assert.equal(requests[0].url.searchParams.has('select'), false);
  assert.deepEqual(requests[0].payload, { data });
  assert.deepEqual(delays, []);
});

test('reintenta errores temporales y conserva la misma sesión en cada intento', async () => {
  const data = session();
  const original = structuredClone(data);
  const { save, requests, delays } = setup((request, attempt) => {
    if (attempt === 1) {
      data.trials[0].response = 'l';
      return reply(503, { message: 'Temporalmente no disponible' });
    }
    if (attempt === 2) return reply(429, { message: 'Límite temporal' });
    return reply(201);
  });
  assert.deepEqual(await save(data), { ok: true });
  assert.equal(requests.length, 3);
  assert.deepEqual(delays, [1000, 3000]);
  requests.forEach(request => assert.deepEqual(request.payload, { data: original }));
});

test('reconoce una sesión ya guardada cuando se pierde la respuesta de red', async () => {
  const { save, requests } = setup((request, attempt) => {
    if (attempt === 1) throw new TypeError('Failed to fetch después de guardar');
    return reply(409, {
      code: '23505',
      message: 'duplicate key value violates unique constraint "famous_people_attribute_session_id_key"',
    });
  });
  assert.deepEqual(await save(session()), { ok: true, alreadySaved: true });
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0].payload, requests[1].payload);
});

test('no confunde otros conflictos con una sesión guardada', async () => {
  const { save, requests } = setup(() => reply(409, {
    code: '23505', message: 'duplicate key value violates unique constraint "otra_restriccion"',
  }));
  assert.deepEqual(await save(session()), { ok: false, code: '23505' });
  assert.equal(requests.length, 1);
});

test('los errores de permisos o esquema se devuelven sin repetir el envío', async () => {
  for (const [status, code] of [[403, '42501'], [400, 'PGRST204']]) {
    const { save, requests, delays } = setup(() => reply(status, { code, message: 'Error permanente' }));
    assert.deepEqual(await save(session()), { ok: false, code });
    assert.equal(requests.length, 1);
    assert.deepEqual(delays, []);
  }
});

test('limita los reintentos cuando el servidor sigue fallando', async () => {
  const { save, requests } = setup(() => reply(503, { message: 'No disponible' }));
  assert.deepEqual(await save(session()), { ok: false, code: '503' });
  assert.equal(requests.length, 3);
});

test('cancela peticiones bloqueadas y agota un número limitado de intentos', async () => {
  const { save, requests } = setup(request => new Promise((resolve, reject) => {
    request.signal.addEventListener('abort', () => {
      reject(new DOMException('Se agotó el tiempo', 'AbortError'));
    }, { once: true });
  }), { timeoutMs: 10 });
  const result = await save(session());
  assert.equal(result.ok, false);
  assert.equal(requests.length, 3);
  assert.ok(requests.every(request => request.signal.aborted));
});

test('la falta de configuración devuelve un error explícito', async () => {
  const save = createSessionSaver(null, 'famous_people_attribute');
  assert.deepEqual(await save(session()), { ok: false, code: 'MISSING_CONFIGURATION' });
});
