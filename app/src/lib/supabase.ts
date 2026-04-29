import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client singleton.
 * URL e anon key vanno in `.env.local` durante lo sviluppo e nelle Environment
 * Variables di Vercel (Project → Settings → Environment Variables) per produzione.
 *
 *   VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY=eyJhbGc...
 *
 * NB: la anon key è pubblica per design, la sicurezza si tiene tramite RLS
 * lato database. Vedi script SQL allegato per chiudere le RPC ad anon e
 * limitare la SELECT su `voci` alle sole righe `stato = 'validated'`.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[Supabase] VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY non impostate. Il prezzario userà valori di fallback.'
  );
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false }, // sito vetrina, niente sessioni utente
      })
    : null;

export const isSupabaseReady = supabase !== null;
