/**
 * Il tasto "Indietro" del telefono dentro il configuratore.
 *
 * Il sito è una pagina sola: passare dall'Hub a un wizard, o avanzare di uno
 * step, non cambia URL e quindi per il browser non è "navigare". Risultato: il
 * tasto Indietro di Android/iOS — che è il gesto più usato su mobile — usciva
 * dal sito buttando l'utente su Google, con tutto il modulo già compilato che
 * andava perso.
 *
 * Qui ogni schermata del configuratore diventa una voce nella cronologia del
 * browser, così Indietro torna alla schermata precedente e solo dall'Hub esce
 * davvero dal sito.
 *
 * Regola da rispettare per non rompere la coerenza:
 *   - andare AVANTI (nuovo step, nuova modalità) → `apriVista` (aggiunge una voce)
 *   - andare INDIETRO (pulsante "Indietro" del sito) → `tornaIndietro` (consuma
 *     una voce). Se invece si spingesse una nuova voce anche tornando indietro,
 *     il tasto del telefono riporterebbe l'utente in AVANTI: la cronologia
 *     racconterebbe una bugia.
 *   - correggere la schermata corrente senza che sia una navigazione (es.
 *     "ricomincia", o lo slot che si occupa mentre confermi) → `sostituisciVista`
 */

import { useEffect } from 'react';

export type ModalitaVista = 'hub' | 'rapida' | 'esperto' | 'intervento' | 'certificazione';

export interface Vista {
  m: ModalitaVista;
  /** Step del wizard. L'Hub e la certificazione non ne hanno: resta 0. */
  s: number;
}

/** Chiave nostra dentro history.state: convive con altri usi della cronologia. */
const CHIAVE = 'mbVista';

function leggi(state: unknown): Vista | null {
  if (!state || typeof state !== 'object') return null;
  const v = (state as Record<string, unknown>)[CHIAVE];
  if (!v || typeof v !== 'object') return null;
  const { m, s } = v as Partial<Vista>;
  return typeof m === 'string' && typeof s === 'number' ? { m: m as ModalitaVista, s } : null;
}

/** Nuova schermata → nuova voce nella cronologia. */
export function apriVista(v: Vista): void {
  window.history.pushState({ ...(window.history.state ?? {}), [CHIAVE]: v }, '');
}

/** Cambia la schermata corrente senza aggiungere una voce. */
export function sostituisciVista(v: Vista): void {
  window.history.replaceState({ ...(window.history.state ?? {}), [CHIAVE]: v }, '');
}

/** Consuma una voce: equivale al tasto Indietro del telefono. */
export function tornaIndietro(): void {
  window.history.back();
}

/**
 * Persistenza della vista entro la SCHEDA (sessionStorage, si azzera chiudendola).
 *
 * Serve a non perdere la stima quando la scheda si ricarica: su iOS l'apertura
 * del PDF poteva navigare via dal sito e, tornando indietro, l'SPA si ricaricava
 * ripartendo dall'Hub. Ricordando qui l'ultima vista possiamo riportare l'utente
 * dov'era. La cronologia (pushState) NON sopravvive a un reload: questa è la sua
 * scorta.
 */
const SESSIONE_KEY = 'mbVistaSessione';

/** Salva la vista corrente; sull'Hub azzera (niente da ripristinare). */
export function salvaVistaSessione(v: Vista | null): void {
  try {
    if (!v || v.m === 'hub') sessionStorage.removeItem(SESSIONE_KEY);
    else sessionStorage.setItem(SESSIONE_KEY, JSON.stringify(v));
  } catch {
    /* storage non disponibile (private mode ecc.): amen, si riparte dall'Hub */
  }
}

/**
 * Vista da ripristinare al caricamento, se presente. Ripristiniamo SOLO le
 * modalità i cui dati sopravvivono a un reload — la stima rapida e quella
 * dettagliata sono guidate dallo stato persistito in localStorage. L'intervento
 * tiene lo stato del wizard in memoria locale (non persistito): ripristinarlo
 * mostrerebbe uno step vuoto, quindi lo lasciamo ripartire dall'Hub.
 */
export function leggiVistaSessione(): Vista | null {
  try {
    const raw = sessionStorage.getItem(SESSIONE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<Vista>;
    if ((v.m === 'rapida' || v.m === 'esperto') && typeof v.s === 'number') {
      return { m: v.m, s: v.s };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Ascolta il tasto Indietro. `onVista` riceve la schermata di destinazione,
 * oppure `null` quando si torna alla voce da cui il configuratore è partito:
 * in quel caso si mostra l'Hub. Dall'Hub non abbiamo voci nostre, quindi
 * Indietro esce dal sito — che è il comportamento corretto.
 */
export function useStoriaVista(onVista: (v: Vista | null) => void): void {
  useEffect(() => {
    const gestisci = (e: PopStateEvent) => onVista(leggi(e.state));
    window.addEventListener('popstate', gestisci);
    return () => window.removeEventListener('popstate', gestisci);
  }, [onVista]);
}
