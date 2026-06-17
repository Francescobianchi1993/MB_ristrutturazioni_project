/**
 * Recupero password del mini-gestionale: invia la password ATTUALE (secret
 * ADMIN_PASSWORD) SOLO alla mail aziendale fissa (GMAIL_USER / LEAD_EMAIL).
 * Non accetta indirizzi dall'esterno → chi clicca "password dimenticata" non
 * può farsela mandare altrove: la riceve solo chi controlla la casella MB.
 *
 * Output: { ok: true } | { error }
 */
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const pw = Deno.env.get('ADMIN_PASSWORD');
    const user = Deno.env.get('GMAIL_USER');
    const passRaw = Deno.env.get('GMAIL_APP_PASSWORD');
    const destinatario = Deno.env.get('LEAD_EMAIL') ?? user;
    if (!pw) return jsonResponse({ error: 'non_configurato' }, 503);
    if (!user || !passRaw || !destinatario) return jsonResponse({ error: 'email_non_configurata' }, 503);

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
    return jsonResponse({ ok: true, destinatario });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
