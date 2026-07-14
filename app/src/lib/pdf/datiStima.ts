/**
 * Proiezione dello stato del configuratore nei dati che finiscono sul PDF.
 *
 * Funzione pura: `ProgettoState` + `PricingResult` → `DatiStimaPdf`. Tutto ciò
 * che il documento deve stampare è calcolato qui, così il componente PDF è
 * solo layout e può essere testato con dati finti.
 *
 * Nota sui numeri: il PDF non introduce nessun calcolo proprio. Importi, IVA e
 * range sono esattamente quelli che l'utente vede a schermo (`calcolaPrezzo`).
 */

import {
  IVA_PCT,
  mqTotaliEffettivi,
  type MacroSlotId,
  type ProgettoState,
} from '@/lib/preventivoModel';
import { FINITURE, MACRO_SLOT_BY_ID, TEMPISTICHE } from '@/sections/preventivo-v2/data';
import type { PricingResult } from '@/sections/preventivo-v2/pricing';

/** Giorni di validità della stima, come sul preventivo cartaceo di MB. */
export const VALIDITA_GIORNI = 20;

export interface VoceIntervento {
  /** Numero progressivo mostrato sulla card ("01", "02", …) */
  numero: string;
  titolo: string;
  sottotitolo: string;
  /** Le lavorazioni incluse — le sotto-voci che l'utente ha lasciato attive */
  lavorazioni: string[];
  importo: number;
  /** Quota percentuale sull'imponibile, arrotondata */
  pct: number;
}

export interface DatiStimaPdf {
  riferimento: string;
  dataEmissione: string;
  cliente: string | null;
  localita: string;
  /** Titolo di copertina, spezzato in due righe (la seconda è in corsivo giallo) */
  titoloRiga1: string;
  titoloRiga2: string;
  descrizione: string;
  interventi: VoceIntervento[];
  ambienti: { nome: string; mq: number }[];
  mq: number;
  finitura: string;
  tempistica: string;
  tipoCasa: 'prima' | 'seconda';
  imponibile: number;
  ivaPct: number;
  iva: number;
  totaleIvato: number;
  rangeMin: number;
  rangeMax: number;
  validitaGiorni: number;
}

/** Hash stabile (FNV-1a) → stesso stato, stesso numero di riferimento. */
function hash4(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).toUpperCase().padStart(4, '0').slice(0, 4);
}

function formattaData(d: Date): string {
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/**
 * Ricava le righe di dettaglio dai macro-slot attivi (stima rapida) oppure,
 * se l'utente è passato dal preventivo dettagliato, dalle voci puntuali
 * raggruppate per categoria.
 */
function costruisciInterventi(state: ProgettoState, result: PricingResult): VoceIntervento[] {
  const righe: { titolo: string; sottotitolo: string; lavorazioni: string[]; importo: number }[] = [];

  if (result.haDettaglio) {
    const perCategoria = new Map<string, { importo: number; voci: string[] }>();
    for (const v of state.vociDettagliate) {
      const acc = perCategoria.get(v.categoria) ?? { importo: 0, voci: [] };
      acc.importo += v.prezzoUnitario * v.quantita;
      acc.voci.push(v.voce);
      perCategoria.set(v.categoria, acc);
    }
    for (const [categoria, { importo, voci }] of perCategoria) {
      righe.push({
        titolo: categoria,
        sottotitolo: `${voci.length} ${voci.length === 1 ? 'lavorazione' : 'lavorazioni'}`,
        // Il PDF è un riepilogo, non un computo: oltre 6 voci diventa illeggibile.
        lavorazioni: voci.slice(0, 6),
        importo,
      });
    }
  } else {
    for (const id of Object.keys(result.perSlot) as MacroSlotId[]) {
      const importo = result.perSlot[id] ?? 0;
      if (importo <= 0) continue;
      const slot = MACRO_SLOT_BY_ID[id];
      if (!slot) continue;
      const config = state.macroSlot[id];
      const lavorazioni = slot.sottoVoci
        .filter((sv) => config?.sottoVociAttive[sv.id] ?? true)
        .map((sv) => `${sv.label} — ${sv.descBreve.toLowerCase()}`);
      righe.push({
        titolo: slot.label,
        sottotitolo: slot.desc,
        lavorazioni,
        importo,
      });
    }
  }

  righe.sort((a, b) => b.importo - a.importo);

  const totale = righe.reduce((s, r) => s + r.importo, 0);
  return righe.map((r, i) => ({
    numero: String(i + 1).padStart(2, '0'),
    titolo: r.titolo,
    sottotitolo: r.sottotitolo,
    lavorazioni: r.lavorazioni,
    importo: Math.round(r.importo),
    pct: totale > 0 ? Math.round((r.importo / totale) * 100) : 0,
  }));
}

function costruisciTitolo(
  state: ProgettoState,
  interventi: VoceIntervento[]
): { titoloRiga1: string; titoloRiga2: string } {
  if (state.macroSlot.completa?.attivo) {
    return { titoloRiga1: 'Ristrutturazione', titoloRiga2: 'Completa' };
  }
  if (interventi.length === 1) {
    return { titoloRiga1: 'Rifacimento', titoloRiga2: interventi[0].titolo };
  }
  return { titoloRiga1: 'Ristrutturazione', titoloRiga2: 'su misura' };
}

export function costruisciDatiStima(
  state: ProgettoState,
  result: PricingResult,
  opts: { id?: string; adesso?: Date } = {}
): DatiStimaPdf {
  const adesso = opts.adesso ?? new Date();
  const interventi = costruisciInterventi(state, result);

  // Se la stima è già stata salvata (link condiviso) il riferimento deriva dal
  // suo uuid, così PDF e link parlano dello stesso documento. Altrimenti è un
  // hash dello stato: scaricando due volte la stessa stima esce lo stesso numero.
  const suffisso = opts.id
    ? opts.id.replace(/-/g, '').slice(0, 4).toUpperCase()
    : hash4(JSON.stringify({ m: state.macroSlot, a: state.ambienti, f: state.finitura }));

  const finitura = FINITURE.find((f) => f.id === state.finitura)?.label ?? state.finitura;
  const tempistica = TEMPISTICHE.find((t) => t.id === state.tempistica)?.label ?? state.tempistica;
  const mq = mqTotaliEffettivi(state);
  const elenco = interventi.map((i) => i.titolo.toLowerCase()).join(', ');

  return {
    riferimento: `STIMA-${adesso.getFullYear()}/${suffisso}`,
    dataEmissione: formattaData(adesso),
    cliente: state.contatti.name.trim() || null,
    localita: 'Roma e provincia',
    ...costruisciTitolo(state, interventi),
    descrizione:
      `Stima preliminare degli interventi richiesti${elenco ? `: ${elenco}` : ''}. ` +
      `Superficie di riferimento ~${mq} m², livello di finitura ${finitura}. ` +
      `Gli importi comprendono lavorazioni e materiali di base e sono orientativi: ` +
      `il prezzo definitivo viene confermato dopo il sopralluogo gratuito.`,
    interventi,
    ambienti: state.ambienti.filter((a) => a.mq > 0).map((a) => ({ nome: a.nome, mq: a.mq })),
    mq,
    finitura,
    tempistica,
    tipoCasa: state.tipoCasa,
    imponibile: result.imponibile,
    ivaPct: result.ivaPct ?? IVA_PCT[state.tipoCasa],
    iva: result.iva,
    totaleIvato: result.totaleIvato,
    rangeMin: result.range.min,
    rangeMax: result.range.max,
    validitaGiorni: VALIDITA_GIORNI,
  };
}
