import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_API_KEY;
// Se conserva la tabla del experimento base. Se puede cambiar desde .env.
const table = import.meta.env.VITE_SUPABASE_TABLE || 'experimento-personajes-aprend';
const supabase = url && key ? createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
}) : null;

export async function saveSession(session) {
  if (!supabase) return { ok: false };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    // Guardamos JSON real, no la instancia DataCollection de jsPsych.
    const { error } = await supabase.from(table).insert({ data: session }).abortSignal(controller.signal);
    return { ok: !error };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timeout);
  }
}
