/**
 * "Password dimenticata" del gestionale — RESET sicuro.
 *
 * La password è salvata come HASH (app_config.admin_password_hash) e non è
 * recuperabile. Quindi qui GENERIAMO una nuova password, ne salviamo l'hash e
 * inviamo quella nuova SOLO alla mail aziendale fissa (vedi `_shared/contatti.ts`):
 * chi clicca "password dimenticata" non può farsela mandare altrove: la riceve
 * solo chi controlla la casella MB. La password precedente smette di funzionare.
 *
 * Output: { ok: true } | { error }
 */
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
import { registraTentativo, tentativiRecenti } from '../_shared/ratelimit.ts';
import { destinatarioLead } from '../_shared/contatti.ts';
import { hashPassword, generaPassword } from '../_shared/password.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Throttle: max 3 reset/ora complessivi. Oltre la soglia rispondiamo ok senza
    // fare nulla (niente flooding della inbox né reset a raffica della password).
    if (await tentativiRecenti(supabase, 'recupera-pw', 3600) >= 3) {
      return jsonResponse({ ok: true });
    }

    const user = Deno.env.get('GMAIL_USER');
    const passRaw = Deno.env.get('GMAIL_APP_PASSWORD');
    const destinatario = destinatarioLead();
    if (!user || !passRaw || !destinatario) return jsonResponse({ error: 'email_non_configurata' }, 503);

    await registraTentativo(supabase, 'recupera-pw', 3600);

    // Nuova password → salviamo solo il suo HASH, poi la inviamo in chiaro una
    // volta sola via email. Rimuoviamo l'eventuale plaintext legacy.
    const nuova = generaPassword();
    const hash = await hashPassword(nuova);
    const { error: upErr } = await supabase
      .from('app_config').upsert({ chiave: 'admin_password_hash', valore: hash }, { onConflict: 'chiave' });
    if (upErr) { console.error('[recupera] salvataggio hash fallito:', upErr.message); return jsonResponse({ error: 'errore_interno' }, 500); }
    await supabase.from('app_config').delete().eq('chiave', 'admin_password');

    const password = passRaw.replace(/\s/g, '');
    const client = new SMTPClient({
      connection: { hostname: 'smtp.gmail.com', port: 465, tls: true, auth: { username: user, password } },
    });
    try {
      await client.send({
        from: `Gestionale MB <${user}>`,
        to: destinatario,
        subject: 'Nuova password del gestionale',
        content:
          `È stata generata una NUOVA password per accedere al gestionale (…/?admin=1):\n\n${nuova}\n\n` +
          `La password precedente non è più valida. Se NON hai richiesto tu il reset, ` +
          `rigenerane un'altra dalla stessa schermata ("password dimenticata").`,
        html:
          `<div style='font-family:Arial,sans-serif;color:#1A1A1A'>` +
          `<p>È stata generata una <strong>nuova password</strong> per accedere al gestionale (…/?admin=1):</p>` +
          `<p style='font-size:20px;font-weight:bold;letter-spacing:1px'>${nuova}</p>` +
          `<p style='color:#888;font-size:13px'>La password precedente non è più valida. ` +
          `Se non hai richiesto tu il reset, rigenerane un'altra dalla stessa schermata.</p></div>`,
      });
    } finally {
      try { await client.close(); } catch { /* best-effort */ }
    }
    return jsonResponse({ ok: true });
  } catch (e) {
    console.error('[recupera-password-admin] errore:', e instanceof Error ? e.message : String(e));
    return jsonResponse({ error: 'errore_interno' }, 500);
  }
});
