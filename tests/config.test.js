import test from 'node:test';
import assert from 'node:assert/strict';
import { validateStorageConfig } from '../vite.config.js';

const key = claims => 'eyJhbGciOiJIUzI1NiJ9.'
  + Buffer.from(JSON.stringify(claims)).toString('base64url') + '.test';
const config = () => ({
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_API_KEY: key({ role: 'anon', ref: 'example' }),
  VITE_SUPABASE_TABLE: 'famous_people_attribute',
});

test('permite compilar con la clave anon del proyecto o una clave pública', () => {
  assert.doesNotThrow(() => validateStorageConfig(config()));
  assert.doesNotThrow(() => validateStorageConfig({
    ...config(), VITE_SUPABASE_API_KEY: 'sb_publishable_test',
  }));
});

test('impide publicar sin URL, sin clave o con una conexión que no usa HTTPS', () => {
  for (const override of [
    { VITE_SUPABASE_URL: '' },
    { VITE_SUPABASE_URL: 'http://example.supabase.co' },
    { VITE_SUPABASE_API_KEY: '' },
  ]) assert.throws(() => validateStorageConfig({ ...config(), ...override }));
});

test('rechaza claves administrativas y claves de otro proyecto antes de compilar', () => {
  for (const value of [
    'sb_secret_test',
    key({ role: 'service_role', ref: 'example' }),
    key({ role: 'anon', ref: 'other-project' }),
  ]) assert.throws(() => validateStorageConfig({
    ...config(), VITE_SUPABASE_API_KEY: value,
  }));
});

test('impide publicar con la tabla del experimento anterior', () => {
  assert.throws(() => validateStorageConfig({
    ...config(), VITE_SUPABASE_TABLE: 'experimento-personajes-aprend',
  }));
});
