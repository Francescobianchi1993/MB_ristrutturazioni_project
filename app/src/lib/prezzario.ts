import { supabase } from './supabase';

/**
 * Adapter del prezzario MB.
 *
 * Il prezzario in Supabase (tabella `voci`) è uno strumento gestionale interno:
 * 383 voci raggruppate in `super_categoria` (impianti, opere_murarie, finiture,
 * servizi, esterno) e `categoria` (Impianto elettrico, Demolizioni, ecc.).
 *
 * Questo modulo legge solo le voci con `stato = 'validated'` e le aggrega
 * per categoria, calcolando un prezzo medio per le unità di misura ricorrenti
 * (mq, ml, cad, ecc.). Il wizard del preventivo usa queste medie come
 * `basePerSqm` reali al posto dei valori hardcoded del prototipo.
 */

export type Voce = {
  id: number;
  voce: string;
  descrizione_breve: string | null;
  categoria: string;
  super_categoria: string;
  unita_misura: string;
  prezzo: number | null;
  prezzo_riferimento_mb: number | null;
  quota_manodopera_pct: number | null;
  quota_materiale_pct: number | null;
  iva_default: number | null;
};

export type CategoryStats = {
  categoria: string;
  super_categoria: string;
  count: number;
  prezzoMedioMq: number | null; // €/m²
  prezzoMedioMl: number | null; // €/ml
  prezzoMedioCad: number | null; // €/cad
  prezzoMedio: number | null; // media generale (fallback)
  voci: Voce[];
};

export type PriceData = {
  ready: boolean;
  byCategory: Record<string, CategoryStats>;
  totalVoci: number;
};

const EMPTY: PriceData = { ready: false, byCategory: {}, totalVoci: 0 };

/**
 * Fetcha tutte le voci validate e ritorna statistiche aggregate per categoria.
 * Falls back a un dataset vuoto se Supabase non è configurato — il wizard
 * mostrerà comunque i prezzi di fallback hardcoded.
 */
export async function loadPriceData(): Promise<PriceData> {
  if (!supabase) return EMPTY;

  const { data, error } = await supabase
    .from('voci')
    .select(
      'id, voce, descrizione_breve, categoria, super_categoria, unita_misura, prezzo, prezzo_riferimento_mb, quota_manodopera_pct, quota_materiale_pct, iva_default'
    )
    .eq('stato', 'validated');

  if (error || !data) {
    // eslint-disable-next-line no-console
    console.warn('[prezzario] errore caricamento voci', error?.message);
    return EMPTY;
  }

  const voci = data as Voce[];
  const byCategory: Record<string, CategoryStats> = {};

  for (const v of voci) {
    if (!byCategory[v.categoria]) {
      byCategory[v.categoria] = {
        categoria: v.categoria,
        super_categoria: v.super_categoria,
        count: 0,
        prezzoMedioMq: null,
        prezzoMedioMl: null,
        prezzoMedioCad: null,
        prezzoMedio: null,
        voci: [],
      };
    }
    byCategory[v.categoria].voci.push(v);
    byCategory[v.categoria].count++;
  }

  for (const cat of Object.values(byCategory)) {
    cat.prezzoMedioMq = mean(cat.voci, 'mq');
    cat.prezzoMedioMl = mean(cat.voci, 'ml');
    cat.prezzoMedioCad = mean(cat.voci, 'cad');
    cat.prezzoMedio = mean(cat.voci); // tutte
  }

  return { ready: true, byCategory, totalVoci: voci.length };
}

function mean(voci: Voce[], um?: string): number | null {
  const list = voci.filter(
    (v) => v.prezzo !== null && v.prezzo > 0 && (!um || v.unita_misura === um)
  );
  if (list.length === 0) return null;
  const sum = list.reduce((acc, v) => acc + (v.prezzo ?? 0), 0);
  return Math.round((sum / list.length) * 100) / 100;
}

/**
 * Ritorna il `basePerSqm` reale dal DB per una categoria specifica, oppure
 * il valore fallback se i dati non sono ancora disponibili.
 */
export function basePerSqmForCategory(
  data: PriceData,
  categoria: string,
  fallback: number
): number {
  const cat = data.byCategory[categoria];
  if (!cat) return fallback;
  // Preferiamo €/m² se c'è; altrimenti usiamo prezzoMedio (€/voce) come proxy.
  return cat.prezzoMedioMq ?? cat.prezzoMedio ?? fallback;
}
