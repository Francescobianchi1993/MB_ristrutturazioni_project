import type { StatoImmobile, Stima } from "./types";

// ---------------------------------------------------------------------------
// Lookup €/mq per zona di Roma (valori indicativi, hardcoded).
// Servono SOLO a dare all'utente un ordine di grandezza immediato: la stima è
// dichiaratamente non vincolante. Non sono quotazioni ufficiali.
// ---------------------------------------------------------------------------
export const ZONE_ROMA: { nome: string; euroMq: number }[] = [
  { nome: "Centro Storico", euroMq: 6200 },
  { nome: "Prati", euroMq: 5600 },
  { nome: "Parioli", euroMq: 5400 },
  { nome: "Trastevere", euroMq: 5200 },
  { nome: "Monteverde", euroMq: 3900 },
  { nome: "San Giovanni", euroMq: 3800 },
  { nome: "Nomentano", euroMq: 3700 },
  { nome: "Ostiense", euroMq: 3600 },
  { nome: "Tuscolano", euroMq: 3300 },
  { nome: "EUR", euroMq: 3600 },
  { nome: "Montesacro", euroMq: 3200 },
  { nome: "Pigneto", euroMq: 3300 },
  { nome: "Centocelle", euroMq: 3000 },
  { nome: "Alessandrino", euroMq: 2800 },
  { nome: "Prenestino", euroMq: 2900 },
  { nome: "Torpignattara", euroMq: 2700 },
  { nome: "Tor Bella Monaca", euroMq: 1700 },
  { nome: "Ostia", euroMq: 2900 },
  { nome: "Roma (altra zona)", euroMq: 3200 },
];

// Prezzo di fallback per qualunque zona non presente in lookup (es. testo libero).
export const EURO_MQ_DEFAULT = 3200;

// Moltiplicatore in base allo stato di conservazione.
const MOLTIPLICATORE_STATO: Record<StatoImmobile, number> = {
  "Da ristrutturare": 0.75,
  Abitabile: 0.9,
  Ristrutturato: 1.0,
};

/** Ritorna il €/mq per la zona indicata, con fallback al valore generico. */
export function euroMqPerZona(zona: string): number {
  const match = ZONE_ROMA.find(
    (z) => z.nome.toLowerCase() === zona.trim().toLowerCase(),
  );
  return match ? match.euroMq : EURO_MQ_DEFAULT;
}

/**
 * Stima orientativa: mq × €/mq(zona) × moltiplicatore(stato), con range ±10%.
 * Arrotonda al migliaio più vicino per non dare una falsa impressione di precisione.
 */
export function calcolaStima(
  mq: number,
  zona: string,
  stato: StatoImmobile | "",
): Stima {
  const euroMq = euroMqPerZona(zona);
  const moltiplicatore = stato ? MOLTIPLICATORE_STATO[stato] : 0.9;
  const centrale = mq * euroMq * moltiplicatore;

  const round = (n: number) => Math.round(n / 1000) * 1000;

  return {
    centrale: round(centrale),
    min: round(centrale * 0.9),
    max: round(centrale * 1.1),
  };
}

/** Formatta un importo in euro, senza decimali, con separatore migliaia italiano. */
export function formatEuro(n: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}
