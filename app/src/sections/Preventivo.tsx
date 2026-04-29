import { useEffect, useMemo, useState } from 'react';
import {
  Home as HomeIcon,
  Bath,
  Bed,
  Zap,
  Droplet,
  Flame,
  Square,
  Paintbrush,
  Shield,
  Cpu,
  BadgeCheck,
  Plus,
  Minus,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Mail,
  Phone,
  User,
  ChefHat,
  type LucideIcon,
} from 'lucide-react';
import { loadPriceData, basePerSqmForCategory, type PriceData } from '@/lib/prezzario';

// ────────────────────────────────────────────────────────────────────────────
// Catalogo interventi
// `dbCategory` punta al campo `voci.categoria` su Supabase. Se il dato è
// presente nel DB, sostituisce `basePerSqm` con la media reale delle voci
// validate. Per gli interventi compositi (completa, cucina, bagno, camera)
// usiamo il fallback hardcoded — sono pacchetti che combinano più categorie.
// ────────────────────────────────────────────────────────────────────────────
type Intervento = {
  id: string;
  label: string;
  desc: string;
  Icon: LucideIcon;
  basePerSqm: number;
  fixedMin?: number;
  fixedMax?: number;
  dbCategory?: string;
};

const INTERVENTI: Intervento[] = [
  {
    id: 'completa',
    label: 'Ristrutturazione Completa',
    desc: 'Intero appartamento chiavi in mano',
    Icon: HomeIcon,
    basePerSqm: 850,
  },
  {
    id: 'cucina',
    label: 'Cucina',
    desc: 'Rifacimento cucina completo',
    Icon: ChefHat,
    basePerSqm: 1200,
  },
  {
    id: 'bagno',
    label: 'Bagno',
    desc: 'Rifacimento bagno completo',
    Icon: Bath,
    basePerSqm: 1400,
  },
  {
    id: 'camera',
    label: 'Camera / Stanza',
    desc: 'Tinteggiatura, pavimento, impianti',
    Icon: Bed,
    basePerSqm: 400,
  },
  {
    id: 'elettrico',
    label: 'Impianto Elettrico',
    desc: 'Rifacimento o adeguamento',
    Icon: Zap,
    basePerSqm: 110,
    dbCategory: 'Impianto elettrico',
  },
  {
    id: 'idraulico',
    label: 'Impianto Idraulico',
    desc: 'Tubazioni e scarichi',
    Icon: Droplet,
    basePerSqm: 130,
    dbCategory: 'Impianto idraulico',
  },
  {
    id: 'riscaldamento',
    label: 'Riscaldamento',
    desc: 'Caldaia, radiatori, pavimento radiante',
    Icon: Flame,
    basePerSqm: 160,
    dbCategory: 'Impianto termico',
  },
  {
    id: 'infissi',
    label: 'Infissi & Porte',
    desc: 'Sostituzione finestre e porte interne',
    Icon: Square,
    basePerSqm: 220,
    dbCategory: 'Serramenti e porte interne',
  },
  {
    id: 'tinteggiatura',
    label: 'Tinteggiatura',
    desc: 'Imbiancatura e decorazioni',
    Icon: Paintbrush,
    basePerSqm: 25,
    dbCategory: 'Pittura e finiture',
  },
  {
    id: 'piccolo',
    label: 'Piccolo Intervento',
    desc: 'Riparazioni puntuali',
    Icon: Shield,
    basePerSqm: 0,
    fixedMin: 200,
    fixedMax: 1500,
  },
];

const FINITURE = [
  { id: 'base', label: 'Economiche', desc: 'Materiali standard, ottimo qualità/prezzo', mult: 0.85 },
  { id: 'medio', label: 'Medie', desc: 'Marche note, buona qualità', mult: 1.0 },
  { id: 'premium', label: 'Premium', desc: 'Alta gamma, design, materiali nobili', mult: 1.35 },
  { id: 'luxury', label: 'Luxury', desc: 'Su misura, marmi, marchi di lusso', mult: 1.75 },
];

const EXTRA = [
  { id: 'domotica', label: 'Impianto domotico', price: 3500, Icon: Cpu },
  { id: 'cappotto', label: 'Cappotto termico', price: 8000, Icon: Shield },
  { id: 'climatizzazione', label: 'Climatizzazione', price: 4200, Icon: Flame },
  { id: 'allarme', label: 'Impianto allarme', price: 1800, Icon: Zap },
  { id: 'cucinasumisura', label: 'Cucina su misura', price: 12000, Icon: ChefHat },
  { id: 'cabinaarmadio', label: 'Cabina armadio', price: 3800, Icon: Bed },
  { id: 'pratiche', label: 'Pratiche edilizie', price: 1500, Icon: BadgeCheck },
];

const TEMPISTICHE = [
  { id: 'urgente', label: 'Urgente', desc: 'Inizio entro 2 settimane', mult: 1.15 },
  { id: 'normale', label: 'Standard', desc: 'Inizio entro 1-2 mesi', mult: 1.0 },
  { id: 'flessibile', label: 'Flessibile', desc: 'Migliori prezzi', mult: 0.93 },
];

const STEPS = [
  { id: 1, label: 'Intervento' },
  { id: 2, label: 'Dimensioni' },
  { id: 3, label: 'Finiture' },
  { id: 4, label: 'Extra' },
  { id: 5, label: 'Riepilogo' },
];

type WizardState = {
  interventi: string[];
  sqm: number;
  finitura: string;
  extra: string[];
  tempistica: string;
  contatti: { name: string; email: string; phone: string };
};

const fmt = (n: number) =>
  new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);

function computeEstimate(state: WizardState, prices: PriceData) {
  const { interventi, sqm, finitura, extra, tempistica } = state;
  if (interventi.length === 0) return { min: 0, max: 0 };

  let min = 0;
  let max = 0;

  for (const id of interventi) {
    const it = INTERVENTI.find((x) => x.id === id);
    if (!it) continue;

    if (it.fixedMin && it.fixedMax) {
      min += it.fixedMin;
      max += it.fixedMax;
      continue;
    }

    // Prezzo base: dal DB se la categoria è mappata e i dati sono pronti, altrimenti fallback.
    const base = it.dbCategory
      ? basePerSqmForCategory(prices, it.dbCategory, it.basePerSqm)
      : it.basePerSqm;

    // Cap intelligente: per gli interventi "stanza" (bagno, cucina, camera) limitiamo
    // la superficie al massimo realistico di quella stanza per evitare sovrastime.
    const cap =
      it.id === 'bagno' ? 10 : it.id === 'cucina' ? 25 : it.id === 'camera' ? 20 : sqm;
    const baseArea = it.id === 'completa' ? sqm : Math.min(sqm, cap);

    min += base * baseArea * 0.85;
    max += base * baseArea * 1.15;
  }

  const finMult = FINITURE.find((f) => f.id === finitura)?.mult ?? 1;
  const timMult = TEMPISTICHE.find((t) => t.id === tempistica)?.mult ?? 1;
  min *= finMult * timMult;
  max *= finMult * timMult;

  for (const id of extra) {
    const e = EXTRA.find((x) => x.id === id);
    if (!e) continue;
    min += e.price * 0.9;
    max += e.price * 1.15;
  }

  return {
    min: Math.round(min / 100) * 100,
    max: Math.round(max / 100) * 100,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Stepper
// ────────────────────────────────────────────────────────────────────────────
function Stepper({ step }: { step: number }) {
  return (
    <>
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#F5B800] font-semibold">
              Step {step} di {STEPS.length}
            </div>
            <div className="font-display text-lg font-bold">{STEPS[step - 1].label}</div>
          </div>
          <div className="text-sm text-[#666666]">
            {Math.round((step / STEPS.length) * 100)}%
          </div>
        </div>
        <div className="h-2 bg-[#E5E5E5] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#F5B800] transition-all duration-300"
            style={{ width: `${(step / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

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
                      : 'bg-white border-[#E5E5E5] text-[#666666]'
                }`}
              >
                {step > s.id ? <Check className="w-5 h-5" /> : s.id}
              </div>
              <div className="text-center">
                <div
                  className={`text-[10px] uppercase tracking-wider font-mono ${step === s.id ? 'text-[#F5B800]' : 'text-[#666666]'}`}
                >
                  Step {s.id}
                </div>
                <div
                  className={`text-sm font-medium truncate ${step >= s.id ? 'text-[#1A1A1A]' : 'text-[#666666]'}`}
                >
                  {s.label}
                </div>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 flex-1 max-w-16 ${step > s.id ? 'bg-[#F5B800]' : 'bg-[#E5E5E5]'}`}
              />
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Step 1 — Interventi
// ────────────────────────────────────────────────────────────────────────────
function StepInterventi({
  state,
  setState,
  prices,
}: {
  state: WizardState;
  setState: (s: WizardState) => void;
  prices: PriceData;
}) {
  const toggle = (id: string) => {
    setState({
      ...state,
      interventi: state.interventi.includes(id)
        ? state.interventi.filter((x) => x !== id)
        : [...state.interventi, id],
    });
  };

  return (
    <div>
      <h3 className="font-display text-2xl font-bold mb-2">Cosa vuoi ristrutturare?</h3>
      <p className="text-[#666666] mb-6">
        Seleziona uno o più interventi.{' '}
        {prices.ready && (
          <span className="text-[#F5B800] text-sm">
            ✓ {prices.totalVoci} voci di prezzario caricate dal database MB
          </span>
        )}
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {INTERVENTI.map((it) => {
          const sel = state.interventi.includes(it.id);
          const realPrice = it.dbCategory
            ? basePerSqmForCategory(prices, it.dbCategory, it.basePerSqm)
            : null;
          return (
            <button
              key={it.id}
              onClick={() => toggle(it.id)}
              className={`text-left p-4 rounded-2xl border-2 transition ${
                sel
                  ? 'border-[#F5B800] bg-[#F5B800]/10'
                  : 'border-[#E5E5E5] bg-white hover:border-[#F5B800]/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    sel ? 'bg-[#F5B800] text-[#1A1A1A]' : 'bg-[#F5B800]/10 text-[#F5B800]'
                  }`}
                >
                  <it.Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm">{it.label}</div>
                  <div className="text-[11px] text-[#666666] mt-0.5 leading-tight">{it.desc}</div>
                  {realPrice !== null && realPrice !== it.basePerSqm && (
                    <div className="text-[10px] text-[#F5B800] font-mono mt-1">
                      ~ {fmt(realPrice)} medio (DB)
                    </div>
                  )}
                </div>
                {sel && <Check className="w-4 h-4 text-[#F5B800] flex-shrink-0" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Step 2 — Dimensioni
// ────────────────────────────────────────────────────────────────────────────
function StepDimensioni({
  state,
  setState,
}: {
  state: WizardState;
  setState: (s: WizardState) => void;
}) {
  return (
    <div>
      <h3 className="font-display text-2xl font-bold mb-2">Quanti metri quadri?</h3>
      <p className="text-[#666666] mb-8">
        Inserisci la superficie totale dell'intervento (anche approssimativa).
      </p>

      <div className="bg-white border-2 border-[#E5E5E5] rounded-3xl p-8 max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="font-display text-6xl font-bold text-[#F5B800]">{state.sqm}</div>
          <div className="text-sm text-[#666666] mt-1">metri quadri</div>
        </div>
        <div className="flex items-center justify-center gap-3 mb-6">
          <button
            onClick={() => setState({ ...state, sqm: Math.max(5, state.sqm - 5) })}
            className="w-12 h-12 rounded-full bg-[#F8F8F8] hover:bg-[#F5B800]/10 flex items-center justify-center"
          >
            <Minus className="w-5 h-5" />
          </button>
          <input
            type="number"
            min={5}
            max={500}
            step={5}
            value={state.sqm}
            onChange={(e) => setState({ ...state, sqm: Math.max(5, Number(e.target.value) || 5) })}
            className="w-24 text-center text-xl font-semibold p-2 rounded-lg border border-[#E5E5E5] focus:border-[#F5B800] outline-none"
          />
          <button
            onClick={() => setState({ ...state, sqm: state.sqm + 5 })}
            className="w-12 h-12 rounded-full bg-[#F8F8F8] hover:bg-[#F5B800]/10 flex items-center justify-center"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <input
          type="range"
          min={10}
          max={300}
          step={5}
          value={state.sqm}
          onChange={(e) => setState({ ...state, sqm: Number(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-[#666666] mt-1">
          <span>10 m²</span>
          <span>300 m²</span>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Step 3 — Finiture & tempistica
// ────────────────────────────────────────────────────────────────────────────
function StepFiniture({
  state,
  setState,
}: {
  state: WizardState;
  setState: (s: WizardState) => void;
}) {
  return (
    <div>
      <h3 className="font-display text-2xl font-bold mb-2">Livello di finiture</h3>
      <p className="text-[#666666] mb-6">La qualità dei materiali incide sul prezzo finale.</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        {FINITURE.map((f) => {
          const sel = state.finitura === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setState({ ...state, finitura: f.id })}
              className={`text-left p-5 rounded-2xl border-2 transition ${
                sel
                  ? 'border-[#F5B800] bg-[#F5B800]/10'
                  : 'border-[#E5E5E5] bg-white hover:border-[#F5B800]/40'
              }`}
            >
              <div className="font-display text-xl font-bold mb-1">{f.label}</div>
              <div className="text-xs text-[#666666] leading-tight mb-3">{f.desc}</div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#F5B800]">
                ×{f.mult.toFixed(2)}
              </div>
            </button>
          );
        })}
      </div>

      <h3 className="font-display text-2xl font-bold mb-2">Tempistica</h3>
      <p className="text-[#666666] mb-6">Quando vorresti iniziare i lavori?</p>

      <div className="grid sm:grid-cols-3 gap-3">
        {TEMPISTICHE.map((t) => {
          const sel = state.tempistica === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setState({ ...state, tempistica: t.id })}
              className={`text-left p-4 rounded-2xl border-2 transition ${
                sel
                  ? 'border-[#F5B800] bg-[#F5B800]/10'
                  : 'border-[#E5E5E5] bg-white hover:border-[#F5B800]/40'
              }`}
            >
              <div className="font-semibold">{t.label}</div>
              <div className="text-xs text-[#666666] mt-0.5">{t.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Step 4 — Extra
// ────────────────────────────────────────────────────────────────────────────
function StepExtra({
  state,
  setState,
}: {
  state: WizardState;
  setState: (s: WizardState) => void;
}) {
  const toggle = (id: string) => {
    setState({
      ...state,
      extra: state.extra.includes(id)
        ? state.extra.filter((x) => x !== id)
        : [...state.extra, id],
    });
  };

  return (
    <div>
      <h3 className="font-display text-2xl font-bold mb-2">Vuoi aggiungere altro?</h3>
      <p className="text-[#666666] mb-6">
        Servizi e dotazioni extra (facoltativi). Ogni voce è opzionale.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {EXTRA.map((e) => {
          const sel = state.extra.includes(e.id);
          return (
            <button
              key={e.id}
              onClick={() => toggle(e.id)}
              className={`flex items-center justify-between p-4 rounded-2xl border-2 transition text-left ${
                sel
                  ? 'border-[#F5B800] bg-[#F5B800]/10'
                  : 'border-[#E5E5E5] bg-white hover:border-[#F5B800]/40'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    sel ? 'bg-[#F5B800] text-[#1A1A1A]' : 'bg-[#F5B800]/10 text-[#F5B800]'
                  }`}
                >
                  <e.Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{e.label}</div>
                  <div className="text-xs text-[#666666]">+ {fmt(e.price)}</div>
                </div>
              </div>
              {sel && <Check className="w-4 h-4 text-[#F5B800] flex-shrink-0 ml-2" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Step 5 — Riepilogo + invio
// ────────────────────────────────────────────────────────────────────────────
function StepRiepilogo({
  state,
  setState,
  est,
  onSubmit,
  submitted,
}: {
  state: WizardState;
  setState: (s: WizardState) => void;
  est: { min: number; max: number };
  onSubmit: () => void;
  submitted: boolean;
}) {
  if (submitted) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-[#F5B800] rounded-full flex items-center justify-center mx-auto mb-5">
          <Check className="w-8 h-8 text-[#1A1A1A]" />
        </div>
        <h3 className="font-display text-3xl font-bold mb-3">Richiesta inviata!</h3>
        <p className="text-[#666666] max-w-md mx-auto">
          Grazie {state.contatti.name || 'per la fiducia'}. Ti contatteremo entro 24 ore per
          fissare un sopralluogo gratuito e confermare il preventivo.
        </p>
      </div>
    );
  }

  const labels = state.interventi
    .map((id) => INTERVENTI.find((x) => x.id === id)?.label)
    .filter(Boolean);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div>
        <h3 className="font-display text-2xl font-bold mb-2">Riepilogo</h3>
        <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 space-y-3 text-sm">
          <div>
            <div className="text-[10px] font-mono uppercase text-[#666666]">Interventi</div>
            <div className="font-medium">{labels.join(', ') || '—'}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-[#666666]">Superficie</div>
            <div className="font-medium">{state.sqm} m²</div>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-[#666666]">Finiture</div>
            <div className="font-medium">
              {FINITURE.find((f) => f.id === state.finitura)?.label}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-[#666666]">Tempistica</div>
            <div className="font-medium">
              {TEMPISTICHE.find((t) => t.id === state.tempistica)?.label}
            </div>
          </div>
          {state.extra.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase text-[#666666]">Extra</div>
              <div className="font-medium">
                {state.extra
                  .map((id) => EXTRA.find((e) => e.id === id)?.label)
                  .filter(Boolean)
                  .join(', ')}
              </div>
            </div>
          )}
          <div className="pt-3 border-t border-[#E5E5E5]">
            <div className="text-[10px] font-mono uppercase text-[#666666]">Stima</div>
            <div className="font-display text-3xl font-bold text-[#F5B800]">
              {fmt(est.min)} – {fmt(est.max)}
            </div>
            <div className="text-[11px] text-[#666666] mt-1">
              Stima orientativa basata sui prezzi MB. Il preventivo definitivo viene confermato
              dopo sopralluogo gratuito.
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-display text-2xl font-bold mb-2">I tuoi contatti</h3>
        <p className="text-[#666666] mb-4 text-sm">
          Lasciaci nome, email e telefono — ti chiamiamo entro 24h.
        </p>
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs flex items-center gap-1 text-[#666666] mb-1">
              <User className="w-3.5 h-3.5" /> Nome e cognome
            </span>
            <input
              type="text"
              value={state.contatti.name}
              onChange={(e) =>
                setState({ ...state, contatti: { ...state.contatti, name: e.target.value } })
              }
              className="w-full p-3 rounded-xl border border-[#E5E5E5] focus:border-[#F5B800] outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs flex items-center gap-1 text-[#666666] mb-1">
              <Mail className="w-3.5 h-3.5" /> Email
            </span>
            <input
              type="email"
              value={state.contatti.email}
              onChange={(e) =>
                setState({ ...state, contatti: { ...state.contatti, email: e.target.value } })
              }
              className="w-full p-3 rounded-xl border border-[#E5E5E5] focus:border-[#F5B800] outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs flex items-center gap-1 text-[#666666] mb-1">
              <Phone className="w-3.5 h-3.5" /> Telefono
            </span>
            <input
              type="tel"
              value={state.contatti.phone}
              onChange={(e) =>
                setState({ ...state, contatti: { ...state.contatti, phone: e.target.value } })
              }
              className="w-full p-3 rounded-xl border border-[#E5E5E5] focus:border-[#F5B800] outline-none"
            />
          </label>
        </div>
        <button
          onClick={onSubmit}
          disabled={!state.contatti.name || !state.contatti.email}
          className="mt-5 w-full bg-[#F5B800] hover:bg-[#D9A200] disabled:opacity-50 disabled:cursor-not-allowed text-[#1A1A1A] font-semibold py-3 rounded-full flex items-center justify-center gap-2"
        >
          Invia richiesta preventivo <ArrowRight className="w-4 h-4" />
        </button>
        <div className="text-[11px] text-[#666666] mt-2 text-center">
          Trattiamo i tuoi dati nel rispetto del GDPR. Sopralluogo gratuito.
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sezione principale
// ────────────────────────────────────────────────────────────────────────────
export default function Preventivo() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [prices, setPrices] = useState<PriceData>({
    ready: false,
    byCategory: {},
    totalVoci: 0,
  });
  const [state, setState] = useState<WizardState>({
    interventi: [],
    sqm: 80,
    finitura: 'medio',
    extra: [],
    tempistica: 'normale',
    contatti: { name: '', email: '', phone: '' },
  });

  // Carica i prezzi reali del prezzario MB da Supabase al mount.
  useEffect(() => {
    loadPriceData().then(setPrices);
  }, []);

  const est = useMemo(() => computeEstimate(state, prices), [state, prices]);

  const canNext = (): boolean => {
    if (step === 1) return state.interventi.length > 0;
    if (step === 2) return state.sqm >= 5;
    if (step === 3) return !!state.finitura && !!state.tempistica;
    return true;
  };

  return (
    <section
      id="preventivo"
      className="py-20 lg:py-28 bg-gradient-to-b from-[#FFF8E7]/40 to-white"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 bg-[#F5B800]/10 text-[#1A1A1A] px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4 text-[#F5B800]" />
            Stima immediata in 5 step
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold leading-tight">
            Crea la tua <span className="text-[#F5B800]">bozza di preventivo</span>
          </h2>
          <p className="text-[#666666] text-lg mt-3">
            Configuratore guidato basato sul nostro prezzario reale. Stima orientativa,
            preventivo definitivo dopo sopralluogo gratuito.
          </p>
        </div>

        <div className="bg-white border border-[#E5E5E5] rounded-3xl shadow-sm p-6 lg:p-10">
          <Stepper step={step} />

          <div className="mt-10">
            {step === 1 && <StepInterventi state={state} setState={setState} prices={prices} />}
            {step === 2 && <StepDimensioni state={state} setState={setState} />}
            {step === 3 && <StepFiniture state={state} setState={setState} />}
            {step === 4 && <StepExtra state={state} setState={setState} />}
            {step === 5 && (
              <StepRiepilogo
                state={state}
                setState={setState}
                est={est}
                submitted={submitted}
                onSubmit={() => setSubmitted(true)}
              />
            )}
          </div>

          {!submitted && (
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-[#E5E5E5]">
              <div>
                {step > 1 && (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="flex items-center gap-2 px-5 py-3 rounded-full border border-[#E5E5E5] hover:bg-[#F8F8F8] text-sm"
                  >
                    <ArrowLeft className="w-4 h-4" /> Indietro
                  </button>
                )}
              </div>

              {/* Stima fluttuante (visibile dallo step 1) */}
              {state.interventi.length > 0 && step < 5 && (
                <div className="hidden md:flex flex-col items-end mr-4">
                  <div className="text-[10px] font-mono uppercase text-[#666666]">
                    Stima preliminare
                  </div>
                  <div className="font-display text-xl font-bold text-[#F5B800]">
                    {est.max > 0 ? `fino a ${fmt(est.max)}` : '—'}
                  </div>
                </div>
              )}

              {step < STEPS.length ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={!canNext()}
                  className="flex items-center gap-2 bg-[#F5B800] hover:bg-[#D9A200] disabled:opacity-50 disabled:cursor-not-allowed text-[#1A1A1A] font-semibold px-6 py-3 rounded-full text-sm"
                >
                  Continua <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div />
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
