/**
 * Registrazione dei font per i PDF generati lato client.
 *
 * Sono gli stessi due font del sito (Playfair Display + Inter), ma react-pdf
 * ha bisogno dei file .ttf veri: non può usare il CSS di Google Fonts. I file
 * stanno in `public/fonts/` e vengono serviti dallo stesso dominio, così la
 * generazione del PDF non dipende da una rete esterna.
 */

import { Font } from '@react-pdf/renderer';

let registrati = false;

/**
 * @param base cartella dei .ttf. In browser è un path servito ('/fonts');
 *             in Node (script di test) può essere una directory assoluta.
 */
export function registraFontPdf(base = '/fonts'): void {
  if (registrati) return;

  Font.register({
    family: 'Inter',
    fonts: [
      { src: `${base}/Inter-Regular.ttf`, fontWeight: 400 },
      { src: `${base}/Inter-SemiBold.ttf`, fontWeight: 600 },
      { src: `${base}/Inter-Bold.ttf`, fontWeight: 700 },
    ],
  });

  Font.register({
    family: 'Playfair',
    fonts: [
      { src: `${base}/Playfair-Regular.ttf`, fontWeight: 400 },
      { src: `${base}/Playfair-Bold.ttf`, fontWeight: 700 },
      { src: `${base}/Playfair-Italic.ttf`, fontWeight: 400, fontStyle: 'italic' },
      { src: `${base}/Playfair-BoldItalic.ttf`, fontWeight: 700, fontStyle: 'italic' },
    ],
  });

  // Sillabazione disattivata: l'algoritmo di default è inglese e spezzerebbe
  // le parole italiane in punti sbagliati ("riscalda-mento").
  Font.registerHyphenationCallback((word) => [word]);

  registrati = true;
}
