/**
 * Livello "Intervento puntuale" — wizard di PRENOTAZIONE.
 *
 * Flusso lineare (vedi schema di riferimento):
 *
 *   PRENOTA IL TUO INTERVENTO
 *        ├── IDRO        (Idraulica + Clima + Termico)
 *        └── ELETTRICO   (Elettrico)
 *                 ↓
 *   URGENZA   (Normale | Alta → supplemento %)
 *                 ↓
 *   SELEZIONA L'INTERVENTO   (il tipo: es. cambio rubinetto / cambio presa)
 *                 ↓
 *   SCEGLI DATA E ORA        (con futura sync Google Calendar)
 *                 ↓
 *   RIEPILOGO CON COSTO      (totale + eventuale supplemento urgenza)
 *                 ↓
 *   CONFERMA                 (messaggio WhatsApp + aggiungi a calendario)
 *
 * NB: i prezzi sono PLACEHOLDER (10/20/30 €) — il dataset `VOCI` è quello già
 * usato in precedenza e verrà sostituito dal prezzario reale lato BE. La logica
 * di calcolo costo e la struttura voci sono riusate dalla versione catalogo.
 */

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Droplet,
  Zap as ZapIcon,
  Wind,
  Flame,
  Check,
  CheckCircle2,
  Clock,
  CalendarDays,
  CalendarPlus,
  MessageCircle,
  ChevronLeft,
  Gauge,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

// ────────────────────────────────────────────────────────────────────────────
// Tipi e dati (riusati dalla versione catalogo — prezzi placeholder 10/20/30 €)
// ────────────────────────────────────────────────────────────────────────────

type Area = 'Idraulica' | 'Clima' | 'Termico' | 'Elettrico';
type Categoria = 'idro' | 'elettrico';
type Urgenza = 'normale' | 'alta';

interface VoceIntervento {
  id: number;
  voce: string;
  descrizione: string;
  area: Area;
  prezzo: 10 | 20 | 30;
  unita: string;
}

const VOCI: VoceIntervento[] = [
  // ── Idraulica
  { id: 101, voce: 'Sostituzione rubinetto lavabo', descrizione: 'Smontaggio vecchio + posa nuovo, escluso ricambio.', area: 'Idraulica', prezzo: 30, unita: 'cad' },
  { id: 102, voce: 'Riparazione perdita scarico', descrizione: 'Verifica e sostituzione guarnizione/sifone.', area: 'Idraulica', prezzo: 20, unita: 'cad' },
  { id: 103, voce: 'Sostituzione miscelatore doccia', descrizione: 'Smontaggio + posa nuovo miscelatore.', area: 'Idraulica', prezzo: 30, unita: 'cad' },
  { id: 104, voce: 'Pulizia sifone otturato', descrizione: 'Smontaggio, pulizia e rimontaggio sifone.', area: 'Idraulica', prezzo: 10, unita: 'cad' },
  { id: 106, voce: 'Sostituzione vaschetta WC', descrizione: 'Smontaggio + posa nuova cassetta di scarico.', area: 'Idraulica', prezzo: 30, unita: 'cad' },
  { id: 107, voce: 'Riparazione cassetta scarico', descrizione: 'Sostituzione galleggiante e battente.', area: 'Idraulica', prezzo: 20, unita: 'cad' },
  { id: 110, voce: 'Spurgo lavandino', descrizione: 'Disostruzione meccanica dello scarico.', area: 'Idraulica', prezzo: 20, unita: 'cad' },
  { id: 111, voce: 'Installazione miscelatore lavello', descrizione: 'Smontaggio vecchio + posa nuovo miscelatore cucina.', area: 'Idraulica', prezzo: 30, unita: 'cad' },
  { id: 112, voce: 'Manutenzione boiler', descrizione: 'Pulizia, controllo anodo e termostato.', area: 'Idraulica', prezzo: 30, unita: 'cad' },
  { id: 113, voce: 'Verifica perdite acqua', descrizione: 'Controllo impianto e localizzazione perdita.', area: 'Idraulica', prezzo: 20, unita: 'cad' },

  // ── Clima
  { id: 201, voce: 'Pulizia filtri split', descrizione: 'Estrazione e lavaggio filtri unità interna.', area: 'Clima', prezzo: 10, unita: 'cad' },
  { id: 202, voce: 'Sanificazione split', descrizione: 'Igienizzazione completa scambiatore + filtri.', area: 'Clima', prezzo: 30, unita: 'cad' },
  { id: 203, voce: 'Manutenzione base climatizzatore', descrizione: 'Pulizia, controllo carico gas, test funzionalità.', area: 'Clima', prezzo: 30, unita: 'cad' },
  { id: 205, voce: 'Ricarica gas refrigerante', descrizione: 'Vuoto impianto + carica gas R32/R410.', area: 'Clima', prezzo: 30, unita: 'cad' },
  { id: 206, voce: 'Pulizia unità esterna', descrizione: 'Lavaggio condensatore + verifica ventola.', area: 'Clima', prezzo: 20, unita: 'cad' },

  // ── Termico
  { id: 301, voce: 'Sostituzione termostato ambiente', descrizione: 'Smontaggio + posa nuovo termostato.', area: 'Termico', prezzo: 20, unita: 'cad' },
  { id: 302, voce: 'Spurgo aria radiatori', descrizione: 'Sfiato + ripristino pressione impianto.', area: 'Termico', prezzo: 10, unita: 'cad' },
  { id: 304, voce: 'Manutenzione caldaia annuale', descrizione: 'Pulizia + analisi fumi + bollino.', area: 'Termico', prezzo: 30, unita: 'cad' },
  { id: 306, voce: 'Riparazione perdita radiatore', descrizione: 'Localizzazione e sigillatura perdita.', area: 'Termico', prezzo: 30, unita: 'cad' },
  { id: 308, voce: 'Verifica pressione caldaia', descrizione: 'Controllo manometro + ricarica circuito.', area: 'Termico', prezzo: 10, unita: 'cad' },

  // ── Elettrico
  { id: 401, voce: 'Sostituzione presa elettrica', descrizione: 'Smontaggio + posa nuova presa schuko/bipasso.', area: 'Elettrico', prezzo: 10, unita: 'cad' },
  { id: 402, voce: 'Sostituzione interruttore', descrizione: 'Smontaggio + posa nuovo interruttore/deviatore.', area: 'Elettrico', prezzo: 10, unita: 'cad' },
  { id: 403, voce: 'Installazione plafoniera', descrizione: 'Posa e collegamento corpo illuminante a soffitto.', area: 'Elettrico', prezzo: 20, unita: 'cad' },
  { id: 404, voce: 'Punto luce nuovo a parete', descrizione: 'Tracciatura, posa cavo e scatola, frutto escluso.', area: 'Elettrico', prezzo: 30, unita: 'cad' },
  { id: 405, voce: 'Verifica impianto + test differenziale', descrizione: 'Controllo continuità, isolamento, prova salvavita.', area: 'Elettrico', prezzo: 30, unita: 'cad' },
  { id: 407, voce: 'Riparazione presa scossa', descrizione: 'Diagnostica e messa in sicurezza presa.', area: 'Elettrico', prezzo: 20, unita: 'cad' },
  { id: 408, voce: 'Installazione faretto incassato', descrizione: 'Foratura controsoffitto + cablaggio + posa.', area: 'Elettrico', prezzo: 30, unita: 'cad' },
  { id: 410, voce: 'Installazione dimmer', descrizione: 'Sostituzione interruttore con dimmer.', area: 'Elettrico', prezzo: 30, unita: 'cad' },
  { id: 412, voce: 'Aggiunta presa USB', descrizione: 'Sostituzione presa con presa USB integrata.', area: 'Elettrico', prezzo: 30, unita: 'cad' },
  { id: 414, voce: 'Diagnostica corto circuito', descrizione: 'Identificazione tratta in corto + ripristino.', area: 'Elettrico', prezzo: 30, unita: 'cad' },
];

const VOCE_BY_ID = new Map(VOCI.map((v) => [v.id, v]));

/** Aree del prezzario incluse in ciascuna macro-categoria del wizard. */
const CATEGORIA_AREE: Record<Categoria, Area[]> = {
  idro: ['Idraulica', 'Clima', 'Termico'],
  elettrico: ['Elettrico'],
};

/** Supplemento applicato al totale quando l'urgenza è "Alta". */
const SUPPLEMENTO_URGENZA_ALTA = 0.3; // +30%

/** Numero WhatsApp MB (stesso usato in Contact). */
const WHATSAPP_NUMERO = '393391268722';

/** Slot orari prenotabili. */
const SLOT_ORARI = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

const AREA_ICON: Record<Area, typeof Droplet> = {
  Idraulica: Droplet,
  Clima: Wind,
  Termico: Flame,
  Elettrico: ZapIcon,
};

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

function oggiISO(): string {
  const d = new Date();
  // normalizza al fuso locale per il min del date input
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
  data: string;
  ora: string;
  totale: number;
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
    '',
    'Interventi:',
    ...p.voci.map((v) => `• ${v.voce} — € ${v.prezzo}`),
    '',
    `Totale stimato: € ${p.totale.toFixed(2)}`,
    'Stima orientativa, confermata dopo sopralluogo gratuito.',
  ];
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
  const [data, setData] = useState('');
  const [ora, setOra] = useState('');
  const [confermato, setConfermato] = useState(false);

  const costi = useMemo(
    () => calcolaCosti(selezionati, urgenza ?? 'normale'),
    [selezionati, urgenza],
  );

  const vociCategoria = useMemo(() => {
    if (!categoria) return [];
    const aree = CATEGORIA_AREE[categoria];
    return VOCI.filter((v) => aree.includes(v.area));
  }, [categoria]);

  const riepilogo: PrenotazioneRiepilogo | null = useMemo(() => {
    if (!categoria || !urgenza) return null;
    return {
      categoria,
      urgenza,
      voci: selezionati.map((id) => VOCE_BY_ID.get(id)!).filter(Boolean),
      data,
      ora,
      totale: costi.totale,
    };
  }, [categoria, urgenza, selezionati, data, ora, costi.totale]);

  // Cambiando categoria, le voci selezionate non sono più valide → reset.
  function scegliCategoria(c: Categoria) {
    setCategoria(c);
    setSelezionati([]);
    setStep(1);
  }

  function toggleVoce(id: number) {
    setSelezionati((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function ricomincia() {
    setStep(0);
    setCategoria(null);
    setUrgenza(null);
    setSelezionati([]);
    setData('');
    setOra('');
    setConfermato(false);
  }

  // Requisito minimo per abilitare "Avanti" su ogni step.
  const puoAvanzare =
    (step === 0 && categoria !== null) ||
    (step === 1 && urgenza !== null) ||
    (step === 2 && selezionati.length > 0) ||
    (step === 3 && data !== '' && ora !== '') ||
    step === 4;

  function avanti() {
    if (step < 4) setStep((s) => (s + 1) as StepIndex);
  }
  function indietro() {
    if (step > 0) setStep((s) => (s - 1) as StepIndex);
  }

  // Schermata di conferma finale
  if (confermato && riepilogo) {
    return <SchermataConferma riepilogo={riepilogo} onRicomincia={ricomincia} onTorna={onTorna} />;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <button
        onClick={step === 0 ? onTorna : indietro}
        className="text-sm text-[#1A1A1A] hover:text-black font-bold mb-6 flex items-center gap-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> {step === 0 ? 'Cambia modalità' : 'Indietro'}
      </button>

      {/* Intestazione */}
      <div className="text-center max-w-2xl mx-auto mb-6">
        <div className="inline-flex items-center gap-2 bg-[#F5B800]/10 px-4 py-2 rounded-full text-sm font-medium mb-4">
          <CalendarDays className="w-4 h-4 text-[#F5B800]" />
          Prenota il tuo intervento
        </div>
      </div>

      {/* Stepper */}
      <Stepper step={step} />

      {/* Contenuto step */}
      <div className="mt-8">
        {step === 0 && <StepCategoria categoria={categoria} onScegli={scegliCategoria} />}
        {step === 1 && <StepUrgenza urgenza={urgenza} onScegli={setUrgenza} />}
        {step === 2 && (
          <StepIntervento
            voci={vociCategoria}
            selezionati={selezionati}
            onToggle={toggleVoce}
          />
        )}
        {step === 3 && (
          <StepDataOra data={data} ora={ora} onData={setData} onOra={setOra} />
        )}
        {step === 4 && riepilogo && (
          <StepRiepilogo riepilogo={riepilogo} costi={costi} onVaiAllaConferma={() => setConfermato(true)} />
        )}
      </div>

      {/* Navigazione (nascosta sul riepilogo, che ha la sua CTA di conferma) */}
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
          titolo="Idro"
          sottotitolo="Idraulica · Clima · Riscaldamento"
          colore="#3B9ED8"
          onClick={() => onScegli('idro')}
        />
        <CategoriaCard
          attivo={categoria === 'elettrico'}
          icona={ZapIcon}
          titolo="Elettrico"
          sottotitolo="Impianti · Prese · Illuminazione"
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
}: {
  voci: VoceIntervento[];
  selezionati: number[];
  onToggle: (id: number) => void;
}) {
  // Raggruppa per area per leggibilità (idro ha 3 aree).
  const perArea = useMemo(() => {
    const map = new Map<Area, VoceIntervento[]>();
    for (const v of voci) {
      if (!map.has(v.area)) map.set(v.area, []);
      map.get(v.area)!.push(v);
    }
    return Array.from(map.entries());
  }, [voci]);

  return (
    <div>
      <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-2">
        Seleziona <span className="text-[#F5B800]">l'intervento</span>
      </h2>
      <p className="text-center text-sm text-[#666] mb-6">
        Puoi scegliere uno o più interventi. {selezionati.length > 0 && (
          <strong>{selezionati.length} selezionati</strong>
        )}
      </p>

      <div className="space-y-6">
        {perArea.map(([area, lista]) => {
          const Icona = AREA_ICON[area];
          return (
            <div key={area}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-[#F5B800]/10 flex items-center justify-center">
                  <Icona className="w-4 h-4 text-[#F5B800]" />
                </div>
                <h3 className="font-display text-base font-bold">{area}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lista.map((v) => {
                  const sel = selezionati.includes(v.id);
                  return (
                    <button
                      key={v.id}
                      onClick={() => onToggle(v.id)}
                      className={`text-left rounded-xl border-2 p-3 transition flex gap-3 items-start ${
                        sel ? 'border-[#F5B800] bg-[#FFF8E7]' : 'border-[#E5E5E5] bg-white hover:border-[#F5B800]/50'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition ${
                          sel ? 'bg-[#F5B800] border-[#F5B800]' : 'border-[#CCC]'
                        }`}
                      >
                        {sel && <Check className="w-3.5 h-3.5 text-[#1A1A1A]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-semibold text-sm text-[#1A1A1A]">{v.voce}</span>
                          <span className="font-display text-sm font-bold text-[#F5B800] whitespace-nowrap">
                            € {v.prezzo}
                          </span>
                        </div>
                        <p className="text-xs text-[#666] mt-0.5 leading-snug">{v.descrizione}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
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
          <label htmlFor="data-intervento" className="block text-xs font-mono uppercase tracking-wider text-[#666] mb-2">
            Giorno
          </label>
          <div className="relative">
            <CalendarDays className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#999] pointer-events-none" />
            <input
              id="data-intervento"
              type="date"
              value={data}
              min={oggiISO()}
              onChange={(e) => onData(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-[#E5E5E5] focus:border-[#F5B800] focus:outline-none text-base"
            />
          </div>
          {data && <p className="text-sm text-[#666] mt-2 capitalize">{formatDataLeggibile(data)}</p>}
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

        <div className="border-t border-[#E5E5E5] pt-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#666] mb-2">
            Interventi selezionati
          </div>
          <div className="space-y-2">
            {riepilogo.voci.map((v) => (
              <div key={v.id} className="flex justify-between gap-3 text-sm">
                <span className="text-[#1A1A1A]">{v.voce}</span>
                <span className="font-mono text-[#666]">€ {v.prezzo}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-[#E5E5E5] mt-4 pt-4 space-y-1.5 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-[#666]">Subtotale</span>
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
    <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
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
