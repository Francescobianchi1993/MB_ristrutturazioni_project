/**
 * Generazione e download del PDF della stima, lato browser.
 *
 * react-pdf pesa parecchio (~1 MB): viene importato dinamicamente solo quando
 * l'utente clicca "Scarica", così non entra nel bundle iniziale del sito e non
 * rallenta il primo caricamento.
 */

import type { ProgettoState } from '@/lib/preventivoModel';
import type { PricingResult } from '@/sections/preventivo-v2/pricing';

/**
 * Costruisce il PDF e lo fa scaricare. Ritorna il nome del file generato.
 * Solleva l'errore al chiamante, che mostra il toast.
 */
export async function scaricaStimaPdf(
  state: ProgettoState,
  result: PricingResult,
  opts: { id?: string } = {}
): Promise<string> {
  const [{ pdf }, { default: StimaPdfDoc }, { costruisciDatiStima }, { registraFontPdf }] =
    await Promise.all([
      import('@react-pdf/renderer'),
      import('./StimaPdfDoc'),
      import('./datiStima'),
      import('./fonts'),
    ]);

  registraFontPdf();

  const dati = costruisciDatiStima(state, result, opts);
  const blob = await pdf(<StimaPdfDoc dati={dati} />).toBlob();

  const nomeFile = `${dati.riferimento.replace(/\//g, '-')}-MB-Ristrutturazioni.pdf`;
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
