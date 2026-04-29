/**
 * Le 11 "categorie-cliente" del Livello 2 — ricomposizione delle 16
 * categorie tecniche del DB MB in etichette comprensibili al cliente.
 *
 * Le categorie 0%-validate del DB (Domotica, Sicurezza, ecc.) non sono
 * mappate qui — non hanno voci visibili e non vengono mostrate.
 *
 * Una voce del DB appartiene a UNA sola categoria-cliente. La logica:
 *   1. Se ambiente_applicabile = ['bagno'] only → "Bagno · sanitari"
 *   2. Se ambiente_applicabile = ['cucina'] only → "Cucina · allestimenti"
 *   3. Altrimenti → match per categoria DB su `dbCategorie`
 */

import type { VocePrezzario } from '@/lib/prezzario_v2';

export interface CategoriaCliente {
  id: string;
  label: string;
  emoji: string;
  /** Categorie del DB MB che mappano qui */
  dbCategorie: string[];
  /**
   * Se settato, la voce ci finisce solo se ambiente_applicabile è
   * esattamente [soloAmbiente]. Usato per "Bagno · sanitari" e
   * "Cucina · allestimenti".
   */
  soloAmbiente?: 'bagno' | 'cucina';
}

export const CATEGORIE_CLIENTE: CategoriaCliente[] = [
  {
    id: 'demolizioni',
    label: 'Demolizioni',
    emoji: '⚒️',
    dbCategorie: ['Demolizioni e rimozioni'],
  },
  {
    id: 'opere_murarie',
    label: 'Opere murarie',
    emoji: '🧱',
    dbCategorie: [
      'Opere murarie',
      'Massetti e sottofondi',
      'Isolamenti e controsoffitti',
      'Impermeabilizzazioni e terrazzi',
    ],
  },
  {
    id: 'pavimenti',
    label: 'Pavimenti e rivestimenti',
    emoji: '🟫',
    dbCategorie: ['Rivestimenti e pavimenti'],
  },
  {
    id: 'pittura',
    label: 'Pittura e finiture',
    emoji: '🎨',
    dbCategorie: ['Pittura e finiture'],
  },
  {
    id: 'elettrico',
    label: 'Impianto elettrico',
    emoji: '⚡',
    dbCategorie: ['Impianto elettrico'],
  },
  {
    id: 'idraulico',
    label: 'Impianto idraulico',
    emoji: '💧',
    dbCategorie: ['Impianto idraulico'],
  },
  {
    id: 'termico',
    label: 'Riscaldamento e clima',
    emoji: '🔥',
    dbCategorie: ['Impianto termico', 'Climatizzazione e ventilazione'],
  },
  {
    id: 'serramenti',
    label: 'Serramenti e porte',
    emoji: '🚪',
    dbCategorie: ['Serramenti e porte interne'],
  },
  {
    id: 'bagno',
    label: 'Bagno · sanitari e allestimenti',
    emoji: '🛁',
    dbCategorie: [],
    soloAmbiente: 'bagno',
  },
  {
    id: 'cucina',
    label: 'Cucina · allestimenti',
    emoji: '🍳',
    dbCategorie: [],
    soloAmbiente: 'cucina',
  },
  {
    id: 'servizi',
    label: 'Servizi e lavori a corpo',
    emoji: '🔧',
    dbCategorie: [
      'Manodopera e servizi',
      'Opere complementari e servizi finali',
      'Voci tecniche utili',
      'Opere esterne e facciata',
    ],
  },
];

/**
 * Determina a quale categoria-cliente appartiene una voce del DB.
 * Restituisce null se la voce non rientra in nessuna (es. categorie DB
 * non ancora mappate o edge-case).
 */
export function categoriaClienteDi(v: VocePrezzario): CategoriaCliente | null {
  // Voci specifiche di un solo ambiente → priorità
  const tipi = v.ambiente_applicabile;
  if (tipi && tipi.length === 1) {
    if (tipi[0] === 'bagno') {
      return CATEGORIE_CLIENTE.find((c) => c.id === 'bagno') ?? null;
    }
    if (tipi[0] === 'cucina') {
      return CATEGORIE_CLIENTE.find((c) => c.id === 'cucina') ?? null;
    }
  }
  // Altrimenti: match per categoria DB
  for (const c of CATEGORIE_CLIENTE) {
    if (c.dbCategorie.includes(v.categoria)) return c;
  }
  return null;
}

/** Raggruppa una lista di voci nelle categorie-cliente. */
export function raggruppaPerCategoriaCliente(
  voci: VocePrezzario[]
): Map<string, VocePrezzario[]> {
  const map = new Map<string, VocePrezzario[]>();
  for (const c of CATEGORIE_CLIENTE) map.set(c.id, []);
  for (const v of voci) {
    const c = categoriaClienteDi(v);
    if (!c) continue;
    map.get(c.id)!.push(v);
  }
  return map;
}
