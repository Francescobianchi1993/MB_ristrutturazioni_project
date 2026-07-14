/**
 * Riceve una richiesta dal form "Prenota un Sopralluogo", la SALVA su Supabase
 * (tabella lead_sopralluogo) e manda un'email di NOTIFICA all'azienda dalla
 * Gmail aziendale. L'email è "ibrida": mostra nome/telefono/email/note + numero
 * allegati, e un bottone "Apri richiesta" che porta al mini-gestionale (?admin)
 * dove si vede tutto con la galleria allegati.
 *
 * Input (JSON): { nome, email, telefono, note, allegati: [{ nome, path }] }
 * Filosofia: DB = archivio, email = avviso. Tutto via service role.
 */
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
import { EMAIL_PUBBLICA, destinatarioLead } from '../_shared/contatti.ts';

interface Allegato { nome: string; path: string; }
interface Body {
  nome?: string; email?: string; telefono?: string; note?: string; allegati?: Allegato[];
}

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const b = (await req.json()) as Body;
    const nome = (b.nome ?? '').trim();
    const email = (b.email ?? '').trim();
    const telefono = (b.telefono ?? '').trim();
    const note = (b.note ?? '').trim();
    const allegati = Array.isArray(b.allegati) ? b.allegati.slice(0, 5) : [];

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: row, error: insErr } = await supabase.from('lead_sopralluogo').insert({
      nome: nome || null,
      email: email || null,
      telefono: telefono || null,
      note: note || null,
      allegati,
    }).select('id').single();
    if (insErr) console.error('[sopralluogo] insert fallita:', insErr.message);
    const dbOk = !insErr && !!row;
    const id = row?.id ?? null;
    // Traccia se la notifica email è andata a buon fine: se NÉ il DB NÉ l'email
    // funzionano, il lead sarebbe perso in silenzio → in quel caso rispondiamo
    // 500 così il sito mostra il fallback (telefono), invece di "Inviato!".
    let mailOk = false;

    const user = Deno.env.get('GMAIL_USER');
    const passRaw = Deno.env.get('GMAIL_APP_PASSWORD');
    const destinatario = destinatarioLead();
    const base = Deno.env.get('SITE_URL') ?? 'https://mb-ristrutturazioni-project.vercel.app';
    const adminUrl = id ? `${base}/?admin=1&lead=${id}` : `${base}/?admin=1`;

    if (user && passRaw && destinatario) {
      const password = passRaw.replace(/\s/g, '');
      const notePreview = note ? (note.length > 140 ? note.slice(0, 140) + '…' : note) : '—';
      const html = `<div style='font-family:Arial,sans-serif;max-width:520px;color:#1A1A1A'>
        <h2 style='margin:0 0 2px'>Nuova richiesta di sopralluogo</h2>
        <p style='color:#666;margin:0 0 16px'>${esc(nome) || 'cliente'}${telefono ? ' · ' + esc(telefono) : ''}</p>
        <table style='border-collapse:collapse;font-size:14px'>
          <tr><td style='padding:3px 14px 3px 0;color:#888'>Telefono</td><td><strong>${esc(telefono) || '—'}</strong></td></tr>
          <tr><td style='padding:3px 14px 3px 0;color:#888'>Email</td><td>${esc(email) || '—'}</td></tr>
          <tr><td style='padding:3px 14px 3px 0;color:#888'>Allegati</td><td>${allegati.length}</td></tr>
        </table>
        <p style='margin:14px 0 4px;color:#888;font-size:14px'>Note</p>
        <p style='white-space:pre-wrap;margin:0;font-size:14px'>${esc(notePreview)}</p>
        <div style='margin:22px 0 6px'>
          <a href='${adminUrl}' style='display:inline-block;background:#1A1A1A;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px'>Apri richiesta nel gestionale →</a>
        </div>
        <p style='color:#999;font-size:12px;margin-top:14px'>Lì trovi tutti i dati e gli allegati. Rispondendo a questa email scrivi direttamente al cliente.</p>
      </div>`;
      // Elenchiamo nome+path degli allegati nel testo: se l'INSERT su DB fallisce
      // (dbOk=false) il link al gestionale è "morto", ma dai path l'azienda può
      // comunque recuperare i file dal bucket → il lead non va perso in silenzio.
      const allegatiTxt = allegati.length
        ? allegati.map((a) => `  - ${a.nome} (${a.path})`).join('\n')
        : '—';
      const testo = [
        'Nuova richiesta di sopralluogo',
        `Nome: ${nome || '—'}`,
        `Telefono: ${telefono || '—'}`,
        `Email: ${email || '—'}`,
        `Allegati (${allegati.length}):`,
        allegatiTxt,
        `Note: ${note || '—'}`,
        `Apri nel gestionale: ${adminUrl}`,
        dbOk ? '' : '⚠️ NB: archiviazione su gestionale non riuscita — usa i path qui sopra per recuperare gli allegati.',
      ].filter(Boolean).join('\n');

      const client = new SMTPClient({
        connection: { hostname: 'smtp.gmail.com', port: 465, tls: true, auth: { username: user, password } },
      });
      try {
        await client.send({
          from: `Sito MB Ristrutturazioni <${user}>`,
          to: destinatario,
          replyTo: email || EMAIL_PUBBLICA,
          subject: `Nuova richiesta sopralluogo — ${nome || 'cliente'}`,
          content: testo,
          html,
        });
        mailOk = true;
      } catch (e) {
        console.error('[sopralluogo] email fallita:', e instanceof Error ? e.message : String(e));
      } finally {
        try { await client.close(); } catch { /* best-effort */ }
      }
    }

    // Il lead è "salvo" se almeno un canale ha funzionato (DB o email all'azienda).
    // Se entrambi falliscono NON diciamo "ok": il sito mostrerà il fallback.
    if (!dbOk && !mailOk) {
      return jsonResponse({ error: 'salvataggio_fallito' }, 500);
    }
    return jsonResponse({ ok: true, id });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
