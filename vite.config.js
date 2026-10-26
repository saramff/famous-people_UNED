import { defineConfig, loadEnv } from 'vite';

// Impedir que se publique una versión que no pueda enviar los resultados.
export function validateStorageConfig(env) {
  let url;
  try {
    url = new URL(env.VITE_SUPABASE_URL);
  } catch {
    throw new Error('Falta una VITE_SUPABASE_URL válida para guardar los resultados.');
  }
  if (url.protocol !== 'https:') {
    throw new Error('VITE_SUPABASE_URL debe usar HTTPS.');
  }

  const key = env.VITE_SUPABASE_API_KEY || '';
  if (!key.startsWith('sb_publishable_')) {
    let claims;
    try {
      claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8'));
    } catch {
      throw new Error('Falta una clave pública de Supabase en VITE_SUPABASE_API_KEY.');
    }
    if (claims.role !== 'anon') {
      throw new Error('VITE_SUPABASE_API_KEY debe ser pública o anon; no puede ser una clave administrativa.');
    }
    if (claims.ref && url.hostname.endsWith('.supabase.co')
      && claims.ref !== url.hostname.split('.')[0]) {
      throw new Error('La URL y la clave de Supabase deben pertenecer al mismo proyecto.');
    }
  }

  if ((env.VITE_SUPABASE_TABLE || 'famous_people_attribute') !== 'famous_people_attribute') {
    throw new Error('VITE_SUPABASE_TABLE debe ser famous_people_attribute.');
  }
}

export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    validateStorageConfig(loadEnv(mode, process.cwd(), 'VITE_'));
  }
  return {};
});
