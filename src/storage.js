import { createClient } from '@supabase/supabase-js';

const env = import.meta.env || {};
const table = env.VITE_SUPABASE_TABLE || 'famous_people_attribute';
const supabase = env.VITE_SUPABASE_URL && env.VITE_SUPABASE_API_KEY
  ? createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_API_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  : null;

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const duplicateConstraint = '"famous_people_attribute_session_id_key"';

// Se exporta la factoría para probar el envío sin contactar con Supabase.
export function createSessionSaver(client, destination, {
  waitForRetry = wait,
  timeoutMs = 15000,
} = {}) {
  return async session => {
    if (!client) return { ok: false, code: 'MISSING_CONFIGURATION' };

    // Todos los intentos envían exactamente la misma sesión, incluido su UUID.
    let payload;
    try {
      payload = JSON.parse(JSON.stringify(session));
    } catch {
      return { ok: false, code: 'INVALID_PAYLOAD' };
    }

    let lastCode = 'NETWORK_ERROR';
    for (const delay of [0, 1000, 3000]) {
      if (delay) await waitForRetry(delay);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        // INSERT sin SELECT: el navegador no tiene permisos para leer resultados.
        const { error, status } = await client
          .from(destination)
          .insert({ data: payload })
          .abortSignal(controller.signal);

        if (!error) return { ok: true };
        // Puede haberse guardado el primer intento aunque se perdiese su respuesta.
        // Solo esta restricción concreta confirma que la sesión ya fue recibida.
        if (error.code === '23505' && error.message?.includes(duplicateConstraint)) {
          return { ok: true, alreadySaved: true };
        }

        lastCode = error.code || String(status || 'NETWORK_ERROR');
        // Reintentar solo fallos de red, límites temporales y errores del servidor.
        if (status && status !== 408 && status !== 429 && status < 500) {
          return { ok: false, code: lastCode };
        }
      } catch {
        lastCode = controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR';
      } finally {
        clearTimeout(timeout);
      }
    }
    return { ok: false, code: lastCode };
  };
}

export const saveSession = createSessionSaver(supabase, table);
