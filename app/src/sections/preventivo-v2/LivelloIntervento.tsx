/**
 * Livello "Intervento puntuale" — wizard di PRENOTAZIONE.
 *
 * Flusso lineare (vedi schema di riferimento):
 *
 *   PRENOTA IL TUO INTERVENTO
 *        ├── IDRO        (categoria Idraulica del prezzario)
 *        └── ELETTRICO   (categoria Elettrica del prezzario)
 *                 ↓
 *   URGENZA   (Normale | Alta → supplemento +30%, da prezzario)
 *                 ↓
 *   SELEZIONA L'INTERVENTO   (ricerca + lista, info su unità/note)
 *                 ↓
 *   SCEGLI DATA E ORA        (futura sync col Google Calendar aziendale)
 *                 ↓
 *   RIEPILOGO CON COSTO      (totale + eventuale supplemento urgenza)
 *                 ↓
 *   CONFERMA                 (messaggio WhatsApp + aggiungi a calendario)
 *
 * Voci e prezzi arrivano dal prezzario reale MB (`interventiData.ts`).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Droplet,
  Zap as ZapIcon,
  Check,
  CheckCircle2,
  Clock,
  CalendarDays,
  CalendarPlus,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Gauge,
  RotateCcw,
  Info,
  Search,
  X,
  Phone,
  HelpCircle,
  Sparkles,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { VOCI_INTERVENTO, type VoceIntervento, type CategoriaIntervento } from './interventiData';

type Categoria = CategoriaIntervento;
type Urgenza = 'normale' | 'alta';

/** Voce inserita dall'utente quando non trova un intervento in listino. */
interface VoceCustom {
  id: string;
  descrizione: string;
}

const VOCE_BY_ID = new Map(VOCI_INTERVENTO.map((v) => [v.id, v]));

/** Supplemento applicato al totale quando l'urgenza è "Alta" (prezzario: +30%). */
const SUPPLEMENTO_URGENZA_ALTA = 0.3;

/** Numero WhatsApp MB (stesso usato in Contact). */
const WHATSAPP_NUMERO = '393391268722';

/** Slot orari prenotabili. */
const SLOT_ORARI = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];
const GIORNI_SETT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

// ────────────────────────────────────────────────────────────────────────────
// Step del wizard
// ────────────────────────────────────────────────────────────────────────────

const STEPS = ['Tipo', 'Urgenza', 'Intervento', 'Data e ora', 'Riepilogo'] as const;
type StepIndex = 0 | 1 | 2 | 3 | 4;

// ────────────────────────────────────────────────────────────────────────────
// Helper costo + integrazioni (WhatsApp / Calendario)
// ────────────────────────────────────────────────────────────────────────────

function calcolaCosti(selezionati: number[], urgenza: Urgenza) {
  const base = selezionati.reduce((sum, id) => sum + (VOCE_BY_ID.get(id)?.prezzo ?? 0), 0);
  const supplemento = urgenza === 'alta' ? Math.round(base * SUPPLEMENTO_URGENZA_ALTA) : 0;
  return { base, supplemento, totale: base + supplemento };
}

function formatDataLeggibile(data: string): string {
  if (!data) return '';
  const d = new Date(`${data}T00:00:00`);
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function toISODate(d: Date): string {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

function formatICSDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

interface PrenotazioneRiepilogo {
  categoria: Categoria;
  urgenza: Urgenza;
  voci: VoceIntervento[];
  vociCustom: string[];
  data: string;
  ora: string;
  totale: number;
}

/**
 * Salva la prenotazione su Supabase (best-effort). Se il client non è
 * configurato o l'insert fallisce, la prenotazione prosegue comunque verso
 * WhatsApp: il DB è un registro, non un blocco del flusso utente.
 */
async function salvaPrenotazione(p: PrenotazioneRiepilogo): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('prenotazioni_intervento').insert({
      categoria: p.categoria,
      urgenza: p.urgenza,
      data_intervento: p.data || null,
      ora_intervento: p.ora || null,
      voci: p.voci.map((v) => ({ id: v.id, voce: v.voce, prezzo: v.prezzo })),
      voci_custom: p.vociCustom,
      totale_stimato: p.totale,
    });
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[prenotazione] salvataggio non riuscito:', error.message);
    }
  } catch {
    // rete/DB non raggiungibile: si prosegue comunque
  }
}

function titoloEvento(p: PrenotazioneRiepilogo): string {
  const tipo = p.categoria === 'idro' ? 'Idraulico' : 'Elettricista';
  return `Intervento MB — ${tipo}`;
}

function dettaglioTesto(p: PrenotazioneRiepilogo): string {
  const tipo = p.categoria === 'idro' ? 'Idraulico' : 'Elettricista';
  const righe = [
    `Prenotazione intervento — MB Ristrutturazioni`,
    `Tipo: ${tipo}`,
    `Urgenza: ${p.urgenza === 'alta' ? 'Alta (prioritario)' : 'Normale'}`,
    `Quando: ${formatDataLeggibile(p.data)} alle ${p.ora}`,
  ];
  if (p.voci.length > 0) {
    righe.push('', 'Interventi:', ...p.voci.map((v) => `• ${v.voce} — € ${v.prezzo}`));
  }
  if (p.vociCustom.length > 0) {
    righe.push('', 'Richieste personalizzate (prezzo da definire):', ...p.vociCustom.map((d) => `• ${d}`));
  }
  righe.push('', `Totale interventi a listino: € ${p.totale.toFixed(2)}`);
  if (p.vociCustom.length > 0) {
    righe.push('NB: il costo delle richieste personalizzate verrà comunicato a parte.');
  }
  righe.push('Stima orientativa, confermata dopo sopralluogo gratuito.');
  return righe.join('\n');
}

function linkWhatsApp(p: PrenotazioneRiepilogo): string {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(dettaglioTesto(p))}`;
}

function linkGoogleCalendar(p: PrenotazioneRiepilogo): string {
  const start = new Date(`${p.data}T${p.ora}:00`);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const dates = `${formatICSDate(start)}/${formatICSDate(end)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: titoloEvento(p),
    dates,
    details: dettaglioTesto(p),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function scaricaICS(p: PrenotazioneRiepilogo) {
  const start = new Date(`${p.data}T${p.ora}:00`);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MB Ristrutturazioni//Intervento//IT',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@mb-ristrutturazioni`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(start)}`,
    `DTEND:${formatICSDate(end)}`,
    `SUMMARY:${titoloEvento(p)}`,
    `DESCRIPTION:${dettaglioTesto(p).replace(/\n/g, '\\n')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `intervento-mb-${p.data}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success('Evento scaricato', { description: 'Apri il file .ics per aggiungerlo al calendario.' });
}

// ────────────────────────────────────────────────────────────────────────────
// Componente principale
// ────────────────────────────────────────────────────────────────────────────

interface LivelloInterventoProps {
  onTorna: () => void;
}

export default function LivelloIntervento({ onTorna }: LivelloInterventoProps) {
  const [step, setStep] = useState<StepIndex>(0);
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [urgenza, setUrgenza] = useState<Urgenza | null>(null);
  const [selezionati, setSelezionati] = useState<number[]>([]);
  const [vociCustom, setVociCustom] = useState<VoceCustom[]>([]);
  const [data, setData] = useState('');
  const [ora, setOra] = useState('');
  const [confermato, setConfermato] = useState(false);

  // Ancora in cima al wizard: a ogni cambio step ci si riposiziona qui, così
  // (es.) la scelta di data/ora resta in vista e non finisce in fondo pagina.
  const topRef = useRef<HTMLDivElement>(null);
  const montato = useRef(false);
  useEffect(() => {
    if (!montato.current) {
      montato.current = true;
      return;
    }
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step, confermato]);

  const costi = useMemo(
    () => calcolaCosti(selezionati, urgenza ?? 'normale'),
    [selezionati, urgenza],
  );

  const vociCategoria = useMemo(() => {
    if (!categoria) return [];
    return VOCI_INTERVENTO.filter((v) => v.categoria === categoria);
  }, [categoria]);

  const riepilogo: PrenotazioneRiepilogo | null = useMemo(() => {
    if (!categoria || !urgenza) return null;
    return {
      categoria,
      urgenza,
      voci: selezionati.map((id) => VOCE_BY_ID.get(id)!).filter(Boolean),
      vociCustom: vociCustom.map((c) => c.descrizione),
      data,
      ora,
      totale: costi.totale,
    };
  }, [categoria, urgenza, selezionati, vociCustom, data, ora, costi.totale]);

  function scegliCategoria(c: Categoria) {
    // Selezione manuale: si evidenzia la scelta, l'avanzamento avviene con
    // il pulsante "Avanti" (coerente con tutti gli altri step).
    setCategoria(c);
    setSelezionati([]);
    setVociCustom([]);
  }

  function toggleVoce(id: number) {
    setSelezionati((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function aggiungiCustom(descrizione: string) {
    const d = descrizione.trim();
    if (!d) return;
    setVociCustom((prev) => [...prev, { id: crypto.randomUUID(), descrizione: d }]);
  }

  function rimuoviCustom(id: string) {
    setVociCustom((prev) => prev.filter((c) => c.id !== id));
  }

  function ricomincia() {
    setStep(0);
    setCategoria(null);
    setUrgenza(null);
    setSelezionati([]);
    setVociCustom([]);
    setData('');
    setOra('');
    setConfermato(false);
  }

  async function conferma() {
    if (riepilogo) await salvaPrenotazione(riepilogo);
    setConfermato(true);
  }

  const puoAvanzare =
    (step === 0 && categoria !== null) ||
    (step === 1 && urgenza !== null) ||
    (step === 2 && (selezionati.length > 0 || vociCustom.length > 0)) ||
    (step === 3 && data !== '' && ora !== '') ||
    step === 4;

  function avanti() {
    if (step < 4) setStep((s) => (s + 1) as StepIndex);
  }
  function indietro() {
    if (step > 0) setStep((s) => (s - 1) as StepIndex);
  }

  return (
    <div ref={topRef} className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
      {confermato && riepilogo ? (
        <SchermataConferma riepilogo={riepilogo} onRicomincia={ricomincia} onTorna={onTorna} />
      ) : (
        <>
          <button
            onClick={step === 0 ? onTorna : indietro}
            className="text-sm text-[#1A1A1A] hover:text-black font-bold mb-6 flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {step === 0 ? 'Cambia modalità' : 'Indietro'}
          </button>

          <div className="text-center max-w-2xl mx-auto mb-6">
            <div className="inline-flex items-center gap-2 bg-[#F5B800]/10 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <CalendarDays className="w-4 h-4 text-[#F5B800]" />
              Prenota il tuo intervento
            </div>
          </div>

          <Stepper step={step} />

          <div className="mt-8">
            {step === 0 && <StepCategoria categoria={categoria} onScegli={scegliCategoria} />}
            {step === 1 && <StepUrgenza urgenza={urgenza} onScegli={setUrgenza} />}
            {step === 2 && (
              <StepIntervento
                voci={vociCategoria}
                selezionati={selezionati}
                onToggle={toggleVoce}
                vociCustom={vociCustom}
                onAddCustom={aggiungiCustom}
                onRemoveCustom={rimuoviCustom}
              />
            )}
            {step === 3 && <StepDataOra data={data} ora={ora} onData={setData} onOra={setOra} />}
            {step === 4 && riepilogo && (
              <StepRiepilogo riepilogo={riepilogo} costi={costi} onVaiAllaConferma={conferma} />
            )}
          </div>

          {step < 4 && (
            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                onClick={indietro}
                disabled={step === 0}
                className="px-5 py-3 rounded-full font-semibold text-sm flex items-center gap-1.5 transition disabled:opacity-0 text-[#1A1A1A] hover:bg-[#F0F0F0]"
              >
                <ChevronLeft className="w-4 h-4" /> Indietro
              </button>
              <button
                onClick={avanti}
                disabled={!puoAvanzare}
                className="px-7 py-3 rounded-full font-semibold text-sm flex items-center gap-1.5 transition bg-[#1A1A1A] text-white hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Avanti <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-componenti
// ────────────────────────────────────────────────────────────────────────────

function Stepper({ step }: { step: StepIndex }) {
  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
      {STEPS.map((label, i) => {
        const attivo = i === step;
        const fatto = i < step;
        return (
          <div key={label} className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  attivo
                    ? 'bg-[#F5B800] text-[#1A1A1A]'
                    : fatto
                      ? 'bg-[#1A1A1A] text-white'
                      : 'bg-[#E5E5E5] text-[#999]'
                }`}
              >
                {fatto ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={`hidden sm:block text-[10px] font-mono uppercase tracking-wider ${
                  attivo ? 'text-[#1A1A1A] font-bold' : 'text-[#999]'
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-4 sm:w-8 rounded-full ${fatto ? 'bg-[#1A1A1A]' : 'bg-[#E5E5E5]'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StepCategoria({
  categoria,
  onScegli,
}: {
  categoria: Categoria | null;
  onScegli: (c: Categoria) => void;
}) {
  return (
    <div>
      <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-6">
        Di che <span className="text-[#F5B800]">intervento</span> hai bisogno?
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CategoriaCard
          attivo={categoria === 'idro'}
          icona={Droplet}
          titolo="Idraulico"
          sottotitolo="Idraulica · perdite · scarichi · sanitari"
          colore="#3B9ED8"
          onClick={() => onScegli('idro')}
        />
        <CategoriaCard
          attivo={categoria === 'elettrico'}
          icona={ZapIcon}
          titolo="Elettrico"
          sottotitolo="Impianti · prese · luci · quadri"
          colore="#F5B800"
          onClick={() => onScegli('elettrico')}
        />
      </div>
    </div>
  );
}

function CategoriaCard({
  attivo,
  icona: Icona,
  titolo,
  sottotitolo,
  colore,
  onClick,
}: {
  attivo: boolean;
  icona: typeof Droplet;
  titolo: string;
  sottotitolo: string;
  colore: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group text-left rounded-3xl p-6 sm:p-8 border-2 transition shadow-sm hover:shadow-md ${
        attivo ? 'border-[#F5B800] bg-[#FFF8E7]' : 'border-[#E5E5E5] bg-white hover:border-[#F5B800]'
      }`}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition"
        style={{ backgroundColor: `${colore}1A` }}
      >
        <Icona className="w-7 h-7" style={{ color: colore }} />
      </div>
      <div className="font-display text-2xl font-bold mb-1">{titolo}</div>
      <p className="text-sm text-[#666]">{sottotitolo}</p>
      <div className="mt-5 inline-flex items-center gap-2 text-[#F5B800] font-semibold text-sm">
        Scegli <span className="group-hover:translate-x-1 transition">→</span>
      </div>
    </button>
  );
}

function StepUrgenza({
  urgenza,
  onScegli,
}: {
  urgenza: Urgenza | null;
  onScegli: (u: Urgenza) => void;
}) {
  return (
    <div>
      <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-2">
        Quanto è <span className="text-[#F5B800]">urgente</span>?
      </h2>
      <p className="text-center text-sm text-[#666] mb-6">
        L'urgenza alta garantisce priorità in agenda, con un piccolo supplemento.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UrgenzaCard
          attivo={urgenza === 'normale'}
          icona={Clock}
          titolo="Normale"
          descrizione="Pianifichiamo nei primi slot disponibili."
          badge="Nessun supplemento"
          onClick={() => onScegli('normale')}
        />
        <UrgenzaCard
          attivo={urgenza === 'alta'}
          icona={Gauge}
          titolo="Alta"
          descrizione="Priorità assoluta, intervento il prima possibile."
          badge={`+${Math.round(SUPPLEMENTO_URGENZA_ALTA * 100)}% sul totale`}
          onClick={() => onScegli('alta')}
        />
      </div>
    </div>
  );
}

function UrgenzaCard({
  attivo,
  icona: Icona,
  titolo,
  descrizione,
  badge,
  onClick,
}: {
  attivo: boolean;
  icona: typeof Clock;
  titolo: string;
  descrizione: string;
  badge: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-3xl p-6 border-2 transition shadow-sm hover:shadow-md ${
        attivo ? 'border-[#F5B800] bg-[#FFF8E7]' : 'border-[#E5E5E5] bg-white hover:border-[#F5B800]'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-2xl bg-[#F5B800]/10 flex items-center justify-center">
          <Icona className="w-6 h-6 text-[#F5B800]" />
        </div>
        {attivo && <CheckCircle2 className="w-6 h-6 text-[#F5B800]" />}
      </div>
      <div className="font-display text-xl font-bold mb-1">{titolo}</div>
      <p className="text-sm text-[#666] mb-3">{descrizione}</p>
      <span className="inline-block text-[11px] font-mono uppercase tracking-wider bg-[#F5B800]/15 text-[#1A1A1A] px-2.5 py-1 rounded-full">
        {badge}
      </span>
    </button>
  );
}

function StepIntervento({
  voci,
  selezionati,
  onToggle,
  vociCustom,
  onAddCustom,
  onRemoveCustom,
}: {
  voci: VoceIntervento[];
  selezionati: number[];
  onToggle: (id: number) => void;
  vociCustom: VoceCustom[];
  onAddCustom: (descrizione: string) => void;
  onRemoveCustom: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [infoApertoId, setInfoApertoId] = useState<number | null>(null);

  const filtrate = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return voci;
    return voci.filter((v) => v.voce.toLowerCase().includes(q) || v.note.toLowerCase().includes(q));
  }, [voci, search]);

  const totSelezionati = selezionati.length + vociCustom.length;

  return (
    <div>
      <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-2">
        Seleziona <span className="text-[#F5B800]">l'intervento</span>
      </h2>
      <p className="text-center text-sm text-[#666] mb-5">
        Cerca o scorri la lista. Puoi sceglierne più di uno.{' '}
        {totSelezionati > 0 && <strong>{totSelezionati} selezionati</strong>}
      </p>

      {/* Banner: costo chiamata sempre incluso (ben visibile sopra ai prezzi) */}
      <div className="max-w-xl mx-auto mb-4 flex items-center gap-3 rounded-2xl border-2 border-[#F5B800] bg-[#FFF8E7] px-4 py-3">
        <div className="w-9 h-9 rounded-full bg-[#F5B800] flex items-center justify-center flex-shrink-0">
          <Phone className="w-4 h-4 text-[#1A1A1A]" />
        </div>
        <p className="text-sm font-semibold text-[#1A1A1A] leading-snug">
          Nel prezzo è sempre incluso il costo della chiamata.
        </p>
      </div>

      {/* Box voce personalizzata (tra il banner e la ricerca) */}
      <div className="max-w-xl mx-auto mb-5">
        <BoxVoceCustom voci={vociCustom} onAdd={onAddCustom} onRemove={onRemoveCustom} />
      </div>

      {/* Ricerca */}
      <div className="relative max-w-xl mx-auto mb-4">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="es. rubinetto, perdita, presa, faretto…"
          className="w-full pl-12 pr-12 py-3.5 rounded-2xl border-2 border-[#E5E5E5] focus:border-[#F5B800] focus:outline-none text-base"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#1A1A1A]"
            aria-label="Pulisci ricerca"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="text-xs text-[#999] mb-3">
        {filtrate.length} {filtrate.length === 1 ? 'intervento' : 'interventi'}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 items-start gap-3">
        {filtrate.map((v) => (
          <CardIntervento
            key={v.id}
            voce={v}
            selezionato={selezionati.includes(v.id)}
            infoAperto={infoApertoId === v.id}
            onToggle={() => onToggle(v.id)}
            onInfo={() => setInfoApertoId((cur) => (cur === v.id ? null : v.id))}
          />
        ))}
      </div>

      {filtrate.length === 0 && (
        <div className="text-center text-sm text-[#999] py-8">
          Nessun intervento trovato per “{search}”.
        </div>
      )}
    </div>
  );
}

function BoxVoceCustom({
  voci,
  onAdd,
  onRemove,
}: {
  voci: VoceCustom[];
  onAdd: (descrizione: string) => void;
  onRemove: (id: string) => void;
}) {
  const [aperto, setAperto] = useState(false);
  const [testo, setTesto] = useState('');

  function conferma() {
    const t = testo.trim();
    if (!t) return;
    onAdd(t);
    setTesto('');
    setAperto(false);
  }

  return (
    <div>
      {!aperto ? (
        <button
          onClick={() => setAperto(true)}
          className="w-full flex items-center gap-3 rounded-2xl border-2 border-dashed border-[#CFCFCF] hover:border-[#F5B800] bg-white hover:bg-[#FFF8E7] px-4 py-3.5 transition text-left group"
        >
          <div className="w-9 h-9 rounded-full bg-[#F5B800]/10 group-hover:bg-[#F5B800] flex items-center justify-center flex-shrink-0 transition">
            <HelpCircle className="w-5 h-5 text-[#F5B800] group-hover:text-[#1A1A1A]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-[#1A1A1A]">Non trovi la voce per il tuo problema?</div>
            <div className="text-xs text-[#666]">
              Descrivilo tu, <span className="text-[#F5B800] font-semibold">clicca qui</span>: il prezzo te lo comunichiamo su WhatsApp.
            </div>
          </div>
        </button>
      ) : (
        <div className="rounded-2xl border-2 border-[#F5B800] bg-white p-4">
          <label htmlFor="voce-custom" className="block text-sm font-semibold text-[#1A1A1A] mb-2">
            Descrivi il problema
          </label>
          <textarea
            id="voce-custom"
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            rows={3}
            autoFocus
            placeholder="Es. lo scaldabagno perde acqua dal basso e non scalda più…"
            className="w-full rounded-xl border-2 border-[#E5E5E5] focus:border-[#F5B800] focus:outline-none p-3 text-sm resize-none"
          />
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              onClick={() => {
                setAperto(false);
                setTesto('');
              }}
              className="px-4 py-2 rounded-full text-sm font-semibold text-[#666] hover:bg-[#F0F0F0]"
            >
              Annulla
            </button>
            <button
              onClick={conferma}
              disabled={!testo.trim()}
              className="px-5 py-2 rounded-full text-sm font-semibold bg-[#1A1A1A] text-white hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Aggiungi richiesta
            </button>
          </div>
        </div>
      )}

      {voci.length > 0 && (
        <div className="mt-3 space-y-2">
          {voci.map((c) => (
            <div
              key={c.id}
              className="flex items-start gap-2.5 rounded-xl border-2 border-[#F5B800] bg-[#FFF8E7] p-3"
            >
              <Sparkles className="w-4 h-4 text-[#F5B800] flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#1A1A1A] leading-snug">{c.descrizione}</p>
                <span className="inline-block mt-1 text-[10px] font-mono uppercase tracking-wider bg-[#F5B800]/20 text-[#1A1A1A] px-2 py-0.5 rounded-full">
                  Prezzo su WhatsApp
                </span>
              </div>
              <button
                onClick={() => onRemove(c.id)}
                aria-label="Rimuovi richiesta"
                className="w-7 h-7 rounded-full text-[#999] hover:text-red-600 hover:bg-red-50 flex items-center justify-center flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CardIntervento({
  voce,
  selezionato,
  infoAperto,
  onToggle,
  onInfo,
}: {
  voce: VoceIntervento;
  selezionato: boolean;
  infoAperto: boolean;
  onToggle: () => void;
  onInfo: () => void;
}) {
  return (
    <div
      className={`rounded-xl border-2 transition ${
        selezionato ? 'border-[#F5B800] bg-[#FFF8E7]' : 'border-[#E5E5E5] bg-white hover:border-[#F5B800]/50'
      }`}
    >
      <div className="flex items-start gap-2 p-3">
        <button onClick={onToggle} className="flex-1 flex items-start gap-3 text-left min-w-0">
          <div
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition ${
              selezionato ? 'bg-[#F5B800] border-[#F5B800]' : 'border-[#CCC]'
            }`}
          >
            {selezionato && <Check className="w-3.5 h-3.5 text-[#1A1A1A]" />}
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-sm text-[#1A1A1A] leading-snug block">{voce.voce}</span>
            <span className="font-display text-sm font-bold text-[#F5B800]">
              € {voce.prezzo}
              <span className="text-[11px] text-[#666] font-mono font-normal"> /{voce.unita}</span>
            </span>
          </div>
        </button>
        <button
          onClick={onInfo}
          aria-label="Dettagli intervento"
          aria-expanded={infoAperto}
          className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition ${
            infoAperto ? 'bg-[#F5B800] text-[#1A1A1A]' : 'text-[#999] hover:bg-[#F0F0F0]'
          }`}
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {infoAperto && (
        <div className="mx-3 mb-3 -mt-1 rounded-lg bg-[#F8F8F8] border border-[#EAEAEA] p-3 text-xs text-[#555] space-y-1.5">
          <div className="flex gap-2">
            <span className="font-mono uppercase tracking-wider text-[10px] text-[#999] shrink-0 mt-0.5">Unità</span>
            <span className="font-medium text-[#1A1A1A]">{voce.unita}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-mono uppercase tracking-wider text-[10px] text-[#999] shrink-0 mt-0.5">Note</span>
            <span className="leading-snug">{voce.note}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarioInline({
  valore,
  onSelect,
}: {
  valore: string;
  onSelect: (iso: string) => void;
}) {
  const oggi = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [mese, setMese] = useState(() => new Date(oggi.getFullYear(), oggi.getMonth(), 1));

  const anno = mese.getFullYear();
  const m = mese.getMonth();
  const offset = (new Date(anno, m, 1).getDay() + 6) % 7; // griglia lunedì-prima
  const giorniNelMese = new Date(anno, m + 1, 0).getDate();

  const celle: (Date | null)[] = [];
  for (let i = 0; i < offset; i++) celle.push(null);
  for (let g = 1; g <= giorniNelMese; g++) celle.push(new Date(anno, m, g));

  const puoIndietro = anno > oggi.getFullYear() || (anno === oggi.getFullYear() && m > oggi.getMonth());

  return (
    <div className="rounded-2xl border-2 border-[#E5E5E5] bg-white p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => puoIndietro && setMese(new Date(anno, m - 1, 1))}
          disabled={!puoIndietro}
          aria-label="Mese precedente"
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F0F0F0] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-display font-bold text-base">
          {MESI[m]} {anno}
        </span>
        <button
          type="button"
          onClick={() => setMese(new Date(anno, m + 1, 1))}
          aria-label="Mese successivo"
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#F0F0F0]"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {GIORNI_SETT.map((g) => (
          <div key={g} className="text-center text-[11px] font-mono uppercase text-[#999] py-1">
            {g}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {celle.map((d, i) => {
          if (!d) return <div key={`vuoto-${i}`} />;
          const iso = toISODate(d);
          const passato = d < oggi;
          const sel = iso === valore;
          const isOggi = d.getTime() === oggi.getTime();
          return (
            <button
              key={iso}
              type="button"
              disabled={passato}
              onClick={() => onSelect(iso)}
              className={`aspect-square rounded-lg text-sm font-semibold flex items-center justify-center transition ${
                sel
                  ? 'bg-[#1A1A1A] text-white'
                  : passato
                    ? 'text-[#CCC] cursor-not-allowed'
                    : isOggi
                      ? 'bg-[#F5B800]/15 text-[#1A1A1A] hover:bg-[#F5B800]/30'
                      : 'text-[#1A1A1A] hover:bg-[#FFF8E7]'
              }`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepDataOra({
  data,
  ora,
  onData,
  onOra,
}: {
  data: string;
  ora: string;
  onData: (v: string) => void;
  onOra: (v: string) => void;
}) {
  return (
    <div>
      <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-2">
        Scegli <span className="text-[#F5B800]">data e ora</span>
      </h2>
      <p className="text-center text-sm text-[#666] mb-6">
        Indica quando preferisci. Confermeremo la disponibilità via WhatsApp.
      </p>

      <div className="max-w-md mx-auto space-y-6">
        <div>
          <span className="block text-xs font-mono uppercase tracking-wider text-[#666] mb-2">Giorno</span>
          <CalendarioInline valore={data} onSelect={onData} />
          {data && (
            <p className="text-sm text-[#666] mt-2 capitalize text-center">{formatDataLeggibile(data)}</p>
          )}
        </div>

        <div>
          <span className="block text-xs font-mono uppercase tracking-wider text-[#666] mb-2">Fascia oraria</span>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {SLOT_ORARI.map((slot) => {
              const sel = ora === slot;
              return (
                <button
                  key={slot}
                  onClick={() => onOra(slot)}
                  className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition ${
                    sel ? 'border-[#F5B800] bg-[#F5B800] text-[#1A1A1A]' : 'border-[#E5E5E5] bg-white hover:border-[#F5B800]'
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepRiepilogo({
  riepilogo,
  costi,
  onVaiAllaConferma,
}: {
  riepilogo: PrenotazioneRiepilogo;
  costi: ReturnType<typeof calcolaCosti>;
  onVaiAllaConferma: () => void;
}) {
  const tipo = riepilogo.categoria === 'idro' ? 'Idraulico' : 'Elettricista';
  return (
    <div>
      <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-6">
        Riepilogo e <span className="text-[#F5B800]">costo</span>
      </h2>

      <div className="bg-white border-2 border-[#F5B800] rounded-3xl p-6 shadow-sm max-w-xl mx-auto">
        <div className="grid grid-cols-2 gap-4 mb-5">
          <RigaInfo label="Tipo" valore={tipo} />
          <RigaInfo label="Urgenza" valore={riepilogo.urgenza === 'alta' ? 'Alta (prioritario)' : 'Normale'} />
          <RigaInfo label="Giorno" valore={formatDataLeggibile(riepilogo.data)} capitalize />
          <RigaInfo label="Ora" valore={riepilogo.ora} />
        </div>

        {riepilogo.voci.length > 0 && (
          <div className="border-t border-[#E5E5E5] pt-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#666] mb-2">
              Interventi selezionati
            </div>
            <div className="space-y-2">
              {riepilogo.voci.map((v) => (
                <div key={v.id} className="flex justify-between gap-3 text-sm">
                  <span className="text-[#1A1A1A]">{v.voce}</span>
                  <span className="font-mono text-[#666] whitespace-nowrap">€ {v.prezzo}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {riepilogo.vociCustom.length > 0 && (
          <div className="border-t border-[#E5E5E5] pt-4 mt-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#666] mb-2">
              Richieste personalizzate
            </div>
            <div className="space-y-2">
              {riepilogo.vociCustom.map((d, i) => (
                <div key={i} className="flex justify-between gap-3 text-sm">
                  <span className="text-[#1A1A1A] flex items-start gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#F5B800] flex-shrink-0 mt-0.5" />
                    {d}
                  </span>
                  <span className="font-mono text-[#999] text-xs whitespace-nowrap">da definire</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-[#E5E5E5] mt-4 pt-4 space-y-1.5 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-[#666]">Subtotale interventi a listino</span>
            <span className="font-mono">€ {costi.base.toFixed(2)}</span>
          </div>
          {costi.supplemento > 0 && (
            <div className="flex justify-between gap-3">
              <span className="text-[#666]">
                Supplemento urgenza (+{Math.round(SUPPLEMENTO_URGENZA_ALTA * 100)}%)
              </span>
              <span className="font-mono">€ {costi.supplemento.toFixed(2)}</span>
            </div>
          )}

          {riepilogo.vociCustom.length > 0 && (
            <div className="flex gap-2 rounded-xl bg-[#FFF8E7] border border-[#F5B800]/50 p-3 mt-2 text-xs text-[#1A1A1A]">
              <Info className="w-4 h-4 text-[#F5B800] flex-shrink-0 mt-0.5" />
              <span className="leading-snug">
                {riepilogo.vociCustom.length === 1
                  ? 'La richiesta personalizzata che hai descritto non è ancora inclusa nel totale: '
                  : `Le ${riepilogo.vociCustom.length} richieste personalizzate che hai descritto non sono ancora incluse nel totale: `}
                il relativo costo ti verrà comunicato quanto prima via WhatsApp o email.
              </span>
            </div>
          )}
        </div>

        <div className="border-t border-[#E5E5E5] mt-4 pt-4 flex items-end justify-between">
          <span className="font-display text-lg font-bold">Totale stimato</span>
          <span className="font-display text-3xl font-bold text-[#F5B800]">€ {costi.totale.toFixed(2)}</span>
        </div>

        <button
          onClick={onVaiAllaConferma}
          className="w-full mt-6 bg-[#1A1A1A] hover:bg-black text-white font-semibold py-3.5 rounded-full text-sm flex items-center justify-center gap-2 transition"
        >
          <Check className="w-4 h-4" /> Conferma prenotazione
        </button>
        <p className="text-[11px] text-[#666] pt-3 text-center leading-snug">
          Stima orientativa. Il costo definitivo viene confermato dopo sopralluogo gratuito con MB.
        </p>
      </div>
    </div>
  );
}

function RigaInfo({ label, valore, capitalize }: { label: string; valore: string; capitalize?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-[#666]">{label}</div>
      <div className={`font-semibold text-sm text-[#1A1A1A] ${capitalize ? 'capitalize' : ''}`}>{valore}</div>
    </div>
  );
}

function SchermataConferma({
  riepilogo,
  onRicomincia,
  onTorna,
}: {
  riepilogo: PrenotazioneRiepilogo;
  onRicomincia: () => void;
  onTorna: () => void;
}) {
  const tipo = riepilogo.categoria === 'idro' ? 'Idraulico' : 'Elettricista';
  return (
    <div className="max-w-xl mx-auto text-center">
      <div className="w-20 h-20 rounded-full bg-[#F5B800]/15 flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="w-11 h-11 text-[#F5B800]" />
      </div>
      <h2 className="font-display text-3xl font-bold mb-2">Prenotazione registrata!</h2>
      <p className="text-[#666] mb-1">
        Intervento <strong>{tipo}</strong> · {formatDataLeggibile(riepilogo.data)} alle <strong>{riepilogo.ora}</strong>
      </p>
      <p className="text-[#666] mb-8">
        Totale stimato <strong className="text-[#F5B800]">€ {riepilogo.totale.toFixed(2)}</strong>.
        Confermaci l'appuntamento via WhatsApp e aggiungilo al calendario.
      </p>

      <div className="space-y-3">
        <a
          href={linkWhatsApp(riepilogo)}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-[#25D366] hover:bg-[#1FB855] text-white font-semibold py-3.5 rounded-full text-sm flex items-center justify-center gap-2 transition"
        >
          <MessageCircle className="w-4 h-4" /> Conferma su WhatsApp
        </a>

        <div className="grid grid-cols-2 gap-3">
          <a
            href={linkGoogleCalendar(riepilogo)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 rounded-full border-2 border-[#E5E5E5] hover:border-[#F5B800] text-sm font-semibold transition"
          >
            <CalendarPlus className="w-4 h-4" /> Google Calendar
          </a>
          <button
            onClick={() => scaricaICS(riepilogo)}
            className="flex items-center justify-center gap-2 py-3 rounded-full border-2 border-[#E5E5E5] hover:border-[#F5B800] text-sm font-semibold transition"
          >
            <CalendarDays className="w-4 h-4" /> Scarica .ics
          </button>
        </div>

        <div className="flex items-center justify-center gap-4 pt-3">
          <button
            onClick={onRicomincia}
            className="text-sm text-[#666] hover:text-[#1A1A1A] flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Nuova prenotazione
          </button>
          <button onClick={onTorna} className="text-sm text-[#666] hover:text-[#1A1A1A]">
            Torna alle modalità
          </button>
        </div>
      </div>
    </div>
  );
}
