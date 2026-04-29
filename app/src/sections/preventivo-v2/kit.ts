/**
 * Pre-popolamento del Livello 2 a partire dalle scelte del Livello 1.
 *
 * Il L2 lavora "per ambiente": ogni voce ha una `(voceId, ambienteId)`
 * come chiave. Quindi una voce del kit applicabile a più stanze produce
 * più record (uno per stanza).
 *
 * Le voci che non trovano corrispondenza nel DB vengono ignorate.
 */

import {
  type ProgettoState,
  type VoceSelezionata,
  type Ambiente,
  type AmbienteTipo,
  type MacroSlotId,
  ID_COMUNI,
} from '@/lib/preventivoModel';
import { MACRO_SLOT_BY_ID, type VoceKit } from './data';
import type { VocePrezzario } from '@/lib/prezzario_v2';

export interface RisultatoPrePopolamento {
  voci: VoceSelezionata[];
  numKitApplicati: number;
  vociMancanti: string[];
}

/** Restituisce gli ambienti dello state pertinenti a un macro-slot. */
function ambientiDiSlot(state: ProgettoState, slotId: MacroSlotId): Ambiente[] {
  const slot = MACRO_SLOT_BY_ID[slotId];
  if (slot.ambiteApplicabili === 'tutto') {
    return state.ambienti;
  }
  const tipi = slot.ambiteApplicabili as AmbienteTipo[];
  return state.ambienti.filter((a) => tipi.includes(a.tipo));
}

export function applicaKitDelLivello1(
  state: ProgettoState,
  voci: VocePrezzario[]
): RisultatoPrePopolamento {
  const indexByNome = new Map<string, VocePrezzario>();
  for (const v of voci) indexByNome.set(v.voce, v);

  // accumulato: chiave "voceId::ambienteId"
  const accumulato = new Map<string, VoceSelezionata>();
  const mancanti: string[] = [];
  let numKit = 0;

  function aggiungi(vp: VocePrezzario, ambienteId: string, q: number) {
    if (q <= 0) return;
    const k = `${vp.id}::${ambienteId}`;
    const ex = accumulato.get(k);
    if (ex) {
      ex.quantita += q;
    } else {
      accumulato.set(k, {
        voceId: vp.id,
        ambienteId,
        quantita: q,
        prezzoUnitario: vp.prezzo,
        unitaMisura: vp.unita_misura,
        voce: vp.voce,
        categoria: vp.categoria,
      });
    }
  }

  for (const slotId of Object.keys(state.macroSlot) as MacroSlotId[]) {
    const config = state.macroSlot[slotId];
    if (!config?.attivo) continue;
    const slot = MACRO_SLOT_BY_ID[slotId];
    if (!slot.kitRicetta || slot.kitRicetta.length === 0) continue;

    numKit++;
    const ambientiPertinenti = ambientiDiSlot(state, slotId);

    for (const kit of slot.kitRicetta) {
      const vp = indexByNome.get(kit.voceMatch);
      if (!vp) {
        mancanti.push(kit.voceMatch);
        continue;
      }

      switch (kit.scala) {
        case 'per_mq':
          for (const a of ambientiPertinenti) aggiungi(vp, a.id, a.mq * kit.quantita);
          break;
        case 'per_ambiente':
          for (const a of ambientiPertinenti) aggiungi(vp, a.id, kit.quantita);
          break;
        case 'per_appartamento':
          aggiungi(vp, ID_COMUNI, kit.quantita);
          break;
      }
    }
  }

  // Arrotondo + filtra a 0
  const out: VoceSelezionata[] = [];
  for (const v of accumulato.values()) {
    v.quantita = Math.round(v.quantita * 10) / 10;
    if (v.quantita > 0) out.push(v);
  }
  return { voci: out, numKitApplicati: numKit, vociMancanti: mancanti };
}
