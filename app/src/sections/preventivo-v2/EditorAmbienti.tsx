/**
 * Editor della casa intera — versione minimale.
 *
 * Contiene solo la "anagrafica casa":
 *   - Tipo immobile / piano (placeholder moltiplicatore)
 *   - mq totali (slider 20-500)
 *   - Preset rapidi (Bilocale/Trilocale/Quadrilocale)
 *   - Pulsanti aggiungi ambiente (Cucina/Bagno/...)
 *
 * La lista degli ambienti viene gestita direttamente nelle schede ambiente
 * del Livello 2 (rinomina, mq, elimina inline) — niente ridondanza qui.
 */

import { Plus, Home, Building2, Info, AlertTriangle } from 'lucide-react';
import {
  type AmbienteTipo,
  LABEL_AMBIENTE,
  PIANI,
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
      {/* Header con totale */}
      <div className="flex items-center justify-between gap-3 p-4 border-b border-[#E5E5E5]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#F5B800]/10 text-[#F5B800] flex items-center justify-center flex-shrink-0">
            <Home className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#666]">La tua casa</div>
            <div className="font-semibold text-sm">
              <span className="text-[#F5B800]">{dichiarati} m²</span>
              <span className="text-[#666] font-normal"> dichiarati · {state.ambienti.length}{' '}
              ambienti · {distribuiti} m² distribuiti</span>
            </div>
          </div>
        </div>
      </div>

      {/* Piano dell'immobile */}
      <div className="p-4 border-b border-[#E5E5E5]">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#666] flex items-center gap-1.5">
            <Building2 className="w-3 h-3" />
            Piano
          </div>
          <div className="hidden sm:flex text-[10px] font-mono text-[#999] items-center gap-1">
            <Info className="w-3 h-3" />
            moltiplicatore costo: <span className="text-[#F5B800]">da inserire (DB)</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {PIANI.map((p) => {
            const sel = state.piano === p.id;
            return (
              <button
                key={p.id}
                onClick={() => dispatch({ type: 'SET_PIANO', piano: p.id })}
                className={`text-center p-2.5 rounded-xl border-2 transition text-xs leading-tight ${
                  sel
                    ? 'border-[#F5B800] bg-[#F5B800]/10 font-semibold'
                    : 'border-[#E5E5E5] hover:border-[#F5B800]/40'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Slider mq totali — modifica solo i mq DICHIARATI della casa.
           Gli ambienti restano invariati: l'utente decide come distribuire. */}
      <div className="p-4 border-b border-[#E5E5E5]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[#666]">Metri quadri totali della casa</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={500}
              step={5}
              value={dichiarati}
              onChange={(e) =>
                dispatch({
                  type: 'IMPOSTA_MQ_TOTALI',
                  mq: Math.max(0, Math.min(500, Number(e.target.value) || 0)),
                })
              }
              className="w-20 text-right p-1 rounded border border-[#E5E5E5] focus:border-[#F5B800] outline-none font-mono text-sm font-semibold"
            />
            <span className="text-xs text-[#666]">m²</span>
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={500}
          step={5}
          value={dichiarati}
          onChange={(e) => dispatch({ type: 'IMPOSTA_MQ_TOTALI', mq: Number(e.target.value) })}
          className="w-full accent-[#F5B800]"
        />
        <div className="flex justify-between text-[10px] text-[#999] mt-1">
          <span>0</span>
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
                  Hai distribuito <strong>{Math.abs(residui)} m²</strong> oltre il dichiarato.
                  Aumenta i m² casa o riduci gli ambienti.
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Pulsanti aggiungi ambiente */}
      <div className="p-4 bg-[#FAFAFA]">
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
