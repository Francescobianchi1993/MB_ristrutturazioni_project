/**
 * Livello 1 — Stima rapida.
 *
 * Wizard a 4 step:
 *   1. Ambienti (mq totali + distribuzione)
 *   2. Interventi (macro-slot con sotto-voci toggle)
 *   3. Finiture & tempistica
 *   4. Riepilogo (Riassunto + 3 pulsanti)
 *
 * Tutti gli step leggono e scrivono su `useProgetto()`.
 */

import { useState, useEffect, useRef } from 'react';
import { Check, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useProgetto } from './state';
import {
  MACRO_SLOT,
  MACRO_SLOT_BY_ID,
  FINITURE,
  TEMPISTICHE,
  type MacroSlot,
} from './data';
import { calcolaPrezzo, fmt } from './pricing';
import RiepilogoSticky from './RiepilogoSticky';
import Dimensioni from './Dimensioni';
import { isCompletaAttiva, PIANI } from '@/lib/preventivoModel';
import type { MacroSlotId, Finitura, Tempistica } from '@/lib/preventivoModel';

const STEPS = [
  { id: 1, label: 'Interventi' },
  { id: 2, label: 'Dimensioni' },
  { id: 3, label: 'Finiture' },
  { id: 4, label: 'Riepilogo' },
];

interface LivelloRapidoProps {
  onTorna: () => void;
  onPassaAEsperto: () => void;
  initialStep?: number;
}

export default function LivelloRapido({ onTorna, onPassaAEsperto, initialStep = 1 }: LivelloRapidoProps) {
  const [step, setStep] = useState(initialStep);
  const { state } = useProgetto();
  const result = calcolaPrezzo(state);
  const topRef = useRef<HTMLDivElement>(null);

  // Quando il wizard monta, scrolla in cima (offset 88px per la navbar fissa da 80px)
  useEffect(() => {
    if (!topRef.current) return;
    const y = topRef.current.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  }, []);

  const haAlmenoUnIntervento = Object.values(state.macroSlot).some((s) => s?.attivo);
  const canNext = step === 1 ? haAlmenoUnIntervento : step === 2 ? state.ambienti.length > 0 : true;

  return (
    <div ref={topRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
      <button
        onClick={onTorna}
        className="text-sm text-[#666] hover:text-[#1A1A1A] mb-6 flex items-center gap-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Cambia modalità
      </button>

      <Stepper step={step} />
      {/* Mobile: indicatore step semplice, sostituisce lo stepper grafico nascosto sotto sm */}
      <div className="sm:hidden text-center text-sm text-[#666] mb-2">
        Step <strong className="text-[#1A1A1A]">{step}</strong> di {STEPS.length} —{' '}
        <strong className="text-[#F5B800]">{STEPS[step - 1].label}</strong>
      </div>

      <div className="bg-white border border-[#E5E5E5] rounded-3xl shadow-sm p-6 lg:p-10 mt-8">
        {step === 1 && <StepInterventi />}
        {step === 2 && <Dimensioni />}
        {step === 3 && <StepFiniture />}
        {step === 4 && <StepRiepilogo onPassaAEsperto={onPassaAEsperto} />}

        {step < 4 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#E5E5E5] gap-3">
            <button
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
              className="flex items-center gap-2 px-5 py-3 rounded-full border border-[#E5E5E5] hover:bg-[#F8F8F8] text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" /> Indietro
            </button>

            {result.totale > 0 && (
              <div className="hidden md:flex flex-col items-end mr-2">
                <div className="text-[10px] font-mono uppercase text-[#666]">Stima preliminare</div>
                <div className="font-display text-xl font-bold text-[#F5B800]">
                  {fmt(result.totale)}
                </div>
              </div>
            )}

            <button
              onClick={() => setStep(step + 1)}
              disabled={!canNext}
              className="flex items-center gap-2 bg-[#F5B800] hover:bg-[#D9A200] disabled:opacity-50 disabled:cursor-not-allowed text-[#1A1A1A] font-semibold px-6 py-3 rounded-full text-sm"
            >
              Continua <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Stepper
// ────────────────────────────────────────────────────────────────────────────

function Stepper({ step }: { step: number }) {
  return (
    <div className="hidden sm:flex items-center justify-between gap-2 max-w-3xl mx-auto">
      {STEPS.map((s, i) => (
        <div key={s.id} className="contents">
          <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold transition border-2 ${
                step === s.id
                  ? 'bg-[#F5B800] border-[#F5B800] text-[#1A1A1A] shadow-md'
                  : step > s.id
                    ? 'bg-[#1A1A1A] border-[#1A1A1A] text-[#F5B800]'
                    : 'bg-white border-[#E5E5E5] text-[#666]'
              }`}
            >
              {step > s.id ? <Check className="w-5 h-5" /> : s.id}
            </div>
            <div className="text-center">
              <div
                className={`text-[10px] uppercase tracking-wider font-mono ${step === s.id ? 'text-[#F5B800]' : 'text-[#666]'}`}
              >
                Step {s.id}
              </div>
              <div
                className={`text-sm font-medium ${step >= s.id ? 'text-[#1A1A1A]' : 'text-[#666]'}`}
              >
                {s.label}
              </div>
            </div>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 flex-1 max-w-16 ${step > s.id ? 'bg-[#F5B800]' : 'bg-[#E5E5E5]'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Step 1 — Interventi (macro-slot + sotto-voci)
// ────────────────────────────────────────────────────────────────────────────

function StepInterventi() {
  const { state, dispatch } = useProgetto();
  const completaAttiva = isCompletaAttiva(state);

  function handleToggle(slot: MacroSlot) {
    if (completaAttiva && slot.disabilitatoSeCompleta) {
      toast.warning('Già incluso', {
        description: `${slot.label} è compreso nella Ristrutturazione completa.`,
      });
      return;
    }
    dispatch({ type: 'TOGGLE_MACRO_SLOT', slot: slot.id });
  }

  const macroSlot = MACRO_SLOT.filter((s) => s.gruppo === 'macro');
  const trasversali = MACRO_SLOT.filter((s) => s.gruppo === 'trasversale');

  return (
    <div>
      <h3 className="font-display text-2xl font-bold mb-2">Cosa vuoi ristrutturare?</h3>
      <p className="text-[#666] mb-6">
        Seleziona uno o più interventi. Tariffe da <strong>mercato 2026</strong>. Dentro ogni
        intervento puoi togliere o aggiungere sotto-voci — il prezzo si aggiorna live.
      </p>

      <div className="text-[10px] font-mono uppercase tracking-wider text-[#666] mb-2">
        Interventi principali
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {macroSlot.map((slot) => (
          <CardIntervento key={slot.id} slot={slot} onToggle={handleToggle} />
        ))}
      </div>

      <div className="text-[10px] font-mono uppercase tracking-wider text-[#666] mb-2">
        Interventi specifici (cumulabili)
        {completaAttiva && (
          <span className="ml-2 text-[#F5B800]">· tutti inclusi nella ristrutturazione completa</span>
        )}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {trasversali.map((slot) => (
          <CardIntervento key={slot.id} slot={slot} onToggle={handleToggle} />
        ))}
      </div>
    </div>
  );
}

function CardIntervento({
  slot,
  onToggle,
}: {
  slot: MacroSlot;
  onToggle: (slot: MacroSlot) => void;
}) {
  const { state, dispatch } = useProgetto();
  const config = state.macroSlot[slot.id];
  const attivo = !!config?.attivo;
  const completaAttiva = isCompletaAttiva(state);
  const disabled = completaAttiva && slot.disabilitatoSeCompleta && !attivo;

  const tariffaLabel = slot.tariffaMq
    ? `€ ${slot.tariffaMq.min}–${slot.tariffaMq.max} / m²`
    : slot.tariffaPezzo
      ? `€ ${slot.tariffaPezzo.porta} porta · € ${slot.tariffaPezzo.finestra} finestra`
      : slot.tariffaACorpo
        ? `€ ${slot.tariffaACorpo.min}–${slot.tariffaACorpo.max} a corpo`
        : '';

  return (
    <div
      className={`rounded-2xl border-2 transition self-start ${
        attivo
          ? 'border-[#F5B800] bg-[#F5B800]/5'
          : disabled
            ? 'border-[#E5E5E5] bg-[#FAFAFA] opacity-50'
            : 'border-[#E5E5E5] bg-white hover:border-[#F5B800]/40'
      }`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onToggle(slot)}
        className={`w-full text-left p-4 select-none ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl ${
              attivo ? 'bg-[#F5B800]' : 'bg-[#F5B800]/10'
            }`}
          >
            {slot.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold text-sm">{slot.label}</div>
              {attivo && <Check className="w-4 h-4 text-[#F5B800] flex-shrink-0" />}
            </div>
            <div className="text-[11px] text-[#666] mt-0.5 leading-tight">{slot.desc}</div>
            <div className="text-[10px] font-mono text-[#F5B800] mt-1">{tariffaLabel}</div>
          </div>
        </div>
      </button>

      {attivo && <SottoVociList slot={slot} />}

      {attivo && slot.id === 'infissi' && (
        <div className="px-4 pb-3 grid grid-cols-2 gap-2 border-t border-[#F5B800]/20">
          <label className="text-xs">
            <span className="text-[#666] block mb-1 mt-2">Numero porte</span>
            <input
              type="number"
              min={0}
              max={20}
              value={config?.numPorte ?? 5}
              onChange={(e) =>
                dispatch({
                  type: 'IMPOSTA_NUM_INFISSI',
                  numPorte: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="w-full px-2 py-1.5 rounded border border-[#E5E5E5] focus:border-[#F5B800] outline-none font-mono text-sm"
            />
          </label>
          <label className="text-xs">
            <span className="text-[#666] block mb-1 mt-2">Numero finestre</span>
            <input
              type="number"
              min={0}
              max={20}
              value={config?.numFinestre ?? 5}
              onChange={(e) =>
                dispatch({
                  type: 'IMPOSTA_NUM_INFISSI',
                  numFinestre: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="w-full px-2 py-1.5 rounded border border-[#E5E5E5] focus:border-[#F5B800] outline-none font-mono text-sm"
            />
          </label>
        </div>
      )}
    </div>
  );
}

function SottoVociList({ slot }: { slot: MacroSlot }) {
  const { state, dispatch } = useProgetto();
  const config = state.macroSlot[slot.id];
  if (!config) return null;

  return (
    <div className="border-t border-[#F5B800]/20 px-4 py-3 space-y-1.5 bg-[#FFFEF5]">
      <div className="text-[10px] font-mono uppercase tracking-wider text-[#666] mb-1">
        Cosa includere
      </div>
      {slot.sottoVoci.map((sv) => {
        const attiva = config.sottoVociAttive[sv.id] ?? true;
        return (
          <label
            key={sv.id}
            className="flex items-center gap-2 cursor-pointer text-xs hover:bg-white rounded px-1 py-0.5 transition"
          >
            <input
              type="checkbox"
              checked={attiva}
              onChange={() =>
                dispatch({ type: 'TOGGLE_SOTTO_VOCE', slot: slot.id, sottoVoce: sv.id })
              }
              className="w-3.5 h-3.5 accent-[#F5B800]"
            />
            <span className={`flex-1 ${!attiva ? 'line-through text-[#999]' : ''}`}>
              {sv.label}
            </span>
            <span className="font-mono text-[10px] text-[#666]">{sv.pesoPct}%</span>
          </label>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Step 3 — Finiture & tempistica
// ────────────────────────────────────────────────────────────────────────────

function StepFiniture() {
  const { state, dispatch } = useProgetto();

  return (
    <div>
      <h3 className="font-display text-2xl font-bold mb-2">Livello di finiture</h3>
      <p className="text-[#666] mb-6">La qualità dei materiali incide sul prezzo finale.</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        {FINITURE.map((f) => {
          const sel = state.finitura === f.id;
          return (
            <button
              key={f.id}
              onClick={() => dispatch({ type: 'SET_FINITURA', finitura: f.id as Finitura })}
              className={`text-left p-5 rounded-2xl border-2 transition ${
                sel
                  ? 'border-[#F5B800] bg-[#F5B800]/10'
                  : 'border-[#E5E5E5] bg-white hover:border-[#F5B800]/40'
              }`}
            >
              <div className="font-display text-xl font-bold mb-1">{f.label}</div>
              <div className="text-xs text-[#666] leading-tight mb-3">{f.desc}</div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#F5B800]">
                ×{f.mult.toFixed(2)}
              </div>
            </button>
          );
        })}
      </div>

      <h3 className="font-display text-2xl font-bold mb-2">Tempistica</h3>
      <p className="text-[#666] mb-6">Quando vorresti iniziare i lavori?</p>

      <div className="grid sm:grid-cols-3 gap-3">
        {TEMPISTICHE.map((t) => {
          const sel = state.tempistica === t.id;
          return (
            <button
              key={t.id}
              onClick={() => dispatch({ type: 'SET_TEMPISTICA', tempistica: t.id as Tempistica })}
              className={`text-left p-4 rounded-2xl border-2 transition ${
                sel
                  ? 'border-[#F5B800] bg-[#F5B800]/10'
                  : 'border-[#E5E5E5] bg-white hover:border-[#F5B800]/40'
              }`}
            >
              <div className="font-semibold">{t.label}</div>
              <div className="text-xs text-[#666] mt-0.5">{t.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Step 4 — Riepilogo
// ────────────────────────────────────────────────────────────────────────────

function StepRiepilogo({ onPassaAEsperto }: { onPassaAEsperto: () => void }) {
  const { state } = useProgetto();
  const slotAttivi = (Object.keys(state.macroSlot) as MacroSlotId[]).filter(
    (id) => state.macroSlot[id]?.attivo
  );
  const completa = isCompletaAttiva(state);
  const pianoLabel = PIANI.find((p) => p.id === state.piano)?.label ?? '—';

  return (
    <div>
      <h3 className="font-display text-2xl font-bold mb-2">Ecco la tua stima</h3>
      <p className="text-[#666] mb-6">
        Basata su <strong>tariffe calcolate dal prezzario MB</strong>. Per un preventivo puntuale
        al centesimo passa al livello esperto.
      </p>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-3">
          {completa ? (
            <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5">
              <div className="text-[10px] font-mono uppercase text-[#666] mb-1">Casa</div>
              <div className="text-sm font-medium">
                {state.ambienti.reduce((s, a) => s + a.mq, 0)} m² · {state.ambienti.length}{' '}
                ambienti · {pianoLabel}
              </div>
              <div className="text-xs text-[#666] mt-1">
                {state.ambienti.map((a) => `${a.nome} ${a.mq}m²`).join(' · ')}
              </div>
            </div>
          ) : (
            <DimensioniRiepilogo />
          )}

          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5">
            <div className="text-[10px] font-mono uppercase text-[#666] mb-2">Interventi attivi</div>
            {slotAttivi.length === 0 ? (
              <div className="text-sm text-[#999]">Nessun intervento selezionato</div>
            ) : (
              <ul className="space-y-1.5">
                {slotAttivi.map((id) => {
                  const meta = MACRO_SLOT_BY_ID[id];
                  return (
                    <li key={id} className="text-sm flex items-center gap-2">
                      <span className="text-base">{meta.emoji}</span>
                      <span>{meta.label}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="bg-[#FFF8E7] border border-[#F5B800]/30 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-[#F5B800] flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-[#1A1A1A]" />
              </div>
              <div className="text-sm">
                <strong>Vuoi un preventivo puntuale?</strong> Passa al livello esperto: i tuoi dati
                vengono pre-compilati con le voci specifiche del listino MB.
                <button
                  onClick={onPassaAEsperto}
                  className="block mt-2 text-[#F5B800] font-semibold hover:underline"
                >
                  Vai al preventivo dettagliato →
                </button>
              </div>
            </div>
          </div>
        </div>

        <RiepilogoSticky variant="sticky" mostraDettaglio onSwitchModalita={onPassaAEsperto} />
      </div>
    </div>
  );
}

// Riepilogo "Dimensioni" per modalità non-completa (puntuale / trasversale / infissi)
function DimensioniRiepilogo() {
  const { state } = useProgetto();
  const dettagli: string[] = [];

  if (state.macroSlot.cucina?.attivo) {
    const mq = state.ambienti.filter((a) => a.tipo === 'cucina').reduce((s, a) => s + a.mq, 0);
    dettagli.push(`Cucina ${mq} m²`);
  }
  if (state.macroSlot.bagno?.attivo) {
    const mq = state.ambienti.filter((a) => a.tipo === 'bagno').reduce((s, a) => s + a.mq, 0);
    dettagli.push(`Bagno ${mq} m²`);
  }
  if (state.macroSlot.camera?.attivo) {
    const mq = state.ambienti
      .filter((a) => a.tipo === 'camera' || a.tipo === 'soggiorno')
      .reduce((s, a) => s + a.mq, 0);
    dettagli.push(`Camera/Stanza ${mq} m²`);
  }
  const haTrasversali =
    state.macroSlot.elettrico?.attivo ||
    state.macroSlot.idraulico?.attivo ||
    state.macroSlot.termico?.attivo ||
    state.macroSlot.tinteggiatura?.attivo;
  if (haTrasversali) {
    const tot = state.ambienti.reduce((s, a) => s + a.mq, 0);
    dettagli.push(`Casa ${tot} m² (totali)`);
  }
  if (state.macroSlot.infissi?.attivo) {
    const c = state.macroSlot.infissi;
    dettagli.push(`${c.numPorte ?? 0} porte · ${c.numFinestre ?? 0} finestre`);
  }
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5">
      <div className="text-[10px] font-mono uppercase text-[#666] mb-1">Dimensioni</div>
      <div className="text-sm">{dettagli.length > 0 ? dettagli.join(' · ') : '—'}</div>
    </div>
  );
}
