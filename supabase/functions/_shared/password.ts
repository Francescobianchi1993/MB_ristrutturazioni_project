/**
 * Hash della password admin — PBKDF2-SHA256 (Web Crypto, nativo in Deno).
 *
 * La password NON è più salvata in chiaro: in `app_config.admin_password_hash`
 * sta solo la stringa `pbkdf2$<iter>$<saltB64>$<hashB64>`, da cui non si risale
 * alla password. Il confronto in verifica è a tempo (quasi) costante.
 */

const ITER = 210_000;

async function derivaBit(pw: string, salt: Uint8Array, iter: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256);
  return new Uint8Array(bits);
}

function b64(u: Uint8Array): string {
  let s = '';
  for (const b of u) s += String.fromCharCode(b);
  return btoa(s);
}
function unb64(s: string): Uint8Array {
  const bin = atob(s);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}

/** Crea l'hash da salvare per una password in chiaro. */
export async function hashPassword(pw: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const h = await derivaBit(pw, salt, ITER);
  return `pbkdf2$${ITER}$${b64(salt)}$${b64(h)}`;
}

/** Verifica una password in chiaro contro l'hash salvato. */
export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  try {
    const parti = String(stored).split('$');
    if (parti.length !== 4 || parti[0] !== 'pbkdf2') return false;
    const iter = parseInt(parti[1], 10);
    if (!Number.isFinite(iter) || iter < 1) return false;
    const salt = unb64(parti[2]);
    const atteso = unb64(parti[3]);
    const reale = await derivaBit(pw, salt, iter);
    if (reale.length !== atteso.length) return false;
    let diff = 0;
    for (let i = 0; i < reale.length; i++) diff |= reale[i] ^ atteso[i];
    return diff === 0;
  } catch {
    return false;
  }
}

/** Password casuale leggibile (per il reset via email). */
export function generaPassword(len = 14): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const simboli = '!@#%&*?';
  const rnd = crypto.getRandomValues(new Uint8Array(len));
  let out = '';
  for (let i = 0; i < len - 2; i++) out += alfabeto[rnd[i] % alfabeto.length];
  // Garantiamo almeno un simbolo e una cifra.
  out += simboli[rnd[len - 2] % simboli.length];
  out += '23456789'[rnd[len - 1] % 8];
  return out;
}
