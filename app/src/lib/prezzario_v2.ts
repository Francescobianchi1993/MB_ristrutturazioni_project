/**
 * Adapter v2 del prezzario MB.
 *
 * Differenze rispetto a `prezzario.ts` (deprecato):
 *   - NON aggrega in "media €/m²" — quella media mescolava unità di misura
 *     diverse (cad + ml + mq) ed era matematicamente priva di senso.
 *   - Restituisce le voci una per una, con la loro unità di misura reale.
 *   - Filtra solo `stato='validated'` con `prezzo > 0`.
 *   - Raggruppa per super_categoria → categoria → voce.
 *
 * Il consumatore (LivelloDettaglio) usa la struttura gerarchica per filtri
 * per area + ricerca + breakdown delle somme.
 */

import { supabase } from './supabase';

export interface VocePrezzario {
  id: number;
  voce: string;
  descrizione_breve: string | null;
  categoria: string;
  super_categoria: string;
  unita_misura: string;
  prezzo: number;
  prezzo_riferimento_mb: number | null;
  quota_manodopera_pct: number | null;
  quota_materiale_pct: number | null;
  iva_default: number | null;
  ambiente_applicabile: string[] | null;
}

export interface CategoriaConVoci {
  categoria: string;
  super_categoria: string;
  voci: VocePrezzario[];
}

export interface SuperCategoriaInfo {
  super_categoria: string;
  numCategorie: number;
  numVoci: number;
}

export interface PrezzarioData {
  ready: boolean;
  errore?: string;
  categorie: CategoriaConVoci[];
  superCategorie: SuperCategoriaInfo[];
  totaleVoci: number;
}

const EMPTY: PrezzarioData = {
  ready: false,
  categorie: [],
  superCategorie: [],
  totaleVoci: 0,
};

const LABEL_SUPER_CAT: Record<string, string> = {
  impianti: 'Impianti',
  opere_murarie: 'Opere murarie',
  finiture: 'Finiture',
  servizi: 'Servizi',
  esterno: 'Esterno',
};

export function labelSuperCategoria(key: string): string {
  return LABEL_SUPER_CAT[key] ?? key;
}

export async function caricaPrezzario(): Promise<PrezzarioData> {
  if (!supabase) {
    return { ...EMPTY, errore: 'Supabase non configurato' };
  }

  const { data, error } = await supabase
    .from('voci')
    .select(
      'id, voce, descrizione_breve, categoria, super_categoria, unita_misura, prezzo, prezzo_riferimento_mb, quota_manodopera_pct, quota_materiale_pct, iva_default, ambiente_applicabile'
    )
    .eq('stato', 'validated')
    .gt('prezzo', 0)
    .order('super_categoria', { ascending: true })
    .order('categoria', { ascending: true })
    .order('voce', { ascending: true });

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[prezzario_v2] errore caricamento voci', error.message);
    return { ...EMPTY, errore: error.message };
  }

  const voci = (data ?? []) as VocePrezzario[];

  // Raggruppo per categoria
  const byCategoria = new Map<string, CategoriaConVoci>();
  for (const v of voci) {
    if (!byCategoria.has(v.categoria)) {
      byCategoria.set(v.categoria, {
        categoria: v.categoria,
        super_categoria: v.super_categoria,
        voci: [],
      });
    }
    byCategoria.get(v.categoria)!.voci.push(v);
  }

  // Riassunto per super_categoria
  const bySuper = new Map<string, SuperCategoriaInfo>();
  for (const cat of byCategoria.values()) {
    if (!bySuper.has(cat.super_categoria)) {
      bySuper.set(cat.super_categoria, {
        super_categoria: cat.super_categoria,
        numCategorie: 0,
        numVoci: 0,
      });
    }
    const s = bySuper.get(cat.super_categoria)!;
    s.numCategorie++;
    s.numVoci += cat.voci.length;
  }

  return {
    ready: true,
    categorie: Array.from(byCategoria.values()),
    superCategorie: Array.from(bySuper.values()),
    totaleVoci: voci.length,
  };
}
