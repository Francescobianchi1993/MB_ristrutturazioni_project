/**
 * Single source of truth del preventivo.
 *
 * Context React + useReducer. Sync automatica su localStorage (TTL 30 giorni).
 * Il modello è quello di `lib/preventivoModel.ts` — questo file è solo il
 * "wiring" React.
 */

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from 'react';
import {
  type Ambiente,
  type AmbienteTipo,
  type ProgettoState,
  type MacroSlotId,
  type Finitura,
  type Tempistica,
  type Contatti,
  type VoceSelezionata,
  type PresetKey,
  type Piano,
  PRESET_AMBIENTI,
  LABEL_AMBIENTE,
  statoIniziale,
  caricaDaLocalStorage,
  salvaSuLocalStorage,
  pulisciLocalStorage,
} from '@/lib/preventivoModel';
import { MACRO_SLOT_BY_ID } from './data';

// ────────────────────────────────────────────────────────────────────────────
// Actions
// ────────────────────────────────────────────────────────────────────────────

export type ProgettoAction =
  | { type: 'SET_PIANO'; piano: Piano }
  | { type: 'CARICA_PRESET'; preset: PresetKey }
  | { type: 'AGGIORNA_AMBIENTE'; id: string; patch: Partial<Ambiente> }
  | { type: 'AGGIUNGI_AMBIENTE'; tipo: AmbienteTipo }
  | { type: 'RIMUOVI_AMBIENTE'; id: string }
  | { type: 'IMPOSTA_MQ_TOTALI'; mq: number }
  | { type: 'IMPOSTA_MQ_PER_TIPO'; tipo: AmbienteTipo; mq: number }
  | { type: 'TOGGLE_MACRO_SLOT'; slot: MacroSlotId }
  | { type: 'TOGGLE_SOTTO_VOCE'; slot: MacroSlotId; sottoVoce: string }
  | { type: 'IMPOSTA_NUM_INFISSI'; numPorte?: number; numFinestre?: number }
  | { type: 'SET_FINITURA'; finitura: Finitura }
  | { type: 'SET_TEMPISTICA'; tempistica: Tempistica }
  | { type: 'SET_CONTATTI'; patch: Partial<Contatti> }
  | { type: 'AGGIORNA_VOCE_DETTAGLIATA'; voce: VoceSelezionata }
  | { type: 'RIMUOVI_VOCE_DETTAGLIATA'; voceId: number; ambienteId: string }
  | { type: 'IMPOSTA_VOCI_DETTAGLIATE'; voci: VoceSelezionata[] }
  | { type: 'RESET_VOCI_DETTAGLIATE' }
  | { type: 'RESET' }
  | { type: 'CARICA'; state: ProgettoState };

// ────────────────────────────────────────────────────────────────────────────
// Reducer
// ────────────────────────────────────────────────────────────────────────────

const uid = (): string => Math.random().toString(36).slice(2, 9);

function defaultMacroSlotConfig(slot: MacroSlotId) {
  const meta = MACRO_SLOT_BY_ID[slot];
  const sottoVociAttive: Record<string, boolean> = {};
  for (const sv of meta.sottoVoci) sottoVociAttive[sv.id] = true;
  return {
    attivo: true,
    sottoVociAttive,
    ...(slot === 'infissi' ? { numPorte: 5, numFinestre: 5 } : {}),
  };
}

function reducer(state: ProgettoState, action: ProgettoAction): ProgettoState {
  switch (action.type) {
    case 'SET_PIANO':
      return { ...state, piano: action.piano };

    case 'CARICA_PRESET': {
      const ambienti = PRESET_AMBIENTI[action.preset]();
      const mqTotaliDichiarati = ambienti.reduce((s, a) => s + a.mq, 0);
      return { ...state, ambienti, mqTotaliDichiarati };
    }

    case 'IMPOSTA_MQ_PER_TIPO': {
      // Imposta i mq di un singolo tipo di ambiente. Se non esiste, lo crea.
      // Se ne esistono più di uno dello stesso tipo, distribuisce proporzionalmente.
      const ambientiDelTipo = state.ambienti.filter((a) => a.tipo === action.tipo);
      if (ambientiDelTipo.length === 0) {
        return {
          ...state,
          ambienti: [
            ...state.ambienti,
            {
              id: uid(),
              tipo: action.tipo,
              nome: LABEL_AMBIENTE[action.tipo],
              mq: action.mq,
            },
          ],
        };
      }
      if (ambientiDelTipo.length === 1) {
        return {
          ...state,
          ambienti: state.ambienti.map((a) =>
            a.tipo === action.tipo ? { ...a, mq: action.mq } : a
          ),
        };
      }
      // più ambienti dello stesso tipo: distribuzione proporzionale
      const totaleAttuale = ambientiDelTipo.reduce((s, a) => s + a.mq, 0);
      const fattore = totaleAttuale > 0 ? action.mq / totaleAttuale : 1 / ambientiDelTipo.length;
      return {
        ...state,
        ambienti: state.ambienti.map((a) =>
          a.tipo === action.tipo ? { ...a, mq: Math.round(a.mq * fattore) } : a
        ),
      };
    }

    case 'AGGIORNA_AMBIENTE':
      return {
        ...state,
        ambienti: state.ambienti.map((a) =>
          a.id === action.id ? { ...a, ...action.patch } : a
        ),
      };

    case 'AGGIUNGI_AMBIENTE':
      return {
        ...state,
        ambienti: [
          ...state.ambienti,
          {
            id: uid(),
            tipo: action.tipo,
            nome: LABEL_AMBIENTE[action.tipo],
            mq: 0, // l'utente deve compilare la metratura del nuovo vano
          },
        ],
      };

    case 'RIMUOVI_AMBIENTE':
      return {
        ...state,
        ambienti: state.ambienti.filter((a) => a.id !== action.id),
        vociDettagliate: state.vociDettagliate.filter((v) => v.ambienteId !== action.id),
      };

    case 'IMPOSTA_MQ_TOTALI':
      // Aggiorna SOLO la metratura dichiarata della casa.
      // I singoli ambienti restano invariati — sarà l'utente a distribuirli
      // come preferisce nelle schede di dettaglio.
      return { ...state, mqTotaliDichiarati: Math.max(0, action.mq) };

    case 'TOGGLE_MACRO_SLOT': {
      const corrente = state.macroSlot[action.slot];
      const giaAttivo = !!corrente?.attivo;
      const newMacro = { ...state.macroSlot };

      if (giaAttivo) {
        newMacro[action.slot] = { ...corrente!, attivo: false };
      } else {
        // Se attivo "completa", spengo tutti gli altri macro/trasversali "disabilitati se completa"
        if (action.slot === 'completa') {
          for (const id of Object.keys(newMacro) as MacroSlotId[]) {
            const meta = MACRO_SLOT_BY_ID[id];
            if (meta?.disabilitatoSeCompleta && newMacro[id]) {
              newMacro[id] = { ...newMacro[id]!, attivo: false };
            }
          }
        }
        newMacro[action.slot] = corrente ?? defaultMacroSlotConfig(action.slot);
        newMacro[action.slot]!.attivo = true;
      }

      return { ...state, macroSlot: newMacro };
    }

    case 'TOGGLE_SOTTO_VOCE': {
      const config = state.macroSlot[action.slot] ?? defaultMacroSlotConfig(action.slot);
      const nuoveSottoVoci = {
        ...config.sottoVociAttive,
        [action.sottoVoce]: !(config.sottoVociAttive[action.sottoVoce] ?? true),
      };
      return {
        ...state,
        macroSlot: {
          ...state.macroSlot,
          [action.slot]: { ...config, sottoVociAttive: nuoveSottoVoci },
        },
      };
    }

    case 'IMPOSTA_NUM_INFISSI': {
      const config = state.macroSlot.infissi ?? defaultMacroSlotConfig('infissi');
      return {
        ...state,
        macroSlot: {
          ...state.macroSlot,
          infissi: {
            ...config,
            numPorte: action.numPorte ?? config.numPorte,
            numFinestre: action.numFinestre ?? config.numFinestre,
          },
        },
      };
    }

    case 'SET_FINITURA':
      return { ...state, finitura: action.finitura };

    case 'SET_TEMPISTICA':
      return { ...state, tempistica: action.tempistica };

    case 'SET_CONTATTI':
      return { ...state, contatti: { ...state.contatti, ...action.patch } };

    case 'AGGIORNA_VOCE_DETTAGLIATA': {
      const idx = state.vociDettagliate.findIndex(
        (v) => v.voceId === action.voce.voceId && v.ambienteId === action.voce.ambienteId
      );
      if (idx === -1) {
        return { ...state, vociDettagliate: [...state.vociDettagliate, action.voce] };
      }
      const nuove = [...state.vociDettagliate];
      nuove[idx] = action.voce;
      return { ...state, vociDettagliate: nuove };
    }

    case 'RIMUOVI_VOCE_DETTAGLIATA':
      return {
        ...state,
        vociDettagliate: state.vociDettagliate.filter(
          (v) => !(v.voceId === action.voceId && v.ambienteId === action.ambienteId)
        ),
      };

    case 'IMPOSTA_VOCI_DETTAGLIATE':
      return { ...state, vociDettagliate: action.voci };

    case 'RESET_VOCI_DETTAGLIATE':
      return { ...state, vociDettagliate: [] };

    case 'RESET':
      pulisciLocalStorage();
      return statoIniziale();

    case 'CARICA':
      return action.state;

    default:
      return state;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Context + Provider
// ────────────────────────────────────────────────────────────────────────────

interface ProgettoContextValue {
  state: ProgettoState;
  dispatch: React.Dispatch<ProgettoAction>;
}

const ProgettoContext = createContext<ProgettoContextValue | null>(null);

export function ProgettoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const salvato = caricaDaLocalStorage();
    return salvato ?? statoIniziale();
  });

  // Sync su localStorage ad ogni cambio di stato
  useEffect(() => {
    salvaSuLocalStorage(state);
  }, [state]);

  return (
    <ProgettoContext.Provider value={{ state, dispatch }}>
      {children}
    </ProgettoContext.Provider>
  );
}

export function useProgetto(): ProgettoContextValue {
  const ctx = useContext(ProgettoContext);
  if (!ctx) throw new Error('useProgetto: missing ProgettoProvider');
  return ctx;
}
