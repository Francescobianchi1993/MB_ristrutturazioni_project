// deno-lint-ignore-file no-explicit-any
/**
 * Rate limiting minimale basato sulla tabella `rate_limits` (leggibile/scrivibile
 * SOLO dal service role → nessun accesso anon/authenticated). Non è perfettamente
 * atomico (read-then-write, piccola race possibile), ma è sufficiente a ostacolare
 * flooding e brute-force su endpoint pubblici a basso costo per l'attaccante.
 *
 * Schema atteso (vedi supabase_rate_limits.sql):
 *   rate_limits(chiave text pk, conteggio int, finestra_inizio timestamptz)
 */

/**
 * Numero di tentativi registrati per `chiave` nella finestra corrente
 * (`windowSec` secondi). Se la finestra è scaduta ritorna 0. NON incrementa.
 */
export async function tentativiRecenti(
  supabase: any,
  chiave: string,
  windowSec: number,
): Promise<number> {
  const { data } = await supabase
    .from('rate_limits')
    .select('conteggio, finestra_inizio')
    .eq('chiave', chiave)
    .maybeSingle();
  if (!data) return 0;
  const startMs = new Date(data.finestra_inizio).getTime();
  if (Date.now() - startMs > windowSec * 1000) return 0; // finestra scaduta
  return Number(data.conteggio ?? 0);
}

/**
 * Registra un tentativo per `chiave`: se la finestra è scaduta (o non esiste)
 * la riapre a 1, altrimenti incrementa il contatore. Best-effort.
 */
export async function registraTentativo(
  supabase: any,
  chiave: string,
  windowSec: number,
): Promise<void> {
  const nowISO = new Date().toISOString();
  const { data } = await supabase
    .from('rate_limits')
    .select('conteggio, finestra_inizio')
    .eq('chiave', chiave)
    .maybeSingle();
  if (!data) {
    await supabase.from('rate_limits').insert({ chiave, conteggio: 1, finestra_inizio: nowISO });
    return;
  }
  const startMs = new Date(data.finestra_inizio).getTime();
  if (Date.now() - startMs > windowSec * 1000) {
    await supabase.from('rate_limits').update({ conteggio: 1, finestra_inizio: nowISO }).eq('chiave', chiave);
  } else {
    await supabase.from('rate_limits').update({ conteggio: Number(data.conteggio ?? 0) + 1 }).eq('chiave', chiave);
  }
}

/**
 * Confronto stringhe a tempo (quasi) costante: non fa short-circuit sul primo
 * carattere diverso, riducendo il timing side-channel sul confronto password.
 */
export function confrontoSicuro(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ba = enc.encode(a ?? '');
  const bb = enc.encode(b ?? '');
  let diff = ba.length ^ bb.length;
  const n = Math.max(ba.length, bb.length);
  for (let i = 0; i < n; i++) diff |= (ba[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}

/**
 * Identificatore IP del client per il rate limiting (best-effort dietro il proxy
 * Supabase). Il client può falsificare `x-forwarded-for` prependendo IP arbitrari,
 * ma NON può controllare l'ultimo elemento, che è quello appeso dal proxy di
 * fiducia. Usiamo quindi header impostati dalla piattaforma se presenti, e come
 * fallback l'ULTIMO hop di XFF (non il primo, che sarebbe spoofabile → bypass del
 * limite anti brute-force).
 */
export function clientIp(req: Request): string {
  const platform = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-real-ip');
  if (platform) return platform.trim();
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const parti = xff.split(',').map((s) => s.trim()).filter(Boolean);
    if (parti.length) return parti[parti.length - 1]; // ultimo hop = proxy fidato
  }
  return 'unknown';
}
