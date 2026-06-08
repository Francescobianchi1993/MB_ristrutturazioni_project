/**
 * Invio messaggio WhatsApp di conferma al cliente via Meta Cloud API.
 *
 * Best-effort e "graceful": se i secret non sono configurati la funzione esce
 * in silenzio (la prenotazione resta valida). Si attiva quando si impostano:
 *   WHATSAPP_TOKEN            — token permanente (System User) della Cloud API
 *   WHATSAPP_PHONE_NUMBER_ID  — id del numero mittente (Business)
 *   WHATSAPP_TEMPLATE         — nome del template approvato (default sotto)
 *   WHATSAPP_TEMPLATE_LANG    — codice lingua del template (default 'it')
 *
 * Il template deve avere 4 variabili nel BODY, nell'ordine:
 *   {{1}}=nome  {{2}}=tipo  {{3}}=data  {{4}}=ora
 */

const GRAPH_VERSION = 'v21.0';

interface DatiWhatsApp {
  telefono: string;
  nome: string;
  tipo: string;
  data: string;
  ora: string;
}

/** Normalizza un numero italiano in formato Cloud API (cifre con prefisso paese). */
function normalizzaNumero(raw: string): string | null {
  let n = raw.replace(/[^\d]/g, '');
  if (!n) return null;
  if (n.startsWith('00')) n = n.slice(2);
  if (n.length === 10 && n.startsWith('3')) return `39${n}`; // mobile IT locale
  return n; // già con prefisso internazionale (o landline)
}

export async function inviaWhatsApp(d: DatiWhatsApp): Promise<void> {
  const token = Deno.env.get('WHATSAPP_TOKEN');
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  if (!token || !phoneNumberId) return; // non configurato → skip

  const to = normalizzaNumero(d.telefono);
  if (!to) return;

  const template = Deno.env.get('WHATSAPP_TEMPLATE') ?? 'conferma_prenotazione';
  const lang = Deno.env.get('WHATSAPP_TEMPLATE_LANG') ?? 'it';

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: template,
          language: { code: lang },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: d.nome },
                { type: 'text', text: d.tipo },
                { type: 'text', text: d.data },
                { type: 'text', text: d.ora },
              ],
            },
          ],
        },
      }),
    });
    if (!res.ok) console.error('[whatsapp] invio fallito:', res.status, await res.text());
  } catch (e) {
    console.error('[whatsapp] errore:', e instanceof Error ? e.message : String(e));
  }
}
