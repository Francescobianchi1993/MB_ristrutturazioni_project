/**
 * Genera link firmati (temporanei) per gli allegati del form "Prenota sopralluogo".
 *
 * Il bucket `sopralluogo-files` è PRIVATO: il sito (anon) può solo caricare,
 * non leggere. Dopo l'upload il client invia qui i path dei file e riceve
 * indietro dei link firmati (validi 1 anno) da mettere nell'email del lead.
 * La firma avviene lato server con il service role → i file restano privati.
 *
 * Input (JSON):  { paths: string[] }
 * Output (JSON): { urls: (string|null)[] }
 */
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BUCKET = 'sopralluogo-files';
const SCADENZA_SEC = 60 * 60 * 24 * 365; // 1 anno
const MAX = 5;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { paths } = (await req.json()) as { paths?: string[] };
    if (!Array.isArray(paths) || paths.length === 0) return jsonResponse({ urls: [] });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const urls: (string | null)[] = [];
    for (const p of paths.slice(0, MAX)) {
      try {
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(p, SCADENZA_SEC);
        urls.push(data?.signedUrl ?? null);
      } catch {
        urls.push(null);
      }
    }
    return jsonResponse({ urls });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
