/**
 * Modello dati canonico del preventivo MB.
 *
 * Single source of truth condivisa tra:
 *   - Livello 1 (stima rapida, 5 step)
 *   - Livello 2 (preventivo dettagliato, voce per voce dal prezzario MB)
 *
 * Le due viste leggono lo stesso `ProgettoState` — quando l'utente passa
 * dall'una all'altra non perde nulla, e ogni modifica si riflette in
 * entrambe le proiezioni in tempo reale.
 */

// ────────────────────────────────────────────────────────────────────────────
// Ambienti della casa
// ────────────────────────────────────────────────────────────────────────────

export type AmbienteTipo =
  | 'cucina'
  | 'bagno'
  | 'soggiorno'
  | 'camera'
  | 'corridoio'
  | 'altro';

export interface Ambiente {
  id: string;
  tipo: AmbienteTipo;
  nome: string;
  mq: number;
}

export const LABEL_AMBIENTE: Record<AmbienteTipo, string> = {
  cucina: 'Cucina',
  bagno: 'Bagno',
  soggiorno: 'Soggiorno',
  camera: 'Camera',
  corridoio: 'Disimpegno',
  altro: 'Altro',
};

// ────────────────────────────────────────────────────────────────────────────
// Macro-slot (i 10 interventi del Livello 1)
// ────────────────────────────────────────────────────────────────────────────

export type MacroSlotId =
  | 'completa'
  | 'cucina'
  | 'bagno'
  | 'camera'
  | 'elettrico'
  | 'idraulico'
  | 'termico'
  | 'infissi'
  | 'tinteggiatura';

export interface MacroSlotConfig {
  attivo: boolean;
  /**
   * Mappa { idSottoVoce: attiva }. Default: tutte le sotto-voci attive.
   * Se l'utente disattiva una sotto-voce, la sua quota di costo viene
   * sottratta dal totale del macro-slot.
   */
  sottoVociAttive: Record<string, boolean>;
  /**
   * Per il macro-slot 'infissi' (calcolato a pezzo, non a m²).
   */
  numPorte?: number;
  numFinestre?: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Voci dettagliate (popolate in Livello 2)
// ────────────────────────────────────────────────────────────────────────────

/** ID virtuale per voci a-corpo casa (sopralluogo, computi, ecc.) */
export const ID_COMUNI = '__comuni__';

export interface VoceSelezionata {
  /** id della voce su public.voci di Supabase */
  voceId: number;
  /** ambiente di destinazione (id reale o ID_COMUNI per a-corpo casa) */
  ambienteId: string;
  /** quantità scelta per quell'ambiente */
  quantita: number;
  /** snapshot del prezzo unitario al momento della scelta */
  prezzoUnitario: number;
  /** unità di misura snapshottata dal DB */
  unitaMisura: string;
  /** label snapshottato dal DB */
  voce: string;
  /** categoria snapshottata dal DB */
  categoria: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Stato del progetto
// ────────────────────────────────────────────────────────────────────────────

export type Finitura = 'intelligent' | 'smart' | 'prestige';
export type Tempistica = 'urgente' | 'normale' | 'flessibile';

/** Tipo di abitazione: incide solo sull'aliquota IVA della ristrutturazione. */
export type TipoCasa = 'prima' | 'seconda';

/**
 * Aliquota IVA della ristrutturazione: 10% sulla prima casa, 22% sulla seconda.
 * Si applica solo al flusso "stima rapida" (ristrutturazione); nel flusso
 * "intervento" i prezzi a listino sono già IVA compresa.
 */
export const IVA_PCT: Record<TipoCasa, number> = { prima: 10, seconda: 22 };

export function normalizzaTipoCasa(value: unknown): TipoCasa {
  return value === 'seconda' ? 'seconda' : 'prima';
}

/**
 * Mappa i vecchi id finitura (4 livelli) verso i 3 attuali, così gli stati
 * salvati su localStorage da versioni precedenti non rompono la UI.
 */
const FINITURA_LEGACY: Record<string, Finitura> = {
  base: 'intelligent',
  medio: 'smart',
  premium: 'prestige',
  luxury: 'prestige',
};

export function normalizzaFinitura(value: unknown): Finitura {
  if (value === 'intelligent' || value === 'smart' || value === 'prestige') return value;
  return FINITURA_LEGACY[String(value)] ?? 'smart';
}

export interface Contatti {
  name: string;
  email: string;
  phone: string;
}

/**
 * Piano dell'immobile — incide sul costo finale (movimentazione materiali,
 * scale, ascensore, accessibilità).
 *
 * I moltiplicatori esatti saranno forniti da MB e collegati al DB. Per ora
 * sono placeholder a 1.0 — il selettore è esposto in UI ma non incide sul
 * pricing finché MB non confermerà i valori.
 */
export const PIANI = [
  { id: 'terra', label: 'Piano terra', moltiplicatorePlaceholder: 1.0 },
  { id: 'primo_secondo', label: '1° – 2° piano', moltiplicatorePlaceholder: 1.0 },
  { id: 'terzo_oltre_ascensore', label: '3° o oltre · con ascensore', moltiplicatorePlaceholder: 1.0 },
  { id: 'terzo_oltre_no_ascensore', label: '3° o oltre · senza ascensore', moltiplicatorePlaceholder: 1.0 },
  { id: 'attico', label: 'Attico / Sottotetto', moltiplicatorePlaceholder: 1.0 },
] as const;

export type Piano = (typeof PIANI)[number]['id'];

export interface ProgettoState {
  piano: Piano;
  /** Metri quadri totali della casa, dichiarati dall'utente (slider editor).
   *  Indipendente dalla somma dei singoli ambienti — può essere maggiore
   *  (l'utente non ha ancora distribuito tutto) o uguale. */
  mqTotaliDichiarati: number;
  ambienti: Ambiente[];
  macroSlot: Partial<Record<MacroSlotId, MacroSlotConfig>>;
  finitura: Finitura;
  tempistica: Tempistica;
  /** Prima/seconda casa: determina l'aliquota IVA della ristrutturazione. */
  tipoCasa: TipoCasa;
  contatti: Contatti;
  vociDettagliate: VoceSelezionata[];
  ultimoAggiornamento: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Preset di ambienti
// ────────────────────────────────────────────────────────────────────────────

const uid = (): string => Math.random().toString(36).slice(2, 9);

export const PRESET_AMBIENTI = {
  bilocale50: (): Ambiente[] => [
    { id: uid(), tipo: 'cucina', nome: 'Cucina', mq: 8 },
    { id: uid(), tipo: 'bagno', nome: 'Bagno', mq: 5 },
    { id: uid(), tipo: 'camera', nome: 'Camera', mq: 14 },
    { id: uid(), tipo: 'soggiorno', nome: 'Soggiorno', mq: 18 },
    { id: uid(), tipo: 'corridoio', nome: 'Disimpegno', mq: 5 },
  ],
  trilocale80: (): Ambiente[] => [
    { id: uid(), tipo: 'cucina', nome: 'Cucina', mq: 12 },
    { id: uid(), tipo: 'bagno', nome: 'Bagno', mq: 6 },
    { id: uid(), tipo: 'camera', nome: 'Camera matrimoniale', mq: 16 },
    { id: uid(), tipo: 'camera', nome: 'Camera singola', mq: 12 },
    { id: uid(), tipo: 'soggiorno', nome: 'Soggiorno', mq: 25 },
    { id: uid(), tipo: 'corridoio', nome: 'Disimpegno', mq: 9 },
  ],
  quadrilocale110: (): Ambiente[] => [
    { id: uid(), tipo: 'cucina', nome: 'Cucina', mq: 14 },
    { id: uid(), tipo: 'bagno', nome: 'Bagno principale', mq: 7 },
    { id: uid(), tipo: 'bagno', nome: 'Bagno di servizio', mq: 5 },
    { id: uid(), tipo: 'camera', nome: 'Camera matrimoniale', mq: 16 },
    { id: uid(), tipo: 'camera', nome: 'Camera 2', mq: 13 },
    { id: uid(), tipo: 'camera', nome: 'Camera 3', mq: 13 },
    { id: uid(), tipo: 'soggiorno', nome: 'Soggiorno', mq: 30 },
    { id: uid(), tipo: 'corridoio', nome: 'Disimpegno', mq: 12 },
  ],
} as const;

export type PresetKey = keyof typeof PRESET_AMBIENTI;

export const PRESET_LABELS: Record<PresetKey, { label: string; mq: number; descrizione: string }> = {
  bilocale50: { label: 'Bilocale', mq: 50, descrizione: '5 ambienti, ~50 m²' },
  trilocale80: { label: 'Trilocale', mq: 80, descrizione: '6 ambienti, ~80 m²' },
  quadrilocale110: { label: 'Quadrilocale', mq: 110, descrizione: '8 ambienti, ~110 m²' },
};

// ────────────────────────────────────────────────────────────────────────────
// Stato iniziale
// ────────────────────────────────────────────────────────────────────────────

/**
 * Ambienti di default al primo accesso. 5 ambienti tipici di un appartamento
 * standard, TUTTI con mq=0 — l'utente compilerà la metratura di ognuno.
 */
function ambientiDefault(): Ambiente[] {
  return [
    { id: uid(), tipo: 'cucina', nome: 'Cucina', mq: 0 },
    { id: uid(), tipo: 'bagno', nome: 'Bagno', mq: 0 },
    { id: uid(), tipo: 'soggiorno', nome: 'Soggiorno', mq: 0 },
    { id: uid(), tipo: 'camera', nome: 'Camera', mq: 0 },
    { id: uid(), tipo: 'corridoio', nome: 'Disimpegno', mq: 0 },
  ];
}

/**
 * Metratura totale di default ("appartamento medio"). Usata come valore iniziale
 * dei mq dichiarati E come fallback nel pricing, così lo slider mostra 80 m² e la
 * stima è coerente anche se l'utente non tocca il cursore (evita la stima a 0 €).
 */
export const MQ_TOTALI_DEFAULT = 80;

export function statoIniziale(): ProgettoState {
  return {
    piano: 'primo_secondo',
    mqTotaliDichiarati: MQ_TOTALI_DEFAULT,
    ambienti: ambientiDefault(),
    macroSlot: {},
    finitura: 'smart',
    tempistica: 'normale',
    tipoCasa: 'prima',
    contatti: { name: '', email: '', phone: '' },
    vociDettagliate: [],
    ultimoAggiornamento: new Date().toISOString(),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Selettori derivati
// ────────────────────────────────────────────────────────────────────────────

/** Somma dei m² distribuiti negli ambienti (≠ dei m² dichiarati per la casa). */
export function mqTotali(state: ProgettoState): number {
  return state.ambienti.reduce((sum, a) => sum + a.mq, 0);
}

/** Alias semantico più chiaro per il caso "metri distribuiti". */
export const mqDistribuiti = mqTotali;

/**
 * Mq totali "effettivi" su cui si basa la stima delle voci che agiscono su tutta
 * la casa (ristrutturazione completa, impianti trasversali, tinteggiatura).
 *
 * Sorgente: i m² TOTALI dichiarati dall'utente con lo slider "metratura
 * appartamento". Sia in ristrutturazione completa sia per gli interventi
 * trasversali il prezzo si basa sulla superficie totale dichiarata; la
 * distribuzione negli ambienti è un dettaglio opzionale. Fallback alla somma
 * degli ambienti e poi al default "appartamento medio", così la stima non è mai
 * 0 € quando a video c'è una metratura.
 */
export function mqTotaliEffettivi(state: ProgettoState): number {
  return state.mqTotaliDichiarati || mqTotali(state) || MQ_TOTALI_DEFAULT;
}

export function mqPerTipo(state: ProgettoState, tipo: AmbienteTipo): number {
  return state.ambienti
    .filter((a) => a.tipo === tipo)
    .reduce((sum, a) => sum + a.mq, 0);
}

export function isCompletaAttiva(state: ProgettoState): boolean {
  return !!state.macroSlot.completa?.attivo;
}

// ────────────────────────────────────────────────────────────────────────────
// Localstorage sync
// ────────────────────────────────────────────────────────────────────────────

// v8: invalidata la cache dopo l'introduzione del minimo 20 m² nell'editor
// "casa completa" (stati legacy con mqTotaliDichiarati < 20 mostravano un valore
// incoerente col prezzo, che usa il fallback quando è 0).
const LS_KEY = 'mb_preventivo_v2_8';
const LS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 giorni

export function caricaDaLocalStorage(): ProgettoState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProgettoState;
    const lastUpdate = new Date(parsed.ultimoAggiornamento).getTime();
    if (isNaN(lastUpdate) || Date.now() - lastUpdate > LS_TTL_MS) {
      localStorage.removeItem(LS_KEY);
      return null;
    }
    // Rimuove key orfani (macro-slot rimossi in aggiornamenti precedenti)
    const validIds = new Set<string>([
      'completa','cucina','bagno','camera','elettrico',
      'idraulico','termico','infissi','tinteggiatura',
    ]);
    const macroSlotSanificato = Object.fromEntries(
      Object.entries(parsed.macroSlot ?? {}).filter(([id]) => validIds.has(id))
    ) as ProgettoState['macroSlot'];
    return {
      ...parsed,
      macroSlot: macroSlotSanificato,
      // Migrazione finiture 4→3 livelli per stati salvati da versioni precedenti.
      finitura: normalizzaFinitura(parsed.finitura),
      // tipoCasa introdotto dopo: default "prima" per gli stati salvati senza il campo.
      tipoCasa: normalizzaTipoCasa(parsed.tipoCasa),
    };
  } catch {
    return null;
  }
}

export function salvaSuLocalStorage(state: ProgettoState): void {
  try {
    const toSave = { ...state, ultimoAggiornamento: new Date().toISOString() };
    localStorage.setItem(LS_KEY, JSON.stringify(toSave));
  } catch {
    // quota esaurita o storage disabilitato — silenzioso
  }
}

export function pulisciLocalStorage(): void {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // noop
  }
}
