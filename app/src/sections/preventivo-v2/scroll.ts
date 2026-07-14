/**
 * Riposizionamento della vista in cima al riquadro attivo del configuratore.
 *
 * Serve soprattutto da telefono: cliccando una card dell'Hub (che sta a metà
 * pagina) il riquadro nuovo si apre sotto la posizione di scroll corrente, e
 * l'utente si ritrova a metà del form senza capire da dove cominciare. Ogni
 * livello deve quindi riportare la vista in cima quando entra in scena.
 */

import { useEffect, type RefObject } from 'react';

/**
 * Margine sopra il riquadro: la navbar è fissa e alta 80px, senza questo
 * scarto il titolo del form finirebbe nascosto sotto la barra.
 */
const OFFSET_NAVBAR = 88;

export function scrollaInCima(el: HTMLElement | null): void {
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - OFFSET_NAVBAR;
  window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
}

/**
 * Riporta la vista in cima all'elemento al montaggio e ogni volta che cambia
 * uno dei valori passati (es. lo step del wizard, o il passaggio alla
 * schermata di conferma).
 */
export function useScrollInCima(ref: RefObject<HTMLElement | null>, deps: unknown[] = []): void {
  useEffect(() => {
    scrollaInCima(ref.current);
    // Le dipendenze sono decise dal chiamante (step, conferma, …): non sono
    // statiche e la regola di eslint non può verificarle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
