/**
 * Generazione e download del PDF della stima, lato browser.
 *
 * react-pdf pesa parecchio (~1 MB): viene importato dinamicamente solo quando
 * l'utente clicca "Scarica", così non entra nel bundle iniziale del sito e non
 * rallenta il primo caricamento.
 */

import type { ProgettoState } from '@/lib/preventivoModel';
import type { PricingResult } from '@/sections/preventivo-v2/pricing';
import { supabase } from '@/lib/supabase';

/**
 * Browser "in-app" (Instagram, Facebook, TikTok…): WebView senza download
 * manager. `a.download` viene ignorato, `target=_blank` non apre nulla e gli URL
 * `blob:` non sono navigabili — il click fallisce in SILENZIO, senza sollevare
 * eccezioni, quindi nemmeno il toast di errore compare. Qui il PDF va servito
 * da un URL https vero.
 */
function isInAppBrowser(): boolean {
  return /Instagram|FBAN|FBAV|FB_IAB|Line\/|TikTok|Snapchat/i.test(navigator.userAgent || '');
}

/**
 * Carica il PDF sul bucket `preventivi` e ritorna un URL pubblico.
 * Il path contiene un UUID casuale: l'URL non è indovinabile e il bucket non ha
 * policy SELECT per `anon`, quindi non è elencabile. La stima intestata al
 * cliente resta di fatto privata.
 */
async function urlPubblicoDelPdf(blob: Blob, nomeFile: string): Promise<string | null> {
  if (!supabase) return null;
  const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${id}/${nomeFile}`;
  const { error } = await supabase.storage
    .from('preventivi')
    .upload(path, blob, { contentType: 'application/pdf', upsert: false });
  if (error) {
    console.error('[scaricaPdf] upload fallito:', error.message);
    return null;
  }
  return supabase.storage.from('preventivi').getPublicUrl(path).data.publicUrl;
}

/**
 * Costruisce il PDF e lo fa scaricare. Ritorna il nome del file generato.
 * Solleva l'errore al chiamante, che mostra il toast.
 */
export async function scaricaStimaPdf(
  state: ProgettoState,
  result: PricingResult,
  opts: { id?: string } = {}
): Promise<string> {
  let moduli;
  try {
    moduli = await Promise.all([
      import('@react-pdf/renderer'),
      import('./StimaPdfDoc'),
      import('./datiStima'),
      import('./fonts'),
    ]);
  } catch (e) {
    // Chunk da ~1 MB: su rete debole (tipico in WebView) l'import può fallire.
    console.error('[scaricaPdf] caricamento moduli fallito:', e);
    throw new Error('moduli_pdf_non_caricati');
  }

  const [{ pdf }, { default: StimaPdfDoc }, { costruisciDatiStima }, { registraFontPdf }] = moduli;

  registraFontPdf();

  const dati = costruisciDatiStima(state, result, opts);
  const blob = await pdf(<StimaPdfDoc dati={dati} />).toBlob();

  const nomeFile = `${dati.riferimento.replace(/\//g, '-')}-MB-Ristrutturazioni.pdf`;

  // WebView in-app: niente anchor, si passa da uno Storage URL navigabile.
  if (isInAppBrowser()) {
    const remoto = await urlPubblicoDelPdf(blob, nomeFile);
    if (remoto) {
      window.location.href = remoto;
      return nomeFile;
    }
    // Upload fallito: proseguiamo con l'anchor. Tentare è meglio di non fare nulla.
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeFile;
  // target/rel: su desktop l'attributo `download` ha la precedenza e il file
  // viene scaricato in loco (nessuna scheda nuova). Su iOS Safari `download` è
  // ignorato: senza target il click NAVIGAVA la scheda corrente al blob, così
  // tornando indietro il sito si ricaricava e il configuratore ripartiva da capo
  // (l'utente perdeva la stima). Con target=_blank il PDF si apre in una scheda
  // separata e quella del sito resta viva.
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Il revoke immediato può annullare il download su alcuni browser: gli diamo
  // il tempo di prendere in carico il blob.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);

  return nomeFile;
}
