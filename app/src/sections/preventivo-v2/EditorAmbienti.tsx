/**
 * Editor della casa intera (ristrutturazione completa).
 *
 * Due livelli, coerenti tra loro:
 *  1. Metratura TOTALE dell'appartamento — barra/slider 0-500 m² (mqTotaliDichiarati).
 *     È il valore su cui si basa la stima della ristrutturazione completa.
 *  2. Distribuzione opzionale negli ambienti — la metratura si scrive ambiente per
 *     ambiente; si aggiungono/eliminano vani. Un indicatore mostra quanti m²
 *     restano da distribuire (o quanti sono stati distribuiti oltre il dichiarato).
 */

import { Plus, Home, Trash2, Info, AlertTriangle } from 'lucide-react';
import {
  type AmbienteTipo,
  LABEL_AMBIENTE,
  mqDistribuiti,
} from '@/lib/preventivoModel';
import { useProgetto } from './state';

const TIPI_AMBIENTE: AmbienteTipo[] = ['cucina', 'bagno', 'soggiorno', 'camera', 'corridoio', 'altro'];

export default function EditorAmbienti() {
  const { state, dispatch } = useProgetto();
  const dichiarati = state.mqTotaliDichiarati;
  const distribuiti = mqDistribuiti(state);
  const residui = dichiarati - distribuiti;

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-2xl overflow-hidden">
      {/* Header con totale dichiarati / distribuiti / ambienti */}
      <div className="flex items-center justify-between gap-3 p-4 border-b border-[#E5E5E5]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#F5B800]/10 text-[#F5B800] flex items-center justify-center flex-shrink-0">
            <Home className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#666]">La tua casa</div>
            <div className="font-semibold text-sm">
              <span className="text-[#F5B800]">{dichiarati} m²</span>
              <span className="text-[#666] font-normal">
                {' '}dichiarati · {state.ambienti.length} ambienti · {distribuiti} m² distribuiti
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Metratura totale dell'appartamento — barra 0-500 */}
      <div className="p-4 border-b border-[#E5E5E5]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[#666]">Metri quadri totali dell'appartamento</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={20}
              max={500}
              step={5}
              value={dichiarati}
              onChange={(e) =>
                dispatch({
                  type: 'IMPOSTA_MQ_TOTALI',
                  // Minimo 20 m²: a 0 la UI mostrava "0 m²" ma la stima usa il
                  // fallback (80 m²) → prezzo incoerente. Un pavimento evita il gap.
                  mq: Math.max(20, Math.min(500, Number(e.target.value) || 0)),
                })
              }
              className="w-20 text-right p-1 rounded border border-[#E5E5E5] focus:border-[#F5B800] outline-none font-mono text-sm font-semibold"
              aria-label="Metri quadri totali dell'appartamento"
            />
            <span className="text-xs text-[#666]">m²</span>
          </div>
        </div>
        <input
          type="range"
          min={20}
          max={500}
          step={5}
          value={dichiarati}
          onChange={(e) => dispatch({ type: 'IMPOSTA_MQ_TOTALI', mq: Math.max(20, Number(e.target.value)) })}
          className="w-full accent-[#F5B800]"
          aria-label="Metri quadri totali dell'appartamento (slider)"
        />
        <div className="flex justify-between text-[10px] text-[#999] mt-1">
          <span>20</span>
          <span>500</span>
        </div>
        {dichiarati > 0 && residui !== 0 && (
          <div
            className={`mt-2 text-[11px] flex items-start gap-1.5 ${
              residui > 0 ? 'text-[#666]' : 'text-orange-600'
            }`}
          >
            {residui > 0 ? (
              <>
                <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <span>
                  Ti restano <strong>{residui} m²</strong> da distribuire negli ambienti
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <span>
                  Hai distribuito <strong>{Math.abs(residui)} m²</strong> oltre il totale dichiarato.
                  Aumenta i m² dell'appartamento o riduci gli ambienti.
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Distribuzione opzionale: m² per ogni ambiente + elimina */}
      <div className="divide-y divide-[#F0F0F0]">
        {state.ambienti.length === 0 ? (
          <div className="p-5 text-sm text-[#666] text-center">
            Aggiungi gli ambienti della casa e indica i m² di ognuno (opzionale).
          </div>
        ) : (
          state.ambienti.map((a) => (
            <div key={a.id} className="flex items-center gap-3 p-3 sm:p-4">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{a.nome}</div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#999]">
                  {LABEL_AMBIENTE[a.tipo]}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <input
                  type="number"
                  min={0}
                  max={500}
                  step={0.5}
                  value={a.mq}
                  onChange={(e) =>
                    dispatch({
                      type: 'AGGIORNA_AMBIENTE',
                      id: a.id,
                      patch: { mq: Math.max(0, Math.min(500, Number(e.target.value) || 0)) },
                    })
                  }
                  className="w-20 text-right p-1.5 rounded border border-[#E5E5E5] focus:border-[#F5B800] outline-none font-mono text-base font-semibold"
                  aria-label={`Metri quadri ${a.nome}`}
                />
                <span className="text-sm text-[#666]">m²</span>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'RIMUOVI_AMBIENTE', id: a.id })}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[#999] hover:text-[#C0392B] hover:bg-[#C0392B]/10 transition"
                  aria-label={`Elimina ${a.nome}`}
                  title="Elimina ambiente"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pulsanti aggiungi ambiente */}
      <div className="p-4 bg-[#FAFAFA] border-t border-[#E5E5E5]">
        <div className="text-[10px] font-mono uppercase tracking-wider text-[#666] mb-2">
          Aggiungi un ambiente
        </div>
        <div className="flex flex-wrap gap-2">
          {TIPI_AMBIENTE.map((t) => (
            <button
              key={t}
              onClick={() => dispatch({ type: 'AGGIUNGI_AMBIENTE', tipo: t })}
              className="text-xs px-3 py-2 rounded-full border border-[#E5E5E5] bg-white hover:bg-[#F5B800]/10 hover:border-[#F5B800] flex items-center gap-1 transition"
            >
              <Plus className="w-3 h-3" />
              {LABEL_AMBIENTE[t]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
