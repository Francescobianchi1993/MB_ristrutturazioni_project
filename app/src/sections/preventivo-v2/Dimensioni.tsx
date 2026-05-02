/**
 * Step "Dimensioni" — dinamico in base agli interventi attivi.
 *
 * Tre modalità:
 *   1. completa attiva → editor casa intera (tipo immobile + mq totali + distribuzione)
 *   2. macro stanza attiva (cucina/bagno/camera) → solo i mq di quella stanza
 *   3. solo trasversali (elettrico/idraulico/termico/tinteggiatura/infissi) → mq totali
 *
 * Il piccolo intervento è "a corpo" e non ha campo dimensioni.
 */

import {
  type AmbienteTipo,
  LABEL_AMBIENTE,
  isCompletaAttiva,
  mqTotali,
  mqPerTipo,
} from '@/lib/preventivoModel';
import { Home, Bath, ChefHat, Bed, Ruler } from 'lucide-react';
import { useProgetto } from './state';
import EditorAmbienti from './EditorAmbienti';

const ICONA_TIPO: Record<string, React.ElementType> = {
  bagno: Bath,
  cucina: ChefHat,
  camera: Bed,
};

export default function Dimensioni() {
  const { state } = useProgetto();
  const completaAttiva = isCompletaAttiva(state);

  // Quali macro-slot di tipo "stanza" sono attivi
  const stanzeAttive: AmbienteTipo[] = [];
  if (state.macroSlot.cucina?.attivo) stanzeAttive.push('cucina');
  if (state.macroSlot.bagno?.attivo) stanzeAttive.push('bagno');
  if (state.macroSlot.camera?.attivo) stanzeAttive.push('camera');

  // Quali macro-slot trasversali sono attivi (richiedono mq totali)
  const haTrasversali =
    !!state.macroSlot.elettrico?.attivo ||
    !!state.macroSlot.idraulico?.attivo ||
    !!state.macroSlot.termico?.attivo ||
    !!state.macroSlot.tinteggiatura?.attivo;

  const haInfissi = !!state.macroSlot.infissi?.attivo;
  // ── Modalità 1: ristrutturazione completa
  if (completaAttiva) {
    return (
      <div>
        <h3 className="font-display text-2xl font-bold mb-2">Com'è fatta la tua casa?</h3>
        <p className="text-[#666] mb-6">
          Per la ristrutturazione completa scegli tipo immobile e metratura. Puoi opzionalmente
          dettagliare la distribuzione degli ambienti.
        </p>
        <EditorAmbienti />
      </div>
    );
  }

  // ── Modalità 2/3: stanze puntuali / trasversali / infissi / piccolo
  return (
    <div>
      <h3 className="font-display text-2xl font-bold mb-2">Quanti metri quadri?</h3>
      <p className="text-[#666] mb-6">
        Indica solo le dimensioni che ti servono — non devi descrivere tutta la casa.
      </p>

      <div className="space-y-4">
        {stanzeAttive.map((tipo) => (
          <DimensioneStanza key={tipo} tipo={tipo} />
        ))}

        {haTrasversali && <DimensioneMqTotali />}

        {haInfissi && <DimensioneInfissi />}

        {stanzeAttive.length === 0 && !haTrasversali && !haInfissi && (
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 text-center text-[#666] text-sm">
            Torna allo step precedente e seleziona almeno un intervento.
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Singola stanza (cucina / bagno / camera)
// ────────────────────────────────────────────────────────────────────────────

function DimensioneStanza({ tipo }: { tipo: AmbienteTipo }) {
  const { state, dispatch } = useProgetto();
  const mq = mqPerTipo(state, tipo);
  const Icona = ICONA_TIPO[tipo] ?? Home;

  // Range slider sensato per ogni tipo
  const range =
    tipo === 'bagno'
      ? { min: 2, max: 15, step: 0.5 }
      : tipo === 'cucina'
        ? { min: 4, max: 30, step: 0.5 }
        : { min: 5, max: 40, step: 1 };

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-[#E5E5E5]">
        <div className="w-10 h-10 rounded-xl bg-[#F5B800]/10 text-[#F5B800] flex items-center justify-center flex-shrink-0">
          <Icona className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#666]">
            Intervento
          </div>
          <div className="font-semibold">Quanto è grande {LABEL_AMBIENTE[tipo].toLowerCase()}?</div>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-[#666]">Superficie</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={range.min}
              max={range.max}
              step={range.step}
              value={mq}
              onChange={(e) =>
                dispatch({
                  type: 'IMPOSTA_MQ_PER_TIPO',
                  tipo,
                  mq: Math.max(range.min, Math.min(range.max, Number(e.target.value) || range.min)),
                })
              }
              className="w-20 text-right p-1.5 rounded border border-[#E5E5E5] focus:border-[#F5B800] outline-none font-mono text-base font-semibold"
            />
            <span className="text-sm text-[#666]">m²</span>
          </div>
        </div>
        <input
          type="range"
          min={range.min}
          max={range.max}
          step={range.step}
          value={mq}
          onChange={(e) => dispatch({ type: 'IMPOSTA_MQ_PER_TIPO', tipo, mq: Number(e.target.value) })}
          className="w-full accent-[#F5B800]"
        />
        <div className="flex justify-between text-[10px] text-[#999] mt-1">
          <span>{range.min}</span>
          <span>{range.max} (medio)</span>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Mq totali (per trasversali tipo elettrico/idraulico/tinteggiatura)
// ────────────────────────────────────────────────────────────────────────────

function DimensioneMqTotali() {
  const { state, dispatch } = useProgetto();
  // Mostra il valore dichiarato dall'utente. Se non c'è ancora, fallback alla
  // somma degli ambienti (utile se arriva da preset). Se anche quella è 0,
  // usa 80 come default sensato per appartamento medio.
  const totale = state.mqTotaliDichiarati || mqTotali(state) || 80;

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-[#E5E5E5]">
        <div className="w-10 h-10 rounded-xl bg-[#F5B800]/10 text-[#F5B800] flex items-center justify-center flex-shrink-0">
          <Ruler className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#666]">
            Intervento esteso
          </div>
          <div className="font-semibold">Quanto è grande la casa in totale?</div>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-[#666]">Superficie totale</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={20}
              max={500}
              step={5}
              value={totale}
              onChange={(e) =>
                dispatch({
                  type: 'IMPOSTA_MQ_TOTALI',
                  mq: Math.max(20, Math.min(500, Number(e.target.value) || 20)),
                })
              }
              className="w-20 text-right p-1.5 rounded border border-[#E5E5E5] focus:border-[#F5B800] outline-none font-mono text-base font-semibold"
            />
            <span className="text-sm text-[#666]">m²</span>
          </div>
        </div>
        <input
          type="range"
          min={20}
          max={500}
          step={5}
          value={totale}
          onChange={(e) => dispatch({ type: 'IMPOSTA_MQ_TOTALI', mq: Number(e.target.value) })}
          className="w-full accent-[#F5B800]"
        />
        <div className="flex justify-between text-[10px] text-[#999] mt-1">
          <span>20</span>
          <span>500</span>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Numero infissi
// ────────────────────────────────────────────────────────────────────────────

function DimensioneInfissi() {
  const { state, dispatch } = useProgetto();
  const config = state.macroSlot.infissi;
  const numPorte = config?.numPorte ?? 5;
  const numFinestre = config?.numFinestre ?? 5;

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-[#E5E5E5]">
        <div className="w-10 h-10 rounded-xl bg-[#F5B800]/10 text-[#F5B800] flex items-center justify-center flex-shrink-0 text-xl">
          🪟
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#666]">
            Quanti infissi?
          </div>
          <div className="font-semibold">Indica numero di porte e finestre</div>
        </div>
      </div>

      <div className="p-5 grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs text-[#666] block mb-1">Porte interne</span>
          <input
            type="number"
            min={0}
            max={20}
            value={numPorte}
            onChange={(e) =>
              dispatch({
                type: 'IMPOSTA_NUM_INFISSI',
                numPorte: Math.max(0, Number(e.target.value) || 0),
              })
            }
            className="w-full p-2 rounded-lg border border-[#E5E5E5] focus:border-[#F5B800] outline-none font-mono text-base"
          />
          <span className="text-[11px] text-[#999]">~ € 280 cad</span>
        </label>
        <label className="block">
          <span className="text-xs text-[#666] block mb-1">Finestre</span>
          <input
            type="number"
            min={0}
            max={20}
            value={numFinestre}
            onChange={(e) =>
              dispatch({
                type: 'IMPOSTA_NUM_INFISSI',
                numFinestre: Math.max(0, Number(e.target.value) || 0),
              })
            }
            className="w-full p-2 rounded-lg border border-[#E5E5E5] focus:border-[#F5B800] outline-none font-mono text-base"
          />
          <span className="text-[11px] text-[#999]">~ € 650 cad</span>
        </label>
      </div>
    </div>
  );
}
