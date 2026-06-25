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
  mqPerTipo,
  mqTotaliEffettivi,
  isCompletaAttiva,
  IVA_PCT,
} from '@/lib/preventivoModel';
import {
  MACRO_SLOT_BY_ID,
  FINITURA_MULT,
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
  /** Imponibile (= totale, IVA esclusa) della ristrutturazione. */
  imponibile: number;
  /** Aliquota IVA applicata: 10 (prima casa) o 22 (seconda casa). */
  ivaPct: number;
  /** Importo IVA sull'imponibile. */
  iva: number;
  /** Totale finale IVA inclusa (imponibile + iva). */
  totaleIvato: number;
}

const RANGE_PCT = 0.15;

function calcolaSlot(state: ProgettoState, slot: MacroSlot): number {
  const config = state.macroSlot[slot.id];
  if (!config?.attivo) return 0;

  const mqApplicabili =
    slot.ambiteApplicabili === 'tutto'
      // Slot "su tutta la casa": mq distribuiti se presenti, altrimenti dichiarati,
      // altrimenti default. Mai 0 → la stima non è mai 0 € quando a video ci sono m².
      ? mqTotaliEffettivi(state)
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

  // I prezzi "a pezzo" (infissi) sono già itemizzati dal conteggio porte/finestre:
  // NON applichiamo il fattore percentuale delle sotto-voci — ha senso solo per gli
  // slot a €/m². Applicarlo qui produrrebbe sconti immotivati (es. togliere "finestre
  // legno/alluminio" taglierebbe il 20% di un prezzo già contato per pezzo).
  if (slot.tariffaPezzo) {
    return basePrice;
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
  // Solo la finitura incide sul prezzo. La tempistica è informativa (non moltiplica).
  const moltGlobal = FINITURA_MULT[state.finitura] ?? 1;

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

  // Imponibile (IVA esclusa) arrotondato all'euro. L'IVA della ristrutturazione
  // dipende dal tipo di casa: 10% prima casa, 22% seconda casa.
  const imponibile = Math.round(totale);
  const ivaPct = IVA_PCT[state.tipoCasa] ?? 10;
  const iva = Math.round((imponibile * ivaPct) / 100);
  const totaleIvato = imponibile + iva;

  return {
    // Somma reale dei costi, arrotondata solo all'euro (niente più scatti da 50€,
    // così la deselezione di una voce riduce il totale dell'importo esatto e una
    // stima piccola non viene mai azzerata).
    totale: imponibile,
    range: {
      min: Math.round(totale * (1 - RANGE_PCT)),
      max: Math.round(totale * (1 + RANGE_PCT)),
    },
    perSlot,
    totaleDettagliato,
    haDettaglio,
    imponibile,
    ivaPct,
    iva,
    totaleIvato,
  };
}

export function fmt(n: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}
