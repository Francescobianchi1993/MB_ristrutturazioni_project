/**
 * Recupero password del mini-gestionale: invia la password ATTUALE (secret
 * ADMIN_PASSWORD) SOLO alla mail aziendale fissa (vedi `_shared/contatti.ts`).
 * Non accetta indirizzi dall'esterno → chi clicca "password dimenticata" non
 * può farsela mandare altrove: la riceve solo chi controlla la casella MB.
 *
 * Output: { ok: true } | { error }
 */
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
import { registraTentativo, tentativiRecenti } from '../_shared/ratelimit.ts';
import { destinatarioLead } from '../_shared/contatti.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Throttle: max 3 invii/ora complessivi. L'email va sempre e solo alla casella
    // aziendale fissa, quindi un throttle globale evita il flooding della inbox e
    // l'esaurimento della quota SMTP condivisa con le email di conferma, senza
    // penalizzare l'uso legittimo. Oltre la soglia rispondiamo ok senza inviare.
    if (await tentativiRecenti(supabase, 'recupera-pw', 3600) >= 3) {
      return jsonResponse({ ok: true });
    }

    const { data: cfg } = await supabase.from('app_config').select('valore').eq('chiave', 'admin_password').single();
    const pw = cfg?.valore ?? Deno.env.get('ADMIN_PASSWORD');
    const user = Deno.env.get('GMAIL_USER');
    const passRaw = Deno.env.get('GMAIL_APP_PASSWORD');
    const destinatario = destinatarioLead();
    if (!pw) return jsonResponse({ error: 'non_configurato' }, 503);
    if (!user || !passRaw || !destinatario) return jsonResponse({ error: 'email_non_configurata' }, 503);

    await registraTentativo(supabase, 'recupera-pw', 3600);
    const password = passRaw.replace(/\s/g, '');
    const client = new SMTPClient({
      connection: { hostname: 'smtp.gmail.com', port: 465, tls: true, auth: { username: user, password } },
    });
    try {
      await client.send({
        from: `Gestionale MB <${user}>`,
        to: destinatario,
        subject: 'Password del gestionale richieste',
        content:
          `La password per accedere al gestionale richieste (…/?admin=1) è:\n\n${pw}\n\n` +
          `Se NON hai richiesto tu questo promemoria, ignora questa email. ` +
          `Per cambiarla: pannello Supabase → Project Settings → Edge Functions → Secrets → ADMIN_PASSWORD.`,
        html:
          `<div style='font-family:Arial,sans-serif;color:#1A1A1A'>` +
          `<p>La password per accedere al <strong>gestionale richieste</strong> (…/?admin=1) è:</p>` +
          `<p style='font-size:20px;font-weight:bold;letter-spacing:1px'>${pw}</p>` +
          `<p style='color:#888;font-size:13px'>Se non hai richiesto tu questo promemoria, ignora l'email. ` +
          `Per cambiarla: Supabase → Project Settings → Edge Functions → Secrets → ADMIN_PASSWORD.</p></div>`,
      });
    } finally {
      try { await client.close(); } catch { /* best-effort */ }
    }
    // Non restituiamo `destinatario`: è l'indirizzo aziendale interno e non
    // deve trapelare a un chiamante non autenticato.
    return jsonResponse({ ok: true });
  } catch (e) {
    console.error('[recupera-password-admin] errore:', e instanceof Error ? e.message : String(e));
    return jsonResponse({ error: 'errore_interno' }, 500);
  }
});
