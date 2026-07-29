import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase usato lato server dall'API route /api/lead per l'insert.
 *
 * Env (Vercel → Settings → Environment Variables, o .env.local in locale):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * La anon key è pubblica per design: la sicurezza si tiene con la RLS lato DB.
 * Vedi supabase_leads.sql — sulla tabella `leads` c'è una policy che consente
 * ad anon solo l'INSERT (nessuna SELECT), così i lead non sono leggibili dal
 * pubblico ma il form può salvarli.
 */
export function getSupabaseServerClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false },
  });
}
