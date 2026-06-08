/**
 * Invio email di conferma al cliente via Gmail SMTP (account società).
 *
 * Best-effort: senza secret esce in silenzio (la prenotazione resta valida).
 * Si attiva impostando:
 *   GMAIL_USER          — indirizzo Gmail mittente (es. mbristrutturazioniroma@gmail.com)
 *   GMAIL_APP_PASSWORD  — "Password per le app" Gmail (16 char, no password normale)
 *
 * L'email parte DALLA Gmail società: il cliente vede MB come mittente e le
 * risposte tornano lì. Tutto il contenuto è qui, nessun template esterno.
 */
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

export interface DatiEmail {
  email: string;
  nome: string;
  tipo: string;
  urgenza: string;
  voci: { voce: string; prezzo: number }[];
  vociCustom: string[];
  dataISO: string;
  ora: string;
  totale: number;
}

function dataLeggibile(iso: string): string {
  try {
    const d = new Date(`${iso}T12:00:00`);
    return new Intl.DateTimeFormat('it-IT', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      timeZone: 'Europe/Rome',
    }).format(d);
  } catch {
    return iso.split('-').reverse().join('/');
  }
}

function corpoHtml(d: DatiEmail): string {
  const quando = dataLeggibile(d.dataISO);
  const righeVoci = d.voci
    .map((v) => `<tr><td style="padding:2px 0;color:#444">${v.voce}</td><td style="padding:2px 0;text-align:right;color:#666">€ ${v.prezzo}</td></tr>`)
    .join('');
  const righeCustom = d.vociCustom
    .map((c) => `<tr><td style="padding:2px 0;color:#444">${c}</td><td style="padding:2px 0;text-align:right;color:#999">da definire</td></tr>`)
    .join('');
  const bloccoVoci = d.voci.length || d.vociCustom.length
    ? `<table style="width:100%;border-collapse:collapse;margin:8px 0 16px">${righeVoci}${righeCustom}</table>`
    : '';

  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1A1A1A">
  <div style="background:#1A1A1A;padding:20px 24px;border-radius:16px 16px 0 0">
    <span style="color:#F5B800;font-size:20px;font-weight:bold">MB Ristrutturazioni</span>
  </div>
  <div style="border:1px solid #eee;border-top:none;border-radius:0 0 16px 16px;padding:24px">
    <h2 style="margin:0 0 8px">Prenotazione confermata ✅</h2>
    <p style="color:#444">Ciao ${d.nome || 'gentile cliente'}, abbiamo registrato la tua richiesta di intervento <strong>${d.tipo}</strong>.</p>
    <table style="border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:4px 16px 4px 0;color:#888">Quando</td><td style="text-transform:capitalize"><strong>${quando}</strong> alle <strong>${d.ora}</strong></td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:#888">Urgenza</td><td>${d.urgenza === 'alta' ? 'Alta (prioritario)' : 'Normale'}</td></tr>
    </table>
    ${bloccoVoci}
    <div style="border-top:1px solid #eee;padding-top:12px;display:flex;justify-content:space-between">
      <span style="color:#888">Totale stimato</span>
      <strong style="color:#F5B800;font-size:18px">€ ${d.totale.toFixed(2)}</strong>
    </div>
    <p style="color:#444;margin-top:20px">Ti contatteremo a breve per confermare l'appuntamento. Per qualsiasi cosa rispondi pure a questa email.</p>
    <p style="color:#999;font-size:12px;margin-top:24px">Stima orientativa, confermata dopo sopralluogo gratuito. MB Ristrutturazioni · Roma</p>
  </div>
</div>`;
}

function corpoTesto(d: DatiEmail): string {
  return [
    'Prenotazione confermata — MB Ristrutturazioni',
    `Ciao ${d.nome || 'gentile cliente'},`,
    `intervento ${d.tipo} registrato per ${dataLeggibile(d.dataISO)} alle ${d.ora}.`,
    `Totale stimato: € ${d.totale.toFixed(2)}.`,
    'Ti contatteremo a breve per confermare. Grazie!',
  ].join('\n');
}

export async function inviaEmailConferma(d: DatiEmail): Promise<void> {
  const user = Deno.env.get('GMAIL_USER');
  const passRaw = Deno.env.get('GMAIL_APP_PASSWORD');
  if (!user || !passRaw || !d.email) return;
  const password = passRaw.replace(/\s/g, ''); // le app password si copiano con spazi

  const client = new SMTPClient({
    connection: {
      hostname: 'smtp.gmail.com',
      port: 465,
      tls: true,
      auth: { username: user, password },
    },
  });
  try {
    await client.send({
      from: `MB Ristrutturazioni <${user}>`,
      to: d.email,
      replyTo: user,
      subject: 'Conferma appuntamento — MB Ristrutturazioni',
      content: corpoTesto(d),
      html: corpoHtml(d),
    });
  } catch (e) {
    console.error('[email] invio fallito:', e instanceof Error ? e.message : String(e));
  } finally {
    try {
      await client.close();
    } catch {
      // chiusura best-effort
    }
  }
}
