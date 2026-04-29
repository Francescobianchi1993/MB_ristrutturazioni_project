/**
 * Funzione di pricing pura — dato uno stato, ritorna un risultato deterministico.
 *
 * È la stessa funzione che alimenta sia il Livello 1 (range stimato) che
 * il Livello 2 (totale puntuale). Quando il Livello 2 ha voci dettagliate
 * popolate, queste hanno la precedenza sul calcolo aggregato del macro-slot.
 */

import {
  type ProgettoState,
  type AmbienteTipo,
  type MacroSlotId,
  mqTotali,
  mqPerTipo,
  isCompletaAttiva,
} from '@/lib/preventivoModel';
import {
  MACRO_SLOT_BY_ID,
  FINITURA_MULT,
  TEMPISTICA_MULT,
  type MacroSlot,
} from './data';

export interface PricingResult {
  /** Totale centrale (mid-range) */
  totale: number;
  /** Range min-max (±15% del totale base, modulato per finitura) */
  range: { min: number; max: number };
  /** Subtotale per macro-slot (dopo finitura+tempistica) */
  perSlot: Partial<Record<MacroSlotId, number>>;
  /** Totale calcolato dalle voci dettagliate (Livello 2). 0 se non ci sono voci. */
  totaleDettagliato: number;
  /** True se ci sono voci dettagliate che sovrascrivono la stima aggregata */
  haDettaglio: boolean;
}

const RANGE_PCT = 0.15;

function calcolaSlot(state: ProgettoState, slot: MacroSlot): number {
  const config = state.macroSlot[slot.id];
  if (!config?.attivo) return 0;

  const mqApplicabili =
    slot.ambiteApplicabili === 'tutto'
      ? mqTotali(state)
      : (slot.ambiteApplicabili as AmbienteTipo[]).reduce(
          (sum, tipo) => sum + mqPerTipo(state, tipo),
          0
        );

  let basePrice = 0;

  if (slot.tariffaMq) {
    const tariffaMid = (slot.tariffaMq.min + slot.tariffaMq.max) / 2;
    basePrice = tariffaMid * mqApplicabili;
  } else if (slot.tariffaPezzo) {
    const numPorte = config.numPorte ?? 0;
    const numFinestre = config.numFinestre ?? 0;
    basePrice = numPorte * slot.tariffaPezzo.porta + numFinestre * slot.tariffaPezzo.finestra;
  } else if (slot.tariffaACorpo) {
    const corpoMid = (slot.tariffaACorpo.min + slot.tariffaACorpo.max) / 2;
    basePrice = corpoMid;
  }

  // Sotto-voci: se l'utente ha disattivato qualcuna, sottraggo il suo peso pct
  const sottoVociAttive = config.sottoVociAttive;
  const tuttePesoPct = slot.sottoVoci.reduce((sum, sv) => sum + sv.pesoPct, 0);
  const pesoAttivo = slot.sottoVoci.reduce((sum, sv) => {
    const attiva = sottoVociAttive[sv.id] ?? true;
    return attiva ? sum + sv.pesoPct : sum;
  }, 0);
  const fattorePesoSottoVoci = tuttePesoPct > 0 ? pesoAttivo / tuttePesoPct : 1;

  return basePrice * fattorePesoSottoVoci;
}

export function calcolaPrezzo(state: ProgettoState): PricingResult {
  const completaAttiva = isCompletaAttiva(state);
  const finituraMult = FINITURA_MULT[state.finitura] ?? 1;
  const tempisticaMult = TEMPISTICA_MULT[state.tempistica] ?? 1;
  const moltGlobal = finituraMult * tempisticaMult;

  const perSlot: Partial<Record<MacroSlotId, number>> = {};
  let totaleBase = 0;

  for (const slot of Object.values(MACRO_SLOT_BY_ID)) {
    // Se completa è attiva e questo slot è disabilitato in quel caso, lo skippiamo
    if (completaAttiva && slot.id !== 'completa' && slot.disabilitatoSeCompleta) {
      continue;
    }
    const sub = calcolaSlot(state, slot);
    if (sub > 0) {
      const subConMolt = sub * moltGlobal;
      perSlot[slot.id] = subConMolt;
      totaleBase += subConMolt;
    }
  }

  // Voci dettagliate (Livello 2)
  const totaleDettagliato = state.vociDettagliate.reduce(
    (sum, v) => sum + v.prezzoUnitario * v.quantita,
    0
  );
  const haDettaglio = state.vociDettagliate.length > 0;

  // Se ci sono voci dettagliate, usiamo quelle come fonte primaria
  const totale = haDettaglio ? totaleDettagliato : totaleBase;

  return {
    totale: Math.round(totale / 50) * 50, // arrotondo a 50€
    range: {
      min: Math.round((totale * (1 - RANGE_PCT)) / 50) * 50,
      max: Math.round((totale * (1 + RANGE_PCT)) / 50) * 50,
    },
    perSlot,
    totaleDettagliato,
    haDettaglio,
  };
}

export function fmt(n: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}
