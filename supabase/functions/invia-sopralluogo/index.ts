/**
 * Riceve le richieste dei tre form del sito (contatti, sopralluogo dal
 * configuratore, certificazione), le SALVA su Supabase (tabella lead_sopralluogo)
 * e manda DUE email dalla Gmail aziendale:
 *
 *   1. all'AZIENDA  — notifica con i dati del cliente + link al gestionale
 *   2. al CLIENTE   — conferma "abbiamo ricevuto la tua richiesta"
 *
 * La conferma al cliente è best-effort: se fallisce, la richiesta resta comunque
 * registrata e l'azienda è stata avvisata — non ha senso dire al cliente che
 * l'invio è fallito quando invece è andato a buon fine.
 *
 * Input (JSON): { nome, email, telefono, note, allegati: [{ nome, path }], tipo? }
 *   tipo: 'contatto' | 'sopralluogo' | 'certificazione' (default: 'sopralluogo')
 * Filosofia: DB = archivio, email = avviso. Tutto via service role.
 */
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
import { EMAIL_PUBBLICA, RAGIONE_SOCIALE, TEL_DISPLAY, destinatarioLead } from '../_shared/contatti.ts';

interface Allegato { nome: string; path: string; }
type TipoRichiesta = 'contatto' | 'sopralluogo' | 'certificazione';
interface Body {
  nome?: string; email?: string; telefono?: string; note?: string;
  allegati?: Allegato[]; tipo?: string;
}

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Normalizza il tipo. I form vecchi (o una cache del browser non ancora
 * aggiornata) non mandano `tipo`: in quel caso lo deduciamo dal prefisso che il
 * frontend scrive nelle note, così la conferma resta pertinente.
 */
function normalizzaTipo(tipo: string | undefined, note: string): TipoRichiesta {
  if (tipo === 'contatto' || tipo === 'sopralluogo' || tipo === 'certificazione') return tipo;
  if (/CERTIFICAZIONE/i.test(note)) return 'certificazione';
  if (/configuratore preventivo/i.test(note)) return 'sopralluogo';
  return 'contatto';
}

const OGGETTO_RICHIESTA: Record<TipoRichiesta, string> = {
  contatto: 'la tua richiesta di contatto',
  sopralluogo: 'la tua richiesta di sopralluogo gratuito',
  certificazione: 'la tua richiesta di certificazione',
};

const PROSSIMO_PASSO: Record<TipoRichiesta, string> = {
  contatto: 'Un nostro tecnico la esaminerà e ti ricontatteremo al più presto ai recapiti che ci hai lasciato.',
  sopralluogo:
    'Un nostro tecnico la esaminerà e ti ricontatteremo al più presto per concordare data e orario del sopralluogo, che è gratuito e senza impegno.',
  certificazione:
    'Un nostro tecnico la esaminerà e ti ricontatteremo al più presto per verificare i dettagli e indicarti tempi e costi.',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const b = (await req.json()) as Body;
    const nome = (b.nome ?? '').trim();
    const email = (b.email ?? '').trim();
    const telefono = (b.telefono ?? '').trim();
    const note = (b.note ?? '').trim();
    const allegati = Array.isArray(b.allegati) ? b.allegati.slice(0, 5) : [];
    const tipo = normalizzaTipo(b.tipo, note);

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
      const titoloAzienda =
        tipo === 'certificazione'
          ? 'Nuova richiesta di certificazione'
          : tipo === 'contatto'
            ? 'Nuovo contatto dal sito'
            : 'Nuova richiesta di sopralluogo';
      const html = `<div style='font-family:Arial,sans-serif;max-width:520px;color:#1A1A1A'>
        <h2 style='margin:0 0 2px'>${titoloAzienda}</h2>
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
        titoloAzienda,
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
          subject: `${titoloAzienda} — ${nome || 'cliente'}`,
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

    // Conferma al CLIENTE — best-effort: un fallimento qui non deve trasformare
    // in errore una richiesta che è stata registrata e notificata all'azienda.
    if (user && passRaw && email) {
      const password = passRaw.replace(/\s/g, '');
      const saluto = nome ? `Gentile ${esc(nome)},` : 'Gentile cliente,';
      const oggetto = OGGETTO_RICHIESTA[tipo];
      const passo = PROSSIMO_PASSO[tipo];

      const htmlCliente = `<div style='font-family:Arial,Helvetica,sans-serif;max-width:520px;color:#1A1A1A;line-height:1.55'>
        <div style='border-left:4px solid #F5B800;padding-left:14px;margin-bottom:22px'>
          <h2 style='margin:0 0 4px;font-size:20px'>Abbiamo ricevuto la tua richiesta</h2>
          <p style='margin:0;color:#666;font-size:14px'>${RAGIONE_SOCIALE}</p>
        </div>
        <p style='margin:0 0 12px;font-size:15px'>${saluto}</p>
        <p style='margin:0 0 12px;font-size:15px'>ti confermiamo di aver ricevuto ${oggetto}. ${passo}</p>
        <table style='border-collapse:collapse;font-size:14px;background:#FAFAFA;border-radius:8px;padding:8px;margin:18px 0'>
          <tr><td style='padding:6px 16px 6px 12px;color:#888'>Nome</td><td style='padding:6px 12px 6px 0'><strong>${esc(nome) || '—'}</strong></td></tr>
          <tr><td style='padding:6px 16px 6px 12px;color:#888'>Telefono</td><td style='padding:6px 12px 6px 0'>${esc(telefono) || '—'}</td></tr>
          <tr><td style='padding:6px 16px 6px 12px;color:#888'>Email</td><td style='padding:6px 12px 6px 0'>${esc(email)}</td></tr>
          ${allegati.length ? `<tr><td style='padding:6px 16px 6px 12px;color:#888'>Allegati</td><td style='padding:6px 12px 6px 0'>${allegati.length}</td></tr>` : ''}
        </table>
        <p style='margin:0 0 6px;font-size:15px'>Se nel frattempo hai bisogno di aggiungere qualcosa, puoi rispondere direttamente a questa email oppure chiamarci al <strong>${TEL_DISPLAY}</strong>.</p>
        <p style='margin:22px 0 0;font-size:15px'>Un cordiale saluto,<br><strong>${RAGIONE_SOCIALE}</strong></p>
        <p style='color:#999;font-size:12px;margin-top:20px;border-top:1px solid #EEE;padding-top:12px'>Questo messaggio conferma solo la ricezione della richiesta e non costituisce un preventivo.</p>
      </div>`;

      const testoCliente = [
        `${nome ? `Gentile ${nome},` : 'Gentile cliente,'}`,
        '',
        `ti confermiamo di aver ricevuto ${oggetto}. ${passo}`,
        '',
        'Riepilogo:',
        `  Nome: ${nome || '—'}`,
        `  Telefono: ${telefono || '—'}`,
        `  Email: ${email}`,
        allegati.length ? `  Allegati: ${allegati.length}` : '',
        '',
        `Per qualsiasi cosa puoi rispondere a questa email o chiamarci al ${TEL_DISPLAY}.`,
        '',
        'Un cordiale saluto,',
        RAGIONE_SOCIALE,
      ].filter((r) => r !== '').join('\n');

      const clientCliente = new SMTPClient({
        connection: { hostname: 'smtp.gmail.com', port: 465, tls: true, auth: { username: user, password } },
      });
      try {
        await clientCliente.send({
          from: `${RAGIONE_SOCIALE} <${user}>`,
          to: email,
          replyTo: EMAIL_PUBBLICA,
          subject: `Abbiamo ricevuto la tua richiesta — ${RAGIONE_SOCIALE}`,
          content: testoCliente,
          html: htmlCliente,
        });
      } catch (e) {
        console.error('[sopralluogo] conferma al cliente fallita:', e instanceof Error ? e.message : String(e));
      } finally {
        try { await clientCliente.close(); } catch { /* best-effort */ }
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
