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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useScrollInCima } from './scroll';
import { supabase } from '@/lib/supabase';
import { TEL_DISPLAY } from '@/lib/contatti';
import ConfirmDialog from './ConfirmDialog';
import { VOCI_INTERVENTO, SINONIMI_INTERVENTO, type VoceIntervento, type CategoriaIntervento } from './interventiData';
import { trackLead } from '@/lib/consent';

/** minuscolo + senza accenti, per una ricerca tollerante. */
function normalizzaRicerca(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function emailValida(v: string): boolean {
  return EMAIL_RE.test(v.trim());
}
function telefonoValido(v: string): boolean {
  return v.replace(/\D/g, '').length >= 8;
}

const CAP_RE = /^\d{5}$/;
function capValido(v: string): boolean {
  return CAP_RE.test(v.trim());
}

/**
 * Roma città e provincia hanno CAP che iniziano per "00". Un CAP valido che
 * non inizia per "00" è considerato fuori dalla zona abituale: mostriamo un
 * avviso morbido ma la prenotazione prosegue comunque (la marchiamo `fuori_zona`).
 */
function fuoriZonaCap(cap: string): boolean {
  const c = cap.trim();
  return capValido(c) && !c.startsWith('00');
}

/** Esempi di ricerca coerenti con la categoria scelta (idraulico vs elettrico). */
const ESEMPI_RICERCA: Record<Categoria, string> = {
  idro: 'es. rubinetto, perdita, scarico, WC…',
  elettrico: 'es. presa, interruttore, lampadario, quadro…',
};

const ERR_CLS = 'text-[11px] text-[#C0392B] mt-1';
function campoCls(invalid: boolean): string {
  const base = 'w-full rounded-xl border-2 px-3 py-2.5 text-sm focus:outline-none';
  return invalid
    ? `${base} border-[#C0392B] focus:border-[#C0392B]`
    : `${base} border-[#E5E5E5] focus:border-[#F5B800]`;
}

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
  vociCustom: VoceCustom[];
  data: string;
  ora: string;
  totale: number;
  nome?: string;
  telefono?: string;
  email?: string;
  indirizzo?: string;
  cap?: string;
  citta?: string;
  fuoriZona?: boolean;
}

/** Mappa disponibilità: { 'YYYY-MM-DD': { '08:00': true, ... } } — true = libero. */
type Disponibilita = Record<string, Record<string, boolean>>;

/**
 * Legge gli slot liberi dal Google Calendar società (Edge Function
 * `disponibilita`) per l'intervallo [from, to]. Best-effort: se il backend
 * non è raggiungibile/configurato restituisce mappa vuota (tutti gli slot
 * restano selezionabili, come prima dell'integrazione).
 */
async function caricaDisponibilita(from: string, to: string): Promise<Disponibilita> {
  if (!supabase) return {};
  try {
    const { data, error } = await supabase.functions.invoke('disponibilita', {
      body: { from, to },
    });
    if (error || !data?.giorni) return {};
    return data.giorni as Disponibilita;
  } catch {
    return {};
  }
}

interface EsistenteSettimana {
  id: string;
  tipo: string;
  data: string;
  ora: string;
}

interface EsitoPrenotazione {
  ok: boolean;
  slotOccupato?: boolean;
  conflitto?: boolean; // esiste già un appuntamento attivo nella stessa settimana
  esistente?: EsistenteSettimana;
}

/**
 * Crea la prenotazione (Edge Function `crea-prenotazione`): verifica lo slot,
 * controlla il doppio appuntamento nella settimana, crea l'evento e salva.
 * Casi gestiti: slot appena occupato (409), conflitto settimanale (pop-up).
 * `opts` permette la conferma di sostituzione (confermaSettimana + annullaId).
 */
async function creaPrenotazione(
  p: PrenotazioneRiepilogo,
  opts?: { confermaSettimana?: boolean; annullaId?: string },
): Promise<EsitoPrenotazione> {
  if (!supabase) return { ok: false };
  try {
    const { data, error } = await supabase.functions.invoke('crea-prenotazione', {
      body: {
        categoria: p.categoria,
        urgenza: p.urgenza,
        data: p.data,
        ora: p.ora,
        voci: p.voci.map((v) => ({ id: v.id, voce: v.voce, prezzo: v.prezzo })),
        vociCustom: p.vociCustom.map((c) => c.descrizione),
        totale: p.totale,
        nome: p.nome,
        telefono: p.telefono,
        email: p.email,
        indirizzo: p.indirizzo,
        cap: p.cap,
        citta: p.citta,
        fuoriZona: p.fuoriZona,
        confermaSettimana: opts?.confermaSettimana,
        annullaId: opts?.annullaId,
      },
    });
    if (error) {
      const resp = (error as { context?: Response }).context;
      if (resp?.status === 409) return { ok: false, slotOccupato: true };
      return { ok: false };
    }
    if (data?.error === 'slot_occupato') return { ok: false, slotOccupato: true };
    if (data?.conflitto) return { ok: false, conflitto: true, esistente: data.esistente };
    return { ok: Boolean(data?.ok) };
  } catch {
    return { ok: false };
  }
}

function titoloEvento(p: PrenotazioneRiepilogo): string {
  const tipo = p.categoria === 'idro' ? 'Idraulico' : 'Elettricista';
  return `Intervento MB — ${tipo}`;
}

function dettaglioTesto(p: PrenotazioneRiepilogo): string {
  const tipo = p.categoria === 'idro' ? 'Idraulico' : 'Elettricista';
  const indirizzoCompleto = [p.indirizzo, [p.cap, p.citta].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  const righe = [
    `Prenotazione intervento — MB Ristrutturazioni`,
    `Tipo: ${tipo}`,
    `Urgenza: ${p.urgenza === 'alta' ? 'Alta (prioritario)' : 'Normale'}`,
    `Quando: ${formatDataLeggibile(p.data)} alle ${p.ora}`,
  ];
  if (indirizzoCompleto) {
    righe.push(`Dove: ${indirizzoCompleto}${p.fuoriZona ? ' (FUORI ZONA — da valutare)' : ''}`);
  }
  if (p.voci.length > 0) {
    righe.push('', 'Interventi:', ...p.voci.map((v) => `• ${v.voce} — € ${v.prezzo}`));
  }
  if (p.vociCustom.length > 0) {
    righe.push('', 'Richieste personalizzate (prezzo da definire):', ...p.vociCustom.map((c) => `• ${c.descrizione}`));
  }
  righe.push('', `Totale interventi a listino: € ${p.totale.toFixed(2)}`);
  if (p.vociCustom.length > 0) {
    righe.push('NB: il costo delle richieste personalizzate verrà comunicato a parte.');
  }
  righe.push('Stima orientativa, confermata dopo sopralluogo gratuito.');
  return righe.join('\n');
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

/** Link "Aggiungi a Outlook/Office365" (host: outlook.live.com personale, outlook.office.com lavoro). */
function linkOutlookCalendar(p: PrenotazioneRiepilogo, host: string): string {
  const start = new Date(`${p.data}T${p.ora}:00`);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: titoloEvento(p),
    startdt: iso(start),
    enddt: iso(end),
    body: dettaglioTesto(p),
  });
  return `https://${host}/calendar/0/deeplink/compose?${params.toString()}`;
}

/** File .ics universale: copre Apple, Yahoo, Thunderbird e qualsiasi altro calendario. */
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
  a.download = `appuntamento-mb-${p.data}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success('Evento pronto', { description: 'Apri il file per aggiungerlo ad Apple, Yahoo o altri calendari.' });
}

// ────────────────────────────────────────────────────────────────────────────
// Componente principale
// ────────────────────────────────────────────────────────────────────────────

interface LivelloInterventoProps {
  onTorna: () => void;
  /** Step corrente. Vive nel padre perché ogni step è una voce di cronologia. */
  step: number;
  /** Avanza a uno step (aggiunge una voce di cronologia). */
  onStep: (step: number) => void;
  /** Cambia step SENZA aggiungere una voce: per le correzioni, non per le navigazioni. */
  onSostituisciStep: (step: number) => void;
  /** Torna allo step precedente consumando la voce di cronologia. */
  onIndietro: () => void;
}

export default function LivelloIntervento({
  onTorna,
  step: stepProp,
  onStep,
  onSostituisciStep,
  onIndietro,
}: LivelloInterventoProps) {
  const step = stepProp as StepIndex;
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [urgenza, setUrgenza] = useState<Urgenza | null>(null);
  const [selezionati, setSelezionati] = useState<number[]>([]);
  const [vociCustom, setVociCustom] = useState<VoceCustom[]>([]);
  const [data, setData] = useState('');
  const [ora, setOra] = useState('');
  const [nome, setNome] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [indirizzo, setIndirizzo] = useState('');
  const [cap, setCap] = useState('');
  const [citta, setCitta] = useState('');
  const [confermato, setConfermato] = useState(false);
  // Snapshot del riepilogo al momento dell'invio: la schermata di conferma deve
  // mostrare ESATTAMENTE ciò che è stato prenotato. Senza, un utente che dopo il
  // "Conferma" torna indietro col tasto del telefono e cambia orario vedrebbe una
  // conferma (e link "aggiungi al calendario") con lo slot NUOVO, mentre il server
  // ha registrato quello vecchio.
  const [riepilogoConfermato, setRiepilogoConfermato] = useState<PrenotazioneRiepilogo | null>(null);
  const [inviando, setInviando] = useState(false);
  const [conflitto, setConflitto] = useState<EsistenteSettimana | null>(null);

  // Ancora in cima al wizard: ci si riposiziona qui a ogni cambio step E al
  // primo montaggio. Prima il primo giro veniva saltato di proposito: arrivando
  // dall'Hub (che sta a metà pagina) il form si apriva sotto la posizione di
  // scroll corrente e da telefono si finiva in mezzo al modulo.
  const topRef = useRef<HTMLDivElement>(null);
  useScrollInCima(topRef, [step, confermato]);

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
      vociCustom: vociCustom,
      data,
      ora,
      totale: costi.totale,
      nome: nome.trim() || undefined,
      telefono: telefono.trim() || undefined,
      email: email.trim() || undefined,
      indirizzo: indirizzo.trim() || undefined,
      cap: cap.trim() || undefined,
      citta: citta.trim() || undefined,
      fuoriZona: fuoriZonaCap(cap),
    };
  }, [categoria, urgenza, selezionati, vociCustom, data, ora, costi.totale, nome, telefono, email, indirizzo, cap, citta]);

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
    // Non è una navigazione: azzera il wizard sul posto. Se aggiungesse una voce
    // di cronologia, Indietro riporterebbe alla conferma di una prenotazione
    // che l'utente ha appena deciso di rifare da capo.
    onSostituisciStep(0);
    setCategoria(null);
    setUrgenza(null);
    setSelezionati([]);
    setVociCustom([]);
    setData('');
    setOra('');
    setNome('');
    setTelefono('');
    setEmail('');
    setIndirizzo('');
    setCap('');
    setCitta('');
    setConfermato(false);
    setRiepilogoConfermato(null);
  }

  async function inviaPrenotazione(opts?: { confermaSettimana?: boolean; annullaId?: string }) {
    if (!riepilogo || inviando) return;
    // Congeliamo QUI ciò che stiamo inviando: è quello che il server registra e
    // quello che la conferma deve mostrare, a prescindere da cosa l'utente tocchi
    // durante l'attesa.
    const inviato = riepilogo;
    setInviando(true);
    const esito = await creaPrenotazione(inviato, opts);
    setInviando(false);

    if (esito.slotOccupato) {
      // Slot preso tra la scelta e la conferma.
      toast.error('Orario non più disponibile', {
        description: 'Qualcuno ha appena prenotato questa fascia. Scegline un’altra.',
      });
      setOra('');
      // Correzione forzata dal backend, non una scelta dell'utente: niente voce
      // di cronologia, altrimenti Indietro lo rimanderebbe sulla conferma di uno
      // slot che nel frattempo è stato preso da qualcun altro.
      onSostituisciStep(3);
      return;
    }
    if (esito.conflitto && esito.esistente) {
      // Doppio appuntamento nella stessa settimana → chiediamo conferma.
      setConflitto(esito.esistente);
      return;
    }
    if (!esito.ok) {
      // Il backend NON ha registrato la prenotazione (500, calendario/DB in
      // errore, rete assente): NON mostrare la conferma "fantasma". Il server
      // in questi casi fa già rollback dell'evento Google, quindi non resta
      // nulla di appeso. Invitiamo l'utente a riprovare o a contattarci.
      toast.error('Prenotazione non riuscita', {
        description: `Non siamo riusciti a registrare l’appuntamento. Riprova tra poco oppure chiamaci/scrivici su WhatsApp al +39 ${TEL_DISPLAY}.`,
      });
      return;
    }
    // Conferme al cliente (email + WhatsApp) partono lato server.
    trackLead(costi.totale); // conversione: intervento prenotato
    setRiepilogoConfermato(inviato); // la conferma mostra ciò che è stato prenotato
    setConfermato(true);
  }

  // Handler del pulsante "Conferma" (nessun argomento dall'evento click).
  function conferma() {
    void inviaPrenotazione();
  }

  // L'utente nel pop-up sceglie di sostituire il precedente appuntamento.
  function confermaSostituzione() {
    const precedente = conflitto;
    setConflitto(null);
    if (precedente) void inviaPrenotazione({ confermaSettimana: true, annullaId: precedente.id });
  }

  const puoAvanzare =
    (step === 0 && categoria !== null) ||
    (step === 1 && urgenza !== null) ||
    (step === 2 && (selezionati.length > 0 || vociCustom.length > 0)) ||
    (step === 3 && data !== '' && ora !== '') ||
    step === 4;

  function avanti() {
    if (step < 4) onStep(step + 1);
  }
  function indietro() {
    // Consuma la voce di cronologia invece di aggiungerne una: così il tasto
    // Indietro del telefono e quello del sito fanno la stessa identica cosa.
    if (step > 0) onIndietro();
  }

  return (
    <div ref={topRef} className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
      <ConfirmDialog
        open={!!conflitto}
        title="Hai già un appuntamento questa settimana"
        description={
          conflitto
            ? `Risulta già un intervento ${conflitto.tipo} ${formatDataLeggibile(conflitto.data)} alle ${conflitto.ora}. Vuoi sostituirlo con questo nuovo appuntamento (il precedente verrà annullato)?`
            : undefined
        }
        confirmLabel="Sì, sostituisci"
        cancelLabel="No, mantieni quello"
        onConfirm={confermaSostituzione}
        onCancel={() => setConflitto(null)}
      />
      {confermato && riepilogoConfermato ? (
        <SchermataConferma riepilogo={riepilogoConfermato} onRicomincia={ricomincia} onTorna={onTorna} />
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

          {/* pb extra allo step 2 (lista lunga): spazio per non far coprire
              l'ultima card dalla barra "Avanti" sticky in basso. */}
          <div className={`mt-8 ${step === 2 ? 'pb-24 sm:pb-4' : ''}`}>
            {step === 0 && <StepCategoria categoria={categoria} onScegli={scegliCategoria} />}
            {step === 1 && <StepUrgenza urgenza={urgenza} onScegli={setUrgenza} />}
            {step === 2 && categoria && (
              <StepIntervento
                categoria={categoria}
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
              <StepRiepilogo
                riepilogo={riepilogo}
                costi={costi}
                nome={nome}
                telefono={telefono}
                email={email}
                indirizzo={indirizzo}
                cap={cap}
                citta={citta}
                onNome={setNome}
                onTelefono={setTelefono}
                onEmail={setEmail}
                onIndirizzo={setIndirizzo}
                onCap={setCap}
                onCitta={setCitta}
                inviando={inviando}
                onVaiAllaConferma={conferma}
              />
            )}
          </div>

          {step < 4 && (
            <div
              className={
                step === 2
                  ? 'sticky bottom-0 z-30 -mx-4 sm:mx-0 px-4 sm:px-0 mt-4 sm:mt-8 py-3 sm:py-0 [padding-bottom:calc(env(safe-area-inset-bottom)+0.75rem)] sm:[padding-bottom:0] bg-white/95 backdrop-blur border-t border-[#E5E5E5] sm:bg-transparent sm:border-0 sm:backdrop-blur-none flex items-center justify-between gap-3'
                  : 'mt-8 flex items-center justify-between gap-3'
              }
            >
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
          bgAttivo="#EAF6FC"
          onClick={() => onScegli('idro')}
        />
        <CategoriaCard
          attivo={categoria === 'elettrico'}
          icona={ZapIcon}
          titolo="Elettrico"
          sottotitolo="Impianti · prese · luci · quadri"
          colore="#F5B800"
          bgAttivo="#FFF8E7"
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
  bgAttivo,
  onClick,
}: {
  attivo: boolean;
  icona: typeof Droplet;
  titolo: string;
  sottotitolo: string;
  colore: string;
  bgAttivo: string;
  onClick: () => void;
}) {
  // Colori-stato (bordo/sfondo/freccia) derivati dal colore della categoria via
  // CSS variables, così idraulico è interamente azzurro ed elettrico giallo.
  return (
    <button
      onClick={onClick}
      style={{ ['--cat']: colore, ['--cat-bg']: bgAttivo } as React.CSSProperties}
      className={`group text-left rounded-3xl p-6 sm:p-8 border-2 transition shadow-sm hover:shadow-md ${
        attivo
          ? 'border-[var(--cat)] bg-[var(--cat-bg)]'
          : 'border-[#E5E5E5] bg-white hover:border-[var(--cat)]'
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
      <div className="mt-5 inline-flex items-center gap-2 font-semibold text-sm" style={{ color: colore }}>
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
  categoria,
  voci,
  selezionati,
  onToggle,
  vociCustom,
  onAddCustom,
  onRemoveCustom,
}: {
  categoria: Categoria;
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
    const q = normalizzaRicerca(search.trim());
    if (!q) return voci;
    // Sinonimi: se la query corrisponde a un termine colloquiale, attiviamo la
    // relativa parola-chiave tecnica (es. "vaso" → "wc") e mostriamo le voci che
    // la contengono nel nome.
    const chiaviAttive = SINONIMI_INTERVENTO
      .filter((g) => g.sinonimi.some((s) => normalizzaRicerca(s).includes(q)))
      .map((g) => g.chiave);
    return voci.filter((v) => {
      const nome = normalizzaRicerca(v.voce);
      const note = normalizzaRicerca(v.note);
      return nome.includes(q) || note.includes(q) || chiaviAttive.some((c) => nome.includes(c));
    });
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
          placeholder={ESEMPI_RICERCA[categoria]}
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
  onMeseVisibile,
  giorniPieni,
}: {
  valore: string;
  onSelect: (iso: string) => void;
  /** Chiamata al mount e a ogni cambio mese con l'intervallo visibile (ISO). */
  onMeseVisibile: (from: string, to: string) => void;
  /** Date (ISO) senza slot liberi: mostrate disabilitate. */
  giorniPieni: Set<string>;
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

  // Notifica al genitore l'intervallo visibile, così carica la disponibilità.
  useEffect(() => {
    onMeseVisibile(toISODate(new Date(anno, m, 1)), toISODate(new Date(anno, m, giorniNelMese)));
  }, [anno, m, giorniNelMese, onMeseVisibile]);

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
          const weekend = d.getDay() === 0 || d.getDay() === 6; // dom/sab: niente prenotazioni
          // Prima disponibilità sempre dal giorno SUCCESSIVO: oggi e i giorni passati non sono prenotabili.
          const troppoPresto = d.getTime() <= oggi.getTime();
          const pieno = !troppoPresto && !weekend && giorniPieni.has(iso);
          const disabilitato = troppoPresto || weekend || pieno;
          const sel = iso === valore;
          const isOggi = d.getTime() === oggi.getTime();
          return (
            <button
              key={iso}
              type="button"
              disabled={disabilitato}
              onClick={() => onSelect(iso)}
              title={pieno ? 'Nessuna fascia disponibile' : undefined}
              className={`aspect-square rounded-lg text-sm font-semibold flex items-center justify-center transition ${
                sel
                  ? 'bg-[#1A1A1A] text-white'
                  : disabilitato
                    ? 'text-[#CCC] cursor-not-allowed line-through decoration-[#E5E5E5]'
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
  const [disp, setDisp] = useState<Disponibilita>({});
  const [caricando, setCaricando] = useState(false);

  const caricaMese = useCallback(async (from: string, to: string) => {
    setCaricando(true);
    const giorni = await caricaDisponibilita(from, to);
    setDisp((prev) => ({ ...prev, ...giorni }));
    setCaricando(false);
  }, []);

  // Giorni interamente occupati: nessuno slot libero → disabilitati nel calendario.
  const giorniPieni = useMemo(() => {
    const set = new Set<string>();
    for (const [giorno, slots] of Object.entries(disp)) {
      if (Object.values(slots).every((libero) => !libero)) set.add(giorno);
    }
    return set;
  }, [disp]);

  const slotGiorno = data ? disp[data] : undefined;

  // Se l'orario scelto risulta non più libero dopo l'aggiornamento, lo deseleziono.
  useEffect(() => {
    if (ora && slotGiorno && slotGiorno[ora] === false) onOra('');
  }, [ora, slotGiorno, onOra]);

  return (
    <div>
      <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-2">
        Scegli <span className="text-[#F5B800]">data e ora</span>
      </h2>
      <p className="text-center text-sm text-[#666] mb-6">
        Gli orari liberi sono in tempo reale sull'agenda MB. Ti invieremo la conferma via email.
      </p>

      <div className="max-w-md mx-auto space-y-6">
        <div>
          <span className="block text-xs font-mono uppercase tracking-wider text-[#666] mb-2">Giorno</span>
          <CalendarioInline
            valore={data}
            onSelect={onData}
            onMeseVisibile={caricaMese}
            giorniPieni={giorniPieni}
          />
          {data && (
            <p className="text-sm text-[#666] mt-2 capitalize text-center">{formatDataLeggibile(data)}</p>
          )}
        </div>

        <div>
          <span className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#666] mb-2">
            Fascia oraria
            {caricando && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#999]" />}
          </span>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {SLOT_ORARI.map((slot) => {
              const sel = ora === slot;
              const occupato = slotGiorno ? slotGiorno[slot] === false : false;
              return (
                <button
                  key={slot}
                  onClick={() => !occupato && onOra(slot)}
                  disabled={occupato}
                  title={occupato ? 'Fascia non disponibile' : undefined}
                  className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition ${
                    sel
                      ? 'border-[#F5B800] bg-[#F5B800] text-[#1A1A1A]'
                      : occupato
                        ? 'border-[#EEE] bg-[#F7F7F7] text-[#CCC] cursor-not-allowed line-through'
                        : 'border-[#E5E5E5] bg-white hover:border-[#F5B800]'
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
          {data && slotGiorno && Object.values(slotGiorno).every((l) => !l) && (
            <p className="text-sm text-[#C0392B] mt-3 text-center">
              Nessuna fascia libera in questa data: scegli un altro giorno.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StepRiepilogo({
  riepilogo,
  costi,
  nome,
  telefono,
  email,
  indirizzo,
  cap,
  citta,
  onNome,
  onTelefono,
  onEmail,
  onIndirizzo,
  onCap,
  onCitta,
  inviando,
  onVaiAllaConferma,
}: {
  riepilogo: PrenotazioneRiepilogo;
  costi: ReturnType<typeof calcolaCosti>;
  nome: string;
  telefono: string;
  email: string;
  indirizzo: string;
  cap: string;
  citta: string;
  onNome: (v: string) => void;
  onTelefono: (v: string) => void;
  onEmail: (v: string) => void;
  onIndirizzo: (v: string) => void;
  onCap: (v: string) => void;
  onCitta: (v: string) => void;
  inviando: boolean;
  onVaiAllaConferma: () => void;
}) {
  const tipo = riepilogo.categoria === 'idro' ? 'Idraulico' : 'Elettricista';

  // Per mostrare l'errore solo dopo che l'utente ha interagito col campo.
  const [toccato, setToccato] = useState({
    nome: false,
    telefono: false,
    email: false,
    indirizzo: false,
    cap: false,
    citta: false,
  });
  // Consenso privacy obbligatorio (coerente con gli altri form del sito che
  // raccolgono dati personali). È solo un gate UI: non viene persistito.
  const [consenso, setConsenso] = useState(false);
  const nomeOk = nome.trim().length >= 2;
  const telOk = telefonoValido(telefono);
  const emailOk = emailValida(email);
  const indirizzoOk = indirizzo.trim().length >= 3;
  const capOk = capValido(cap);
  const cittaOk = citta.trim().length >= 2;
  const fuoriZona = fuoriZonaCap(cap);
  const formValido = nomeOk && telOk && emailOk && indirizzoOk && capOk && cittaOk;

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
              {riepilogo.vociCustom.map((c) => (
                <div key={c.id} className="flex justify-between gap-3 text-sm">
                  <span className="text-[#1A1A1A] flex items-start gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#F5B800] flex-shrink-0 mt-0.5" />
                    {c.descrizione}
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

        <div className="border-t border-[#E5E5E5] mt-4 pt-4">
          <div className="flex items-end justify-between">
            <span className="font-display text-lg font-bold">Totale stimato</span>
            <span className="font-display text-3xl font-bold text-[#F5B800]">€ {costi.totale.toFixed(2)}</span>
          </div>
          <div className="text-right text-[11px] text-[#666] mt-0.5">IVA compresa</div>
        </div>

        <div className="border-t border-[#E5E5E5] mt-4 pt-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#666] mb-3">
            Indirizzo dell'intervento <span className="text-[#C0392B]">— obbligatorio</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block sm:col-span-3">
              <span className="block text-[10px] font-mono uppercase tracking-wider text-[#666] mb-1.5">
                Via e numero civico *
              </span>
              <input
                type="text"
                value={indirizzo}
                onChange={(e) => onIndirizzo(e.target.value)}
                onBlur={() => setToccato((t) => ({ ...t, indirizzo: true }))}
                placeholder="Via Roma 10"
                autoComplete="street-address"
                className={campoCls(toccato.indirizzo && !indirizzoOk)}
              />
              {toccato.indirizzo && !indirizzoOk && <p className={ERR_CLS}>Inserisci via e numero civico.</p>}
            </label>
            <label className="block">
              <span className="block text-[10px] font-mono uppercase tracking-wider text-[#666] mb-1.5">
                CAP *
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={cap}
                onChange={(e) => onCap(e.target.value.replace(/\D/g, '').slice(0, 5))}
                onBlur={() => setToccato((t) => ({ ...t, cap: true }))}
                placeholder="00100"
                autoComplete="postal-code"
                className={campoCls(toccato.cap && !capOk)}
              />
              {toccato.cap && !capOk && <p className={ERR_CLS}>CAP di 5 cifre.</p>}
            </label>
            <label className="block sm:col-span-2">
              <span className="block text-[10px] font-mono uppercase tracking-wider text-[#666] mb-1.5">
                Città *
              </span>
              <input
                type="text"
                value={citta}
                onChange={(e) => onCitta(e.target.value)}
                onBlur={() => setToccato((t) => ({ ...t, citta: true }))}
                placeholder="Roma"
                autoComplete="address-level2"
                className={campoCls(toccato.citta && !cittaOk)}
              />
              {toccato.citta && !cittaOk && <p className={ERR_CLS}>Inserisci la città.</p>}
            </label>
          </div>
          {fuoriZona && (
            <div className="flex gap-2 rounded-xl bg-[#FFF8E7] border border-[#F5B800] p-3 mt-3 text-xs text-[#1A1A1A]">
              <Info className="w-4 h-4 text-[#F5B800] flex-shrink-0 mt-0.5" />
              <span className="leading-snug">
                Operiamo principalmente su <strong>Roma e provincia</strong> (entro ~40 km). Il tuo indirizzo
                sembra fuori da questa zona: puoi comunque prenotare, ti <strong>ricontattiamo per valutare
                la fattibilità</strong> dell'intervento.
              </span>
            </div>
          )}
        </div>

        <div className="border-t border-[#E5E5E5] mt-4 pt-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#666] mb-3">
            I tuoi dati <span className="text-[#C0392B]">— obbligatori</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block sm:col-span-2">
              <span className="block text-[10px] font-mono uppercase tracking-wider text-[#666] mb-1.5">
                Nome e cognome *
              </span>
              <input
                type="text"
                value={nome}
                onChange={(e) => onNome(e.target.value)}
                onBlur={() => setToccato((t) => ({ ...t, nome: true }))}
                placeholder="Mario Rossi"
                autoComplete="name"
                className={campoCls(toccato.nome && !nomeOk)}
              />
              {toccato.nome && !nomeOk && <p className={ERR_CLS}>Inserisci nome e cognome.</p>}
            </label>
            <label className="block">
              <span className="block text-[10px] font-mono uppercase tracking-wider text-[#666] mb-1.5">
                Telefono *
              </span>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => onTelefono(e.target.value)}
                onBlur={() => setToccato((t) => ({ ...t, telefono: true }))}
                placeholder="333 1234567"
                autoComplete="tel"
                className={campoCls(toccato.telefono && !telOk)}
              />
              {toccato.telefono && !telOk && <p className={ERR_CLS}>Numero non valido.</p>}
            </label>
            <label className="block">
              <span className="block text-[10px] font-mono uppercase tracking-wider text-[#666] mb-1.5">
                Email *
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => onEmail(e.target.value)}
                onBlur={() => setToccato((t) => ({ ...t, email: true }))}
                placeholder="mario.rossi@email.it"
                autoComplete="email"
                className={campoCls(toccato.email && !emailOk)}
              />
              {toccato.email && !emailOk && <p className={ERR_CLS}>Email non valida.</p>}
            </label>
          </div>
          <p className="text-[11px] text-[#666] mt-2 leading-snug">
            Ti invieremo la conferma dell'appuntamento via <strong>email</strong> a questo indirizzo.
          </p>
        </div>

        <label className="flex items-start gap-2 mt-5 text-[12px] text-[#666] leading-snug cursor-pointer">
          <input
            type="checkbox"
            checked={consenso}
            onChange={(e) => setConsenso(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#F5B800] flex-shrink-0"
          />
          <span>
            Ho letto e accetto la{' '}
            <a
              href="/privacy-policy.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#F5B800] hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              privacy policy
            </a>{' '}
            e acconsento al trattamento dei miei dati per essere ricontattato.
          </span>
        </label>

        <button
          onClick={() => {
            if (inviando) return;
            if (!formValido) {
              setToccato({
                nome: true,
                telefono: true,
                email: true,
                indirizzo: true,
                cap: true,
                citta: true,
              });
              toast.error('Completa i tuoi dati', {
                description: 'Indirizzo, nome, telefono ed email sono obbligatori per confermare.',
              });
              return;
            }
            if (!consenso) {
              toast.error('Consenso richiesto', {
                description: 'Accetta la privacy policy per confermare la prenotazione.',
              });
              return;
            }
            onVaiAllaConferma();
          }}
          disabled={inviando}
          className="w-full mt-4 bg-[#1A1A1A] hover:bg-black text-white font-semibold py-3.5 rounded-full text-sm flex items-center justify-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {inviando ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Invio in corso…
            </>
          ) : (
            <>
              <Check className="w-4 h-4" /> Conferma prenotazione
            </>
          )}
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
      <h2 className="font-display text-3xl font-bold mb-2">Prenotazione confermata!</h2>
      <p className="text-[#666] mb-1">
        Intervento <strong>{tipo}</strong> · {formatDataLeggibile(riepilogo.data)} alle <strong>{riepilogo.ora}</strong>
      </p>
      <p className="text-[#666] mb-8">
        {riepilogo.email ? (
          <>
            Conferma inviata via email a <strong>{riepilogo.email}</strong> con il riepilogo
            dell'appuntamento.
          </>
        ) : (
          <>Ti contatteremo a breve via email per confermare l'appuntamento.</>
        )}
      </p>

      <div className="space-y-3">
        <div className="flex items-start gap-2.5 rounded-2xl bg-[#FFF8E7] border border-[#F5B800]/50 p-4 text-left text-sm text-[#1A1A1A]">
          <CheckCircle2 className="w-5 h-5 text-[#F5B800] flex-shrink-0 mt-0.5" />
          <span>
            Ti confermeremo l'appuntamento entro 24 ore lavorative. Intanto puoi aggiungerlo al tuo
            calendario.
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <a
            href={linkGoogleCalendar(riepilogo)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 rounded-full border-2 border-[#E5E5E5] hover:border-[#F5B800] text-sm font-semibold transition"
          >
            <CalendarPlus className="w-4 h-4" /> Google Calendar
          </a>
          <a
            href={linkOutlookCalendar(riepilogo, 'outlook.live.com')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 rounded-full border-2 border-[#E5E5E5] hover:border-[#F5B800] text-sm font-semibold transition"
          >
            <CalendarPlus className="w-4 h-4" /> Outlook
          </a>
          <a
            href={linkOutlookCalendar(riepilogo, 'outlook.office.com')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 rounded-full border-2 border-[#E5E5E5] hover:border-[#F5B800] text-sm font-semibold transition"
          >
            <CalendarPlus className="w-4 h-4" /> Office 365
          </a>
          <button
            onClick={() => scaricaICS(riepilogo)}
            className="flex items-center justify-center gap-2 py-3 rounded-full border-2 border-[#E5E5E5] hover:border-[#F5B800] text-sm font-semibold transition"
          >
            <CalendarDays className="w-4 h-4" /> Apple
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
