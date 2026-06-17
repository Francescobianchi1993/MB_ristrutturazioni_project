/**
 * Riceve una richiesta dal form "Prenota un Sopralluogo", la SALVA su Supabase
 * (tabella lead_sopralluogo) e manda un'email di NOTIFICA all'azienda dalla
 * Gmail aziendale (stessa usata per le conferme). Gli allegati sono già stati
 * caricati dal client nel bucket privato `sopralluogo-files`: qui generiamo i
 * link firmati (1 anno) da mettere nell'email.
 *
 * Input (JSON): { nome, email, telefono, note, allegati: [{ nome, path }] }
 * Output: { ok: true } | { error }
 *
 * Filosofia: il DATABASE è l'archivio (niente richieste perse), l'email è solo
 * l'avviso. Tutto via service role → tabella e file restano privati.
 */
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const BUCKET = 'sopralluogo-files';
const SCADENZA_SEC = 60 * 60 * 24 * 365; // link validi 1 anno

interface Allegato { nome: string; path: string; }
interface Body {
  nome?: string;
  email?: string;
  telefono?: string;
  note?: string;
  allegati?: Allegato[];
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

    // 1. archivio: salva il lead (sorgente di verità)
    const { error: insErr } = await supabase.from('lead_sopralluogo').insert({
      nome: nome || null,
      email: email || null,
      telefono: telefono || null,
      note: note || null,
      allegati,
    });
    if (insErr) console.error('[sopralluogo] insert fallita:', insErr.message);

    // 2. link firmati per gli allegati
    const linkAllegati: { nome: string; url: string | null }[] = [];
    for (const a of allegati) {
      if (!a?.path) continue;
      try {
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(a.path, SCADENZA_SEC);
        linkAllegati.push({ nome: a.nome ?? a.path, url: data?.signedUrl ?? null });
      } catch {
        linkAllegati.push({ nome: a.nome ?? a.path, url: null });
      }
    }

    // 3. email di notifica (best-effort, non blocca il salvataggio)
    const user = Deno.env.get('GMAIL_USER');
    const passRaw = Deno.env.get('GMAIL_APP_PASSWORD');
    const destinatario = Deno.env.get('LEAD_EMAIL') ?? user;
    if (user && passRaw && destinatario) {
      const password = passRaw.replace(/\s/g, '');
      const righeAll = linkAllegati.length
        ? linkAllegati.map((l) => l.url
            ? `<li><a href='${l.url}'>${esc(l.nome)}</a></li>`
            : `<li>${esc(l.nome)} (link non disponibile)</li>`).join('')
        : `<li style='color:#999'>nessun allegato</li>`;
      const html = `<div style='font-family:Arial,sans-serif;max-width:560px;color:#1A1A1A'>
        <h2 style='margin:0 0 4px'>Nuova richiesta di sopralluogo</h2>
        <p style='color:#666;margin:0 0 16px'>dal sito MB Ristrutturazioni</p>
        <table style='border-collapse:collapse'>
          <tr><td style='padding:3px 14px 3px 0;color:#888'>Nome</td><td><strong>${esc(nome) || '—'}</strong></td></tr>
          <tr><td style='padding:3px 14px 3px 0;color:#888'>Email</td><td><a href='mailto:${esc(email)}'>${esc(email) || '—'}</a></td></tr>
          <tr><td style='padding:3px 14px 3px 0;color:#888'>Telefono</td><td>${esc(telefono) || '—'}</td></tr>
        </table>
        <p style='margin:16px 0 4px;color:#888'>Note</p>
        <p style='white-space:pre-wrap;margin:0'>${esc(note) || '—'}</p>
        <p style='margin:18px 0 4px;color:#888'>Allegati (${linkAllegati.length})</p>
        <ul style='margin:0'>${righeAll}</ul>
        <p style='color:#999;font-size:12px;margin-top:20px'>Richiesta salvata nel gestionale. Rispondendo a questa email scrivi direttamente al cliente.</p>
      </div>`;
      const testo = [
        'Nuova richiesta di sopralluogo',
        `Nome: ${nome || '—'}`,
        `Email: ${email || '—'}`,
        `Telefono: ${telefono || '—'}`,
        `Note: ${note || '—'}`,
        `Allegati: ${linkAllegati.map((l) => l.url ? `${l.nome}: ${l.url}` : l.nome).join(' | ') || 'nessuno'}`,
      ].join('\n');

      const client = new SMTPClient({
        connection: { hostname: 'smtp.gmail.com', port: 465, tls: true, auth: { username: user, password } },
      });
      try {
        await client.send({
          from: `Sito MB Ristrutturazioni <${user}>`,
          to: destinatario,
          replyTo: email || user,
          subject: `Nuova richiesta sopralluogo — ${nome || 'cliente'}`,
          content: testo,
          html,
        });
      } catch (e) {
        console.error('[sopralluogo] email fallita:', e instanceof Error ? e.message : String(e));
      } finally {
        try { await client.close(); } catch { /* best-effort */ }
      }
    }

    return jsonResponse({ ok: true });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
