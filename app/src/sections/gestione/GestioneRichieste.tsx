/**
 * Gestionale MB (?admin=1) — protetto da password.
 *
 * Versione "gestione clienti" a schede, chiara e mobile-first:
 *   • Oggi        → cosa fare adesso: da lavorare, appuntamenti di oggi, novità
 *   • Richieste   → elenco unico (sopralluoghi + interventi + preventivi) con
 *                   ricerca, filtri e apertura del dettaglio
 *   • Preventivi  → stime condivise, con follow-up (convertite o no)
 *   • Scheda cliente → tutta la storia di UNA persona (aggregata per email/telefono)
 *                   con note/promemoria interni
 *
 * Tutto via edge function `admin-richieste` (service role + password). La password
 * resta in localStorage del dispositivo dopo il primo accesso.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Loader2, Lock, RefreshCw, X, FileText, Eye, EyeOff, LogOut, Search, Phone,
  MapPin, MessageCircle, CalendarClock, User, StickyNote, ChevronRight, Plus,
  Trash2, ArrowLeft, Mail, Home, AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const PW_KEY = 'mb_admin_pw';
const INP = 'w-full h-10 px-3 rounded-lg border border-[#ECE7DD] focus:border-[#F5B800] outline-none text-sm';
const SLOT_ORARI = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
const oggiISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

// ── Tipi grezzi dal server ───────────────────────────────────────────────────
interface Sopralluogo {
  id: string; created_at: string; nome: string | null; email: string | null;
  telefono: string | null; note: string | null;
  allegati: { nome: string; path: string }[]; stato: string;
}
interface Intervento {
  id: string; created_at: string; nome: string | null; email: string | null;
  telefono: string | null; categoria: string; urgenza: string;
  data_intervento: string | null; ora_intervento: string | null;
  totale_stimato: number; stato: string;
  indirizzo: string | null; cap: string | null; citta: string | null;
  fuori_zona: boolean | null;
  voci: { id: number; voce: string; prezzo: number }[] | null;
  voci_custom: string[] | null;
  google_event_id: string | null;
}
interface Preventivo {
  id: string; created_at: string; totale: number; totale_ivato: number | null;
  finitura: string | null; tempistica: string | null; mq: number | null;
  interventi: string[] | null;
  contatti: { name?: string; email?: string; phone?: string } | null;
  tipo_casa: string | null;
}
interface AttivitaPdf {
  tipo: string; dettaglio: Record<string, unknown>; conteggio: number;
  created_at: string; ultima_volta: string;
  contatto: { email: string | null; nome: string | null; telefono: string | null } | null;
}
interface Nota { id: string; testo: string; autore: string | null; fatto: boolean; created_at: string; }

// ── Pratica unificata (per liste e ricerca) ──────────────────────────────────
type Kind = 'sopralluogo' | 'certificazione' | 'intervento' | 'preventivo';
interface Pratica {
  kind: Kind;
  id: string;
  created_at: string;
  nome: string | null;
  email: string | null;
  telefono: string | null;
  stato: string | null; // solo sopralluogo/intervento
  sop?: Sopralluogo;
  int?: Intervento;
  prev?: Preventivo;
}

// ── Helper ───────────────────────────────────────────────────────────────────
function dtBreve(iso: string): string {
  try { return new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}
function dataLeggibile(d: string | null): string {
  if (!d) return '—';
  const p = d.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
}
function giornoLeggibile(iso: string): string {
  try {
    const [y, m, d] = iso.split('-').map(Number);
    const s = new Date(y, m - 1, d).toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch { return iso; }
}
function isImg(nome: string): boolean { return /\.(jpe?g|png|webp|heic|heif)$/i.test(nome); }
function normEmail(e: string | null | undefined): string { return (e ?? '').trim().toLowerCase(); }
function normTel(t: string | null | undefined): string {
  const d = (t ?? '').replace(/\D/g, '');
  return d.length > 9 ? d.slice(-9) : d; // ultime 9 cifre: ignora prefisso +39/0039
}
function waLink(t: string | null | undefined): string | null {
  const d = normTel(t); return d ? `https://wa.me/39${d}` : null;
}
function mapsLink(i: Intervento): string | null {
  const q = [i.indirizzo, i.cap, i.citta].filter(Boolean).join(' ');
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}
function contactKey(email: string | null | undefined, tel: string | null | undefined): string {
  const e = normEmail(email); if (e) return 'e:' + e;
  const t = normTel(tel); if (t) return 't:' + t;
  return 'x:sconosciuto';
}
function fmtEur(n: number | null | undefined): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(n) || 0);
}

const STATO_ADMIN: { v: string; label: string }[] = [
  { v: 'nuovo', label: 'Nuovo' },
  { v: 'in_lavorazione', label: 'In lavorazione' },
  { v: 'preventivo_inviato', label: 'Preventivo inviato' },
  { v: 'chiuso', label: 'Chiuso' },
  { v: 'perso', label: 'Perso' },
];
function statoInfo(s: string | null): { label: string; cls: string } {
  const m: Record<string, { label: string; cls: string }> = {
    nuovo: { label: 'Nuovo', cls: 'red' }, nuova: { label: 'Nuovo', cls: 'red' },
    in_lavorazione: { label: 'In lavorazione', cls: 'amber' },
    preventivo_inviato: { label: 'Preventivo inviato', cls: 'accent' },
    gestito: { label: 'Chiuso', cls: 'green' }, chiuso: { label: 'Chiuso', cls: 'green' },
    perso: { label: 'Perso', cls: 'grey' },
    spostata: { label: 'Spostato dal cliente', cls: 'amber' },
    annullata: { label: 'Annullato', cls: 'grey' }, annullato: { label: 'Annullato', cls: 'grey' },
    riprogrammato: { label: 'Riprogrammato', cls: 'amber' },
  };
  return m[s ?? ''] ?? { label: s || '—', cls: 'grey' };
}
const STATO_CLS: Record<string, string> = {
  red: 'bg-[#C0392B]/12 text-[#C0392B]',
  amber: 'bg-[#B36B00]/12 text-[#B36B00]',
  accent: 'bg-[#F5B800]/25 text-[#8a6d00]',
  green: 'bg-[#2E7D32]/12 text-[#2E7D32]',
  grey: 'bg-[#8A857B]/15 text-[#6B665C]',
};
function kindLabel(k: Kind): string {
  return k === 'sopralluogo' ? 'Sopralluogo' : k === 'certificazione' ? 'Certificazione' : k === 'intervento' ? 'Intervento' : 'Preventivo';
}
const KIND_CLS: Record<Kind, string> = {
  sopralluogo: 'bg-[#F5B800]/20 text-[#8a6d00]',
  certificazione: 'bg-[#2E7D32]/12 text-[#2E7D32]',
  intervento: 'bg-[#1A1A1A]/8 text-[#1A1A1A]',
  preventivo: 'bg-[#4B6BFB]/12 text-[#3652c9]',
};
function isNuovo(s: string | null): boolean { return s === 'nuovo' || s === 'nuova'; }

export default function GestioneRichieste({ leadId }: { leadId?: string }) {
  const [pw, setPw] = useState<string>(() => localStorage.getItem(PW_KEY) ?? '');
  const [pwInput, setPwInput] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [recMsg, setRecMsg] = useState('');
  const [authed, setAuthed] = useState(false);
  const [caricando, setCaricando] = useState(false);
  const [errore, setErrore] = useState('');

  const [sopralluoghi, setSopralluoghi] = useState<Sopralluogo[]>([]);
  const [interventi, setInterventi] = useState<Intervento[]>([]);
  const [preventivi, setPreventivi] = useState<Preventivo[]>([]);
  const [attivita, setAttivita] = useState<AttivitaPdf[]>([]);

  const [tab, setTab] = useState<'oggi' | 'agenda' | 'richieste' | 'preventivi'>('oggi');
  const [ricerca, setRicerca] = useState('');
  const [filtroKind, setFiltroKind] = useState<'tutti' | Kind>('tutti');
  const [filtroStato, setFiltroStato] = useState<'tutti' | 'da_lavorare' | 'chiusi'>('tutti');

  const [sel, setSel] = useState<Pratica | null>(null);
  const [firme, setFirme] = useState<{ nome: string; url: string | null }[]>([]);
  const [azioneErr, setAzioneErr] = useState('');
  const [salvandoStato, setSalvandoStato] = useState(false);

  const [schedaKey, setSchedaKey] = useState<string | null>(null);
  const [note, setNote] = useState<Nota[]>([]);
  const [notaTesto, setNotaTesto] = useState('');
  const [notaBusy, setNotaBusy] = useState(false);

  const [annullaEsito, setAnnullaEsito] = useState<{ ok: boolean; testo: string } | null>(null);
  const [annullaTarget, setAnnullaTarget] = useState<Intervento | null>(null);
  const [propData, setPropData] = useState('');
  const [propOra, setPropOra] = useState('');
  const [annullando, setAnnullando] = useState(false);

  // Nuovo appuntamento / sposta dal gestionale
  const [nuovoOpen, setNuovoOpen] = useState(false);
  const [nuovoBusy, setNuovoBusy] = useState(false);
  const [nuovoErr, setNuovoErr] = useState('');
  const [nuovo, setNuovo] = useState({ nome: '', telefono: '', email: '', categoria: 'idro', indirizzo: '', cap: '', citta: '', data: '', ora: '', note: '' });
  const [spostaTarget, setSpostaTarget] = useState<Intervento | null>(null);
  const [spostaData, setSpostaData] = useState('');
  const [spostaOra, setSpostaOra] = useState('');
  const [spostando, setSpostando] = useState(false);
  const [spostaErr, setSpostaErr] = useState('');

  const chiama = useCallback(async (azione: string, extra: Record<string, unknown> = {}, password = pw) => {
    if (!supabase) throw new Error('config');
    const { data, error } = await supabase.functions.invoke('admin-richieste', { body: { password, azione, ...extra } });
    if (error) {
      const status = (error as { context?: Response }).context?.status;
      if (status === 401) throw new Error('password_errata');
      if (status === 503) throw new Error('non_configurato');
      if (status === 502) {
        try {
          const b = await (error as { context?: Response }).context?.clone().json();
          if (b?.error) throw new Error(String(b.error));
        } catch { /* body non leggibile */ }
      }
      throw error;
    }
    return data;
  }, [pw]);

  const caricaLista = useCallback(async (password: string) => {
    setCaricando(true); setErrore('');
    try {
      const data = await chiama('lista', {}, password);
      setSopralluoghi(data.sopralluoghi ?? []);
      setInterventi(data.interventi ?? []);
      setPreventivi(data.preventivi ?? []);
      setAttivita(data.attivita ?? []);
      setAuthed(true);
      localStorage.setItem(PW_KEY, password);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'password_errata') { setErrore('Password errata.'); setAuthed(false); localStorage.removeItem(PW_KEY); }
      else if (msg === 'non_configurato') setErrore('Gestionale non ancora configurato (manca la password lato server).');
      else setErrore('Errore di caricamento. Riprova.');
    }
    setCaricando(false);
  }, [chiama]);

  useEffect(() => {
    if (pw) caricaLista(pw);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derivazioni ────────────────────────────────────────────────────────────
  const pratiche = useMemo<Pratica[]>(() => {
    const out: Pratica[] = [];
    for (const s of sopralluoghi) {
      const cert = s.note?.startsWith('[Richiesta CERTIFICAZIONE');
      out.push({ kind: cert ? 'certificazione' : 'sopralluogo', id: s.id, created_at: s.created_at, nome: s.nome, email: s.email, telefono: s.telefono, stato: s.stato, sop: s });
    }
    for (const i of interventi) {
      out.push({ kind: 'intervento', id: i.id, created_at: i.created_at, nome: i.nome, email: i.email, telefono: i.telefono, stato: i.stato, int: i });
    }
    for (const p of preventivi) {
      out.push({ kind: 'preventivo', id: p.id, created_at: p.created_at, nome: p.contatti?.name ?? null, email: p.contatti?.email ?? null, telefono: p.contatti?.phone ?? null, stato: null, prev: p });
    }
    return out.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [sopralluoghi, interventi, preventivi]);

  // Contatti aggregati per email/telefono (ponte Fase 1; la FK arriverà dopo).
  type Contatto = { key: string; nome: string; email: string | null; telefono: string | null; pratiche: Pratica[]; pdf: AttivitaPdf[] };
  const contatti = useMemo(() => {
    const map = new Map<string, Contatto>();
    for (const p of pratiche) {
      const k = contactKey(p.email, p.telefono);
      if (k === 'x:sconosciuto') continue;
      let c = map.get(k);
      if (!c) { c = { key: k, nome: p.nome || '', email: p.email, telefono: p.telefono, pratiche: [], pdf: [] }; map.set(k, c); }
      c.pratiche.push(p);
      if (!c.nome && p.nome) c.nome = p.nome;
      if (!c.email && p.email) c.email = p.email;
      if (!c.telefono && p.telefono) c.telefono = p.telefono;
    }
    for (const a of attivita) {
      if (a.tipo !== 'pdf' || !a.contatto) continue;
      const k = contactKey(a.contatto.email, a.contatto.telefono);
      const c = map.get(k);
      if (c) c.pdf.push(a);
    }
    return map;
  }, [pratiche, attivita]);

  const schedaContatto = schedaKey ? contatti.get(schedaKey) ?? null : null;

  // ── Azioni ─────────────────────────────────────────────────────────────────
  async function apri(p: Pratica) {
    setSel(p); setFirme([]); setAnnullaEsito(null); setAzioneErr('');
    if (p.kind !== 'preventivo' && p.sop?.allegati?.length) {
      try {
        const data = await chiama('firma', { paths: p.sop.allegati.map((a) => a.path) });
        const m = new Map<string, string | null>((data.urls ?? []).map((u: { path: string; url: string | null }) => [u.path, u.url]));
        setFirme(p.sop.allegati.map((a) => ({ nome: a.nome, url: m.get(a.path) ?? null })));
      } catch { /* allegati non firmabili */ }
    }
  }

  // Deep-link: apri la pratica indicata da ?lead=<id> una volta caricati i dati.
  useEffect(() => {
    if (!authed || !leadId) return;
    const p = pratiche.find((x) => x.id === leadId);
    if (p) apri(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, leadId]);

  function aggiornaStatoLocale(p: Pratica, nuovo: string) {
    if (p.kind === 'sopralluogo' || p.kind === 'certificazione') {
      setSopralluoghi((prev) => prev.map((s) => (s.id === p.id ? { ...s, stato: nuovo } : s)));
    } else if (p.kind === 'intervento') {
      setInterventi((prev) => prev.map((i) => (i.id === p.id ? { ...i, stato: nuovo } : i)));
    }
    setSel((s) => (s && s.id === p.id ? { ...s, stato: nuovo } : s));
  }

  async function segna(p: Pratica, nuovo: string) {
    if (salvandoStato) return;
    setAzioneErr(''); setSalvandoStato(true);
    try {
      await chiama('segna', { tipo: p.kind === 'intervento' ? 'intervento' : 'sopralluogo', id: p.id, stato: nuovo });
      aggiornaStatoLocale(p, nuovo);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'password_errata') { esci(); setErrore('Sessione scaduta, accedi di nuovo.'); }
      else setAzioneErr('Operazione non riuscita. Controlla la connessione e riprova.');
    }
    setSalvandoStato(false);
  }

  async function apriScheda(p: Pratica) {
    const k = contactKey(p.email, p.telefono);
    if (k === 'x:sconosciuto') return;
    setSchedaKey(k); setNote([]); setNotaTesto('');
    const email = normEmail(p.email);
    if (email) {
      try { const d = await chiama('note_lista', { email }); setNote(d.note ?? []); } catch { /* note non caricate */ }
    }
  }

  async function aggiungiNota() {
    const email = normEmail(schedaContatto?.email);
    const testo = notaTesto.trim();
    if (!email || !testo || notaBusy) return;
    setNotaBusy(true);
    try {
      const d = await chiama('nota_aggiungi', { email, testo });
      if (d?.nota) setNote((prev) => [d.nota, ...prev]);
      setNotaTesto('');
    } catch { setAzioneErr('Nota non salvata. Riprova.'); }
    setNotaBusy(false);
  }
  async function eliminaNota(id: string) {
    setNote((prev) => prev.filter((n) => n.id !== id));
    try { await chiama('nota_elimina', { id }); } catch { /* best-effort */ }
  }

  async function creaAppuntamento() {
    if (nuovoBusy) return;
    setNuovoErr('');
    if (!nuovo.nome.trim() && !nuovo.telefono.trim()) { setNuovoErr('Inserisci almeno nome o telefono.'); return; }
    if (!nuovo.data || !nuovo.ora) { setNuovoErr('Scegli data e ora.'); return; }
    setNuovoBusy(true);
    try {
      await chiama('crea_appuntamento', { ...nuovo });
      setNuovoOpen(false);
      setNuovo({ nome: '', telefono: '', email: '', categoria: 'idro', indirizzo: '', cap: '', citta: '', data: '', ora: '', note: '' });
      await caricaLista(pw);
      setTab('agenda');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'password_errata') { setNuovoOpen(false); esci(); setErrore('Sessione scaduta, accedi di nuovo.'); }
      else setNuovoErr(
        msg === 'slot_occupato' ? 'Quello slot è già occupato. Scegline un altro.'
          : msg === 'giorno_non_valido' ? 'Niente appuntamenti nel weekend.'
            : msg === 'passato' ? 'Quella data/ora è già passata.'
              : msg === 'ora_non_valida' ? 'Orario non valido.'
                : msg === 'calendario_non_aggiornato' ? 'Calendario non aggiornato. Riprova.'
                  : 'Creazione non riuscita. Riprova.');
    }
    setNuovoBusy(false);
  }

  function apriSposta(i: Intervento) { setSpostaData(i.data_intervento ?? ''); setSpostaOra(i.ora_intervento ?? ''); setSpostaErr(''); setSpostaTarget(i); }
  async function confermaSposta() {
    const i = spostaTarget;
    if (!i || spostando) return;
    if (!spostaData || !spostaOra) { setSpostaErr('Scegli data e ora.'); return; }
    setSpostando(true); setSpostaErr('');
    try {
      await chiama('sposta', { tipo: 'intervento', id: i.id, data: spostaData, ora: spostaOra });
      setInterventi((prev) => prev.map((x) => (x.id === i.id ? { ...x, data_intervento: spostaData, ora_intervento: spostaOra } : x)));
      setSel((s) => (s && s.id === i.id && s.int ? { ...s, int: { ...s.int, data_intervento: spostaData, ora_intervento: spostaOra } } : s));
      setSpostaTarget(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'password_errata') { setSpostaTarget(null); esci(); setErrore('Sessione scaduta, accedi di nuovo.'); }
      else setSpostaErr(
        msg === 'slot_occupato' ? 'Slot occupato. Scegline un altro.'
          : msg === 'giorno_non_valido' ? 'Niente appuntamenti nel weekend.'
            : msg === 'passato' ? 'Data/ora già passata.'
              : msg === 'calendario_non_aggiornato' ? 'Calendario non aggiornato. Riprova.'
                : 'Spostamento non riuscito. Riprova.');
    }
    setSpostando(false);
  }

  function login(e: React.FormEvent) {
    e.preventDefault();
    if (!pwInput.trim()) return;
    setPw(pwInput.trim()); caricaLista(pwInput.trim());
  }
  function esci() {
    localStorage.removeItem(PW_KEY);
    setPw(''); setPwInput(''); setAuthed(false);
    setSopralluoghi([]); setInterventi([]); setPreventivi([]); setAttivita([]);
    setSel(null); setSchedaKey(null); setRecMsg(''); setErrore('');
  }
  async function recupera() {
    setRecMsg(''); setErrore('');
    if (!supabase) return;
    try {
      const { error } = await supabase.functions.invoke('recupera-password-admin', { body: {} });
      if (error) {
        const st = (error as { context?: Response }).context?.status;
        setRecMsg(st === 503 ? 'Imposta prima la password lato server (Supabase).' : 'Invio non riuscito. Riprova.');
        return;
      }
      setRecMsg('Password inviata alla mail aziendale. Controlla la posta.');
    } catch { setRecMsg('Invio non riuscito. Riprova.'); }
  }

  function apriAnnulla(i: Intervento) { setPropData(''); setPropOra(''); setAzioneErr(''); setAnnullaTarget(i); }
  async function confermaAnnulla() {
    const i = annullaTarget;
    if (!i || annullando) return;
    setAnnullando(true); setAzioneErr('');
    const proposta = propData && propOra ? { propostaData: propData, propostaOra: propOra } : {};
    try {
      const res = await chiama('annulla', { tipo: 'intervento', id: i.id, ...proposta });
      setInterventi((prev) => prev.map((x) => (x.id === i.id ? { ...x, stato: 'annullata' } : x)));
      setSel((s) => (s && s.id === i.id ? { ...s, stato: 'annullata' } : s));
      setAnnullaTarget(null);
      const esitoEmail = (res as { email?: string } | null)?.email;
      if (esitoEmail === 'inviata') setAnnullaEsito({ ok: true, testo: 'Appuntamento annullato ed email inviata al cliente.' });
      else if (esitoEmail) {
        const motivo = esitoEmail === 'senza_email' ? 'il cliente non ha lasciato un indirizzo email'
          : esitoEmail === 'non_configurata' ? 'le credenziali email del server non sono configurate' : "l'invio è fallito";
        setAnnullaEsito({ ok: false, testo: `Appuntamento annullato, ma l'email al cliente NON è partita (${motivo}). Avvisa tu il cliente.` });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'password_errata') { setAnnullaTarget(null); esci(); setErrore('Sessione scaduta, accedi di nuovo.'); }
      else if (msg === 'calendario_non_aggiornato') setAzioneErr('Non è stato possibile aggiornare il calendario Google: l’appuntamento NON è stato annullato. Riprova tra poco.');
      else setAzioneErr('Annullamento non riuscito. Riprova.');
    }
    setAnnullando(false);
  }

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#FBFAF7] flex items-center justify-center px-4">
        <form onSubmit={login} className="bg-white rounded-3xl border border-[#ECE7DD] shadow-sm p-8 w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-[#F5B800]/15 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-[#F5B800]" />
          </div>
          <h1 className="text-xl font-bold mb-1">Gestionale clienti</h1>
          <p className="text-sm text-[#6B665C] mb-5">MB Ristrutturazioni · accesso riservato</p>
          <div className="relative mb-3">
            <input type={showPw ? 'text' : 'password'} value={pwInput} onChange={(e) => setPwInput(e.target.value)}
              placeholder="Password" autoFocus
              className="w-full h-12 rounded-xl border-2 border-[#ECE7DD] pl-4 pr-12 focus:border-[#F5B800] outline-none" />
            <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Nascondi password' : 'Mostra password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#1A1A1A]">
              {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errore && <p className="text-sm text-[#C0392B] mb-3">{errore}</p>}
          <button type="submit" disabled={caricando}
            className="w-full bg-[#F5B800] text-[#1A1A1A] font-bold h-12 rounded-xl hover:bg-[#E0A800] disabled:opacity-50 flex items-center justify-center gap-2">
            {caricando ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Entra
          </button>
          <button type="button" onClick={recupera} className="mt-4 text-sm text-[#6B665C] hover:text-[#1A1A1A] underline">
            Password dimenticata? Inviala alla mail aziendale
          </button>
          {recMsg && <p className="text-sm text-[#2E7D32] mt-2">{recMsg}</p>}
        </form>
      </div>
    );
  }

  // ── Dati per le viste ────────────────────────────────────────────────────
  const oggi = oggiISO();
  const daLavorare = pratiche.filter((p) => isNuovo(p.stato));
  const appOggi = interventi
    .filter((i) => i.data_intervento === oggi && i.stato !== 'annullata')
    .sort((a, b) => (a.ora_intervento ?? '').localeCompare(b.ora_intervento ?? ''));
  // Agenda: appuntamenti da oggi in poi, raggruppati per giorno.
  const agendaGiorni: [string, Intervento[]][] = [];
  {
    const mp = new Map<string, Intervento[]>();
    interventi
      .filter((i) => i.data_intervento && i.data_intervento >= oggi && i.stato !== 'annullata')
      .sort((a, b) => `${a.data_intervento}${a.ora_intervento ?? ''}`.localeCompare(`${b.data_intervento}${b.ora_intervento ?? ''}`))
      .forEach((i) => { const k = i.data_intervento!; if (!mp.has(k)) mp.set(k, []); mp.get(k)!.push(i); });
    agendaGiorni.push(...mp.entries());
  }
  const nuoviRecenti = pratiche.filter((p) => {
    const h = (Date.now() - new Date(p.created_at).getTime()) / 3_600_000;
    return h <= 48;
  });

  const richiesteFiltrate = pratiche.filter((p) => {
    if (filtroKind !== 'tutti' && p.kind !== filtroKind) return false;
    if (filtroStato === 'da_lavorare' && !isNuovo(p.stato)) return false;
    if (filtroStato === 'chiusi' && !(p.stato === 'chiuso' || p.stato === 'gestito' || p.stato === 'perso')) return false;
    if (ricerca.trim()) {
      const q = ricerca.trim().toLowerCase();
      const hay = `${p.nome ?? ''} ${p.email ?? ''} ${p.telefono ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // Componenti riga/badge riusati
  const Badge = ({ k }: { k: Kind }) => (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${KIND_CLS[k]}`}>{kindLabel(k)}</span>
  );
  const StatoBadge = ({ s }: { s: string | null }) => {
    if (!s) return null;
    const info = statoInfo(s);
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${STATO_CLS[info.cls]}`}>{info.label}</span>;
  };

  const RigaPratica = ({ p, sub }: { p: Pratica; sub?: string }) => (
    <button onClick={() => apri(p)}
      className="w-full text-left bg-white rounded-2xl border border-[#ECE7DD] p-3.5 hover:border-[#F5B800]/60 hover:shadow-sm transition flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <Badge k={p.kind} />
          <StatoBadge s={p.stato} />
        </div>
        <p className="font-semibold truncate text-[#1A1A1A]">{p.nome || 'Senza nome'}</p>
        <p className="text-sm text-[#6B665C] truncate">
          {sub ?? (p.telefono || p.email || '—')}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-[#C9C3B6] shrink-0" />
    </button>
  );

  const AppCard = ({ i }: { i: Intervento }) => {
    const p = pratiche.find((x) => x.id === i.id && x.kind === 'intervento');
    const ml = mapsLink(i);
    return (
      <div className="bg-white rounded-2xl border border-[#ECE7DD] p-3.5">
        <div className="flex items-start gap-3">
          <div className="text-center shrink-0 w-14">
            <div className="text-xl font-extrabold leading-none">{i.ora_intervento ?? '—'}</div>
            <div className="text-[10px] uppercase tracking-wide text-[#938D80] mt-1">{i.categoria === 'idro' ? 'Idraulico' : 'Elettr.'}</div>
          </div>
          <button onClick={() => p && apri(p)} className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              <p className="font-semibold truncate">{i.nome || 'Senza nome'}</p>
              <StatoBadge s={i.stato} />
              {i.fuori_zona && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#C0392B]/12 text-[#C0392B]">Fuori zona</span>}
            </div>
            <p className="text-sm text-[#6B665C] truncate flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 shrink-0" />{[i.indirizzo, i.citta].filter(Boolean).join(', ') || 'Indirizzo non indicato'}
            </p>
          </button>
        </div>
        <div className="flex gap-1.5 mt-2.5 flex-wrap">
          {i.telefono && <AzMini href={`tel:${i.telefono}`} icona={<Phone className="w-3.5 h-3.5" />} testo="Chiama" />}
          {waLink(i.telefono) && <AzMini href={waLink(i.telefono)!} icona={<MessageCircle className="w-3.5 h-3.5" />} testo="WhatsApp" />}
          {ml && <AzMini href={ml} icona={<MapPin className="w-3.5 h-3.5" />} testo="Mappa" />}
          <button onClick={() => apriSposta(i)} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full bg-white border border-[#ECE7DD] text-[#1A1A1A] hover:border-[#F5B800]/60">
            <CalendarClock className="w-3.5 h-3.5" /> Sposta
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FBFAF7] text-[#1A1A1A]">
      {/* Header + tabs */}
      <div className="sticky top-0 z-30 bg-[#FBFAF7]/95 backdrop-blur border-b border-[#ECE7DD]">
        <div className="max-w-3xl mx-auto px-4 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-[#F5B800] grid place-items-center font-extrabold text-sm text-[#1A1A1A]">MB</span>
              <div>
                <h1 className="text-lg font-bold leading-none">Gestionale clienti</h1>
                <p className="text-[11px] text-[#938D80] mt-0.5">{pratiche.length} pratiche · {contatti.size} clienti</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => caricaLista(pw)} title="Aggiorna" className="w-9 h-9 grid place-items-center rounded-xl bg-white border border-[#ECE7DD] hover:bg-[#F5F2EB]">
                <RefreshCw className={`w-4 h-4 ${caricando ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={esci} title="Esci" className="w-9 h-9 grid place-items-center rounded-xl bg-white border border-[#ECE7DD] hover:bg-[#F5F2EB] text-[#6B665C]">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex gap-1">
            {([['oggi', 'Oggi'], ['agenda', 'Agenda'], ['richieste', 'Richieste'], ['preventivi', 'Preventivi']] as const).map(([v, label]) => (
              <button key={v} onClick={() => setTab(v)}
                className={`relative px-3.5 py-2.5 text-sm font-semibold rounded-t-lg transition ${tab === v ? 'text-[#1A1A1A]' : 'text-[#938D80] hover:text-[#6B665C]'}`}>
                {label}
                {v === 'oggi' && daLavorare.length > 0 && (
                  <span className="ml-1.5 text-[10px] font-bold bg-[#C0392B] text-white rounded-full px-1.5 py-0.5 align-middle">{daLavorare.length}</span>
                )}
                {tab === v && <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-[#F5B800] rounded-full" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5">
        {errore && <p className="text-sm text-[#C0392B] mb-3">{errore}</p>}

        {/* ── OGGI ── */}
        {tab === 'oggi' && (
          <div className="space-y-6">
            <Sezione titolo="Appuntamenti di oggi" contatore={appOggi.length} icona={<CalendarClock className="w-4 h-4" />}>
              {appOggi.length === 0 ? <Vuoto testo="Nessun appuntamento oggi." /> : (
                <div className="space-y-2">{appOggi.map((i) => <AppCard key={i.id} i={i} />)}</div>
              )}
            </Sezione>

            <Sezione titolo="Da lavorare" contatore={daLavorare.length} icona={<AlertTriangle className="w-4 h-4" />}>
              {daLavorare.length === 0 ? <Vuoto testo="Tutto lavorato. Ottimo." /> : (
                <div className="space-y-2">{daLavorare.slice(0, 20).map((p) => <RigaPratica key={`${p.kind}-${p.id}`} p={p} />)}</div>
              )}
            </Sezione>

            <Sezione titolo="Novità (ultime 48h)" contatore={nuoviRecenti.length} icona={<Home className="w-4 h-4" />}>
              {nuoviRecenti.length === 0 ? <Vuoto testo="Nessuna novità recente." /> : (
                <div className="space-y-2">{nuoviRecenti.slice(0, 12).map((p) => <RigaPratica key={`n-${p.kind}-${p.id}`} p={p} sub={dtBreve(p.created_at)} />)}</div>
              )}
            </Sezione>
          </div>
        )}

        {/* ── AGENDA ── */}
        {tab === 'agenda' && (
          <div>
            <button onClick={() => setNuovoOpen(true)} className="w-full mb-4 py-3 rounded-xl bg-[#F5B800] text-[#1A1A1A] font-bold flex items-center justify-center gap-2 hover:bg-[#E0A800]">
              <Plus className="w-4 h-4" /> Nuovo appuntamento
            </button>
            {agendaGiorni.length === 0 ? <Vuoto testo="Nessun appuntamento in programma." /> : (
              <div className="space-y-5">
                {agendaGiorni.map(([giorno, lista]) => (
                  <div key={giorno}>
                    <p className="text-xs font-bold uppercase tracking-wide text-[#938D80] mb-2">{giornoLeggibile(giorno)}</p>
                    <div className="space-y-2">{lista.map((i) => <AppCard key={i.id} i={i} />)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── RICHIESTE ── */}
        {tab === 'richieste' && (
          <div>
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-[#938D80] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input value={ricerca} onChange={(e) => setRicerca(e.target.value)} placeholder="Cerca nome, telefono o email…"
                className="w-full h-11 pl-10 pr-3 rounded-xl border border-[#ECE7DD] bg-white focus:border-[#F5B800] outline-none text-sm" />
            </div>
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {([['tutti', 'Tutti'], ['sopralluogo', 'Sopralluoghi'], ['certificazione', 'Certificazioni'], ['intervento', 'Interventi'], ['preventivo', 'Preventivi']] as const).map(([v, l]) => (
                <Chip key={v} attivo={filtroKind === v} onClick={() => setFiltroKind(v)}>{l}</Chip>
              ))}
              <span className="w-px bg-[#ECE7DD] shrink-0 my-1" />
              {([['tutti', 'Ogni stato'], ['da_lavorare', 'Da lavorare'], ['chiusi', 'Chiusi/Persi']] as const).map(([v, l]) => (
                <Chip key={v} attivo={filtroStato === v} onClick={() => setFiltroStato(v)}>{l}</Chip>
              ))}
            </div>
            {richiesteFiltrate.length === 0 ? <Vuoto testo="Nessun risultato." /> : (
              <div className="space-y-2">
                {richiesteFiltrate.map((p) => (
                  <RigaPratica key={`${p.kind}-${p.id}`} p={p}
                    sub={p.kind === 'intervento' && p.int?.data_intervento ? `${dataLeggibile(p.int.data_intervento)} ${p.int.ora_intervento ?? ''} · ${p.telefono ?? ''}`
                      : p.kind === 'preventivo' ? `${fmtEur(p.prev?.totale_ivato ?? p.prev?.totale)} · ${dtBreve(p.created_at)}`
                        : (p.telefono || p.email || dtBreve(p.created_at))} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PREVENTIVI ── */}
        {tab === 'preventivi' && (
          <div>
            {preventivi.length === 0 ? <Vuoto testo="Nessun preventivo condiviso." /> : (
              <div className="space-y-2">
                {preventivi.map((pv) => {
                  const p = pratiche.find((x) => x.id === pv.id && x.kind === 'preventivo')!;
                  const key = contactKey(pv.contatti?.email, pv.contatti?.phone);
                  const convertito = key !== 'x:sconosciuto' && (contatti.get(key)?.pratiche.some((x) => x.kind === 'intervento') ?? false);
                  return (
                    <button key={pv.id} onClick={() => apri(p)} className="w-full text-left bg-white rounded-2xl border border-[#ECE7DD] p-3.5 hover:border-[#F5B800]/60 transition flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-lg font-extrabold text-[#1A1A1A]">{fmtEur(pv.totale_ivato ?? pv.totale)}</span>
                          {convertito
                            ? <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#2E7D32]/12 text-[#2E7D32]">Convertito</span>
                            : <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#B36B00]/12 text-[#B36B00]">Senza appuntamento</span>}
                        </div>
                        <p className="text-sm font-semibold truncate">{pv.contatti?.name || 'Anonimo'}</p>
                        <p className="text-xs text-[#6B665C] truncate">{(pv.interventi ?? []).join(', ') || '—'}{pv.mq ? ` · ~${pv.mq} m²` : ''}</p>
                      </div>
                      <span className="text-xs text-[#938D80] shrink-0">{dtBreve(pv.created_at)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── DETTAGLIO ── */}
      {sel && (
        <Drawer onClose={() => setSel(null)}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-1.5 flex-wrap"><Badge k={sel.kind} /><StatoBadge s={sel.stato} /></div>
            <button onClick={() => setSel(null)} className="text-[#999] hover:text-[#1A1A1A]"><X className="w-5 h-5" /></button>
          </div>
          <h2 className="text-xl font-bold">{sel.nome || 'Senza nome'}</h2>
          <p className="text-sm text-[#938D80] mb-3">Ricevuto {dtBreve(sel.created_at)}</p>

          {/* Contatti rapidi */}
          <div className="flex gap-1.5 flex-wrap mb-4">
            {sel.telefono && <AzMini href={`tel:${sel.telefono}`} icona={<Phone className="w-3.5 h-3.5" />} testo={sel.telefono} />}
            {waLink(sel.telefono) && <AzMini href={waLink(sel.telefono)!} icona={<MessageCircle className="w-3.5 h-3.5" />} testo="WhatsApp" />}
            {sel.email && <AzMini href={`mailto:${sel.email}`} icona={<Mail className="w-3.5 h-3.5" />} testo="Email" />}
          </div>

          {/* Corpo per tipo */}
          {sel.kind === 'intervento' && sel.int && (
            <div className="space-y-3 text-sm">
              <div className="bg-[#F5F2EB] rounded-xl p-3">
                <p className="text-[11px] font-mono uppercase tracking-wide text-[#938D80] mb-1">Dove</p>
                <p className="font-semibold">{[sel.int.indirizzo, sel.int.cap, sel.int.citta].filter(Boolean).join(', ') || 'Indirizzo non indicato'}</p>
                {sel.int.fuori_zona && <p className="text-[#C0392B] text-xs font-semibold mt-1">⚠ Fuori zona di copertura</p>}
                {mapsLink(sel.int) && <a href={mapsLink(sel.int)!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[#3652c9] mt-1"><MapPin className="w-3.5 h-3.5" /> Apri nel navigatore</a>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Info label="Quando" valore={`${dataLeggibile(sel.int.data_intervento)} ${sel.int.ora_intervento ?? ''}`} />
                <Info label="Urgenza" valore={sel.int.urgenza} />
                <Info label="Categoria" valore={sel.int.categoria === 'idro' ? 'Idraulico' : 'Elettricista'} />
                <Info label="Totale stimato" valore={fmtEur(sel.int.totale_stimato)} />
              </div>
              {(sel.int.voci?.length || sel.int.voci_custom?.length) ? (
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-wide text-[#938D80] mb-1">Lavori richiesti</p>
                  <ul className="space-y-1">
                    {(sel.int.voci ?? []).map((v) => (
                      <li key={v.id} className="flex justify-between gap-2"><span>{v.voce}</span><span className="font-mono text-[#6B665C]">{fmtEur(v.prezzo)}</span></li>
                    ))}
                    {(sel.int.voci_custom ?? []).map((c, i) => (
                      <li key={`c${i}`} className="flex justify-between gap-2"><span>{c}</span><span className="text-xs text-[#B36B00] font-semibold">da definire</span></li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}

          {(sel.kind === 'sopralluogo' || sel.kind === 'certificazione') && sel.sop && (
            <div className="space-y-3 text-sm">
              {sel.sop.note && <div><p className="text-[11px] font-mono uppercase tracking-wide text-[#938D80] mb-1">Note</p><p className="whitespace-pre-wrap">{sel.sop.note}</p></div>}
              {sel.sop.allegati?.length > 0 && (
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-wide text-[#938D80] mb-2">Allegati ({sel.sop.allegati.length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {firme.length === 0 && <Loader2 className="w-4 h-4 animate-spin text-[#999]" />}
                    {firme.map((f, i) => (
                      f.url ? (isImg(f.nome)
                        ? <a key={i} href={f.url} target="_blank" rel="noreferrer" className="block aspect-square rounded-lg overflow-hidden border border-[#ECE7DD]"><img src={f.url} alt={f.nome} className="w-full h-full object-cover" /></a>
                        : <a key={i} href={f.url} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center aspect-square rounded-lg border border-[#ECE7DD] text-[#6B665C] text-xs p-2 text-center hover:bg-[#F5F2EB]"><FileText className="w-5 h-5 mb-1" /><span className="truncate w-full">{f.nome}</span></a>)
                        : <div key={i} className="aspect-square rounded-lg border border-[#ECE7DD] flex items-center justify-center text-[10px] text-[#999] p-2 text-center">{f.nome}<br />(non disp.)</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {sel.kind === 'preventivo' && sel.prev && (
            <div className="space-y-3 text-sm">
              <div className="bg-[#F5F2EB] rounded-xl p-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold">{fmtEur(sel.prev.totale_ivato ?? sel.prev.totale)}</span>
                <span className="text-xs text-[#6B665C]">IVA incl.</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Info label="Finitura" valore={sel.prev.finitura ?? '—'} />
                <Info label="Tempistica" valore={sel.prev.tempistica ?? '—'} />
                <Info label="Superficie" valore={sel.prev.mq ? `~${sel.prev.mq} m²` : '—'} />
                <Info label="Immobile" valore={sel.prev.tipo_casa === 'seconda' ? 'Seconda casa' : 'Prima casa'} />
              </div>
              <div><p className="text-[11px] font-mono uppercase tracking-wide text-[#938D80] mb-1">Interventi</p><p>{(sel.prev.interventi ?? []).join(', ') || '—'}</p></div>
              <a href={`/?preventivo=${sel.prev.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-[#3652c9]"><FileText className="w-4 h-4" /> Apri il preventivo condiviso</a>
            </div>
          )}

          {azioneErr && <p className="text-sm text-[#C0392B] mt-4">{azioneErr}</p>}
          {annullaEsito && (
            <p className={`text-sm mt-4 rounded-lg px-3 py-2 ${annullaEsito.ok ? 'text-[#2E7D32] bg-[#2E7D32]/8' : 'text-[#B26A00] bg-[#F5B800]/12'}`}>
              {annullaEsito.ok ? '✓ ' : '⚠️ '}{annullaEsito.testo}
            </p>
          )}

          {/* Stato (solo sopralluogo/intervento) */}
          {sel.kind !== 'preventivo' && (
            <div className="mt-5">
              <p className="text-[11px] font-mono uppercase tracking-wide text-[#938D80] mb-2">Stato pratica</p>
              {sel.stato === 'annullata' || sel.stato === 'annullato' ? (
                <div className="py-2.5 rounded-xl border-2 border-[#ECE7DD] text-center text-sm font-semibold text-[#999]">Appuntamento annullato</div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {STATO_ADMIN.map((s) => {
                    const attivo = sel.stato === s.v || (s.v === 'nuovo' && isNuovo(sel.stato)) || (s.v === 'chiuso' && sel.stato === 'gestito');
                    return (
                      <button key={s.v} disabled={salvandoStato} onClick={() => segna(sel, s.v)}
                        className={`text-xs font-semibold px-3 py-2 rounded-full border transition disabled:opacity-50 ${attivo ? 'bg-[#F5B800] border-[#F5B800] text-[#1A1A1A]' : 'bg-white border-[#ECE7DD] text-[#6B665C] hover:border-[#F5B800]/60'}`}>
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Azioni finali */}
          <div className="mt-4 flex flex-col gap-2">
            {contactKey(sel.email, sel.telefono) !== 'x:sconosciuto' && (
              <button onClick={() => apriScheda(sel)} className="w-full py-3 rounded-xl bg-[#1A1A1A] text-white font-semibold hover:bg-black flex items-center justify-center gap-2">
                <User className="w-4 h-4" /> Scheda cliente completa
              </button>
            )}
            {sel.kind === 'intervento' && sel.int && sel.stato !== 'annullata' && (
              <>
                <button onClick={() => apriSposta(sel.int!)} className="w-full py-3 rounded-xl border-2 border-[#ECE7DD] font-semibold hover:bg-[#F5F2EB] flex items-center justify-center gap-2">
                  <CalendarClock className="w-4 h-4" /> Sposta appuntamento
                </button>
                <button onClick={() => apriAnnulla(sel.int!)} className="w-full py-3 rounded-xl border-2 border-[#C0392B] text-[#C0392B] font-semibold hover:bg-[#C0392B]/5 flex items-center justify-center gap-2">
                  <X className="w-4 h-4" /> Annulla appuntamento
                </button>
              </>
            )}
          </div>
        </Drawer>
      )}

      {/* ── SCHEDA CLIENTE ── */}
      {schedaContatto && (
        <Drawer onClose={() => setSchedaKey(null)}>
          <div className="flex items-start justify-between mb-4">
            <button onClick={() => setSchedaKey(null)} className="inline-flex items-center gap-1 text-sm text-[#6B665C] hover:text-[#1A1A1A]"><ArrowLeft className="w-4 h-4" /> Indietro</button>
            <button onClick={() => setSchedaKey(null)} className="text-[#999] hover:text-[#1A1A1A]"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-[#F5B800]/15 grid place-items-center"><User className="w-6 h-6 text-[#F5B800]" /></div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold truncate">{schedaContatto.nome || 'Cliente senza nome'}</h2>
              <p className="text-sm text-[#6B665C] truncate">{[schedaContatto.telefono, schedaContatto.email].filter(Boolean).join(' · ') || '—'}</p>
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap mb-5">
            {schedaContatto.telefono && <AzMini href={`tel:${schedaContatto.telefono}`} icona={<Phone className="w-3.5 h-3.5" />} testo="Chiama" />}
            {waLink(schedaContatto.telefono) && <AzMini href={waLink(schedaContatto.telefono)!} icona={<MessageCircle className="w-3.5 h-3.5" />} testo="WhatsApp" />}
            {schedaContatto.email && <AzMini href={`mailto:${schedaContatto.email}`} icona={<Mail className="w-3.5 h-3.5" />} testo="Email" />}
          </div>

          {/* Note / promemoria */}
          <div className="mb-5">
            <p className="text-[11px] font-mono uppercase tracking-wide text-[#938D80] mb-2 flex items-center gap-1.5"><StickyNote className="w-3.5 h-3.5" /> Note e promemoria</p>
            <div className="flex gap-2 mb-2">
              <input value={notaTesto} onChange={(e) => setNotaTesto(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') aggiungiNota(); }}
                placeholder="Aggiungi una nota…"
                className="flex-1 h-10 px-3 rounded-xl border border-[#ECE7DD] bg-white focus:border-[#F5B800] outline-none text-sm" />
              <button onClick={aggiungiNota} disabled={notaBusy || !notaTesto.trim()} className="w-10 h-10 grid place-items-center rounded-xl bg-[#F5B800] text-[#1A1A1A] disabled:opacity-40"><Plus className="w-4 h-4" /></button>
            </div>
            {note.length === 0 ? <p className="text-xs text-[#938D80]">Nessuna nota.</p> : (
              <ul className="space-y-1.5">
                {note.map((n) => (
                  <li key={n.id} className="group flex items-start gap-2 bg-[#F5F2EB] rounded-lg px-3 py-2">
                    <span className="flex-1 text-sm">{n.testo}<span className="block text-[10px] text-[#938D80] mt-0.5">{dtBreve(n.created_at)}</span></span>
                    <button onClick={() => eliminaNota(n.id)} className="text-[#C9C3B6] hover:text-[#C0392B]"><Trash2 className="w-3.5 h-3.5" /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Timeline attività */}
          <p className="text-[11px] font-mono uppercase tracking-wide text-[#938D80] mb-2">Storico ({schedaContatto.pratiche.length + schedaContatto.pdf.length})</p>
          <div className="space-y-2">
            {schedaContatto.pratiche.map((p) => (
              <button key={`${p.kind}-${p.id}`} onClick={() => apri(p)} className="w-full text-left bg-white rounded-xl border border-[#ECE7DD] p-3 hover:border-[#F5B800]/60 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5"><Badge k={p.kind} /><StatoBadge s={p.stato} /></div>
                  <p className="text-sm text-[#6B665C]">
                    {p.kind === 'intervento' && p.int?.data_intervento ? `Appuntamento ${dataLeggibile(p.int.data_intervento)} ${p.int.ora_intervento ?? ''}`
                      : p.kind === 'preventivo' ? `Preventivo ${fmtEur(p.prev?.totale_ivato ?? p.prev?.totale)}`
                        : `Ricevuto ${dtBreve(p.created_at)}`}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#C9C3B6] shrink-0" />
              </button>
            ))}
            {schedaContatto.pdf.map((a, i) => (
              <div key={`pdf${i}`} className="bg-white rounded-xl border border-[#ECE7DD] p-3">
                <div className="flex items-center gap-1.5 mb-0.5"><span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-[#8A857B]/15 text-[#6B665C]">Download PDF</span>{a.conteggio > 1 && <span className="text-[10px] text-[#938D80]">×{a.conteggio}</span>}</div>
                <p className="text-sm text-[#6B665C]">Stima {fmtEur((a.dettaglio?.totale_ivato as number) ?? (a.dettaglio?.totale as number))} · ultimo {dtBreve(a.ultima_volta)}</p>
              </div>
            ))}
          </div>
        </Drawer>
      )}

      {/* ── ANNULLA APPUNTAMENTO ── */}
      {annullaTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" onClick={() => !annullando && setAnnullaTarget(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3 className="font-bold text-lg mb-1">Annulla appuntamento</h3>
            <p className="text-sm text-[#6B665C] mb-4">Il cliente riceverà un'email con il link per riprenotare. Puoi anche <strong>proporgli un nuovo orario</strong> (facoltativo): lo accetterà con un tap.</p>
            <div className="grid grid-cols-2 gap-2 mb-1">
              <label className="text-xs text-[#6B665C]">Data proposta
                <input type="date" min={oggiISO()} value={propData} onChange={(e) => setPropData(e.target.value)}
                  className="mt-1 w-full h-10 px-2 rounded-lg border border-[#ECE7DD] focus:border-[#F5B800] outline-none text-sm" />
              </label>
              <label className="text-xs text-[#6B665C]">Ora proposta
                <select value={propOra} onChange={(e) => setPropOra(e.target.value)}
                  className="mt-1 w-full h-10 px-2 rounded-lg border border-[#ECE7DD] focus:border-[#F5B800] outline-none text-sm bg-white">
                  <option value="">—</option>
                  {SLOT_ORARI.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
            </div>
            <p className="text-[11px] text-[#938D80] mb-4">Lascia vuoto per annullare senza proposta.</p>
            {(!!propData) !== (!!propOra) && <p className="text-sm text-[#C0392B] mb-3">Per proporre un orario indica <strong>sia data che ora</strong>, oppure lascia entrambi vuoti.</p>}
            {azioneErr && <p className="text-sm text-[#C0392B] mb-3">{azioneErr}</p>}
            <div className="flex gap-2">
              <button onClick={() => setAnnullaTarget(null)} disabled={annullando} className="flex-1 py-2.5 rounded-full border-2 border-[#ECE7DD] font-semibold text-sm hover:bg-[#F5F2EB] disabled:opacity-50">Indietro</button>
              <button onClick={confermaAnnulla} disabled={annullando || (!!propData) !== (!!propOra)} className="flex-1 py-2.5 rounded-full bg-[#C0392B] text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50">
                {annullando ? 'Annullo…' : (propData && propOra ? 'Annulla e proponi' : 'Annulla appuntamento')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── NUOVO APPUNTAMENTO ── */}
      {nuovoOpen && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={() => !nuovoBusy && setNuovoOpen(false)}>
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-auto p-5 sm:p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Nuovo appuntamento</h3>
              <button onClick={() => setNuovoOpen(false)} className="text-[#999] hover:text-[#1A1A1A]"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Campo label="Nome"><input value={nuovo.nome} onChange={(e) => setNuovo({ ...nuovo, nome: e.target.value })} className={INP} placeholder="Mario Rossi" /></Campo>
                <Campo label="Telefono"><input value={nuovo.telefono} onChange={(e) => setNuovo({ ...nuovo, telefono: e.target.value })} className={INP} placeholder="333…" /></Campo>
              </div>
              <Campo label="Email (opzionale)"><input value={nuovo.email} onChange={(e) => setNuovo({ ...nuovo, email: e.target.value })} className={INP} placeholder="mario@email.it" /></Campo>
              <Campo label="Indirizzo"><input value={nuovo.indirizzo} onChange={(e) => setNuovo({ ...nuovo, indirizzo: e.target.value })} className={INP} placeholder="Via e civico" /></Campo>
              <div className="grid grid-cols-3 gap-2">
                <Campo label="CAP"><input value={nuovo.cap} onChange={(e) => setNuovo({ ...nuovo, cap: e.target.value })} className={INP} /></Campo>
                <div className="col-span-2"><Campo label="Città"><input value={nuovo.citta} onChange={(e) => setNuovo({ ...nuovo, citta: e.target.value })} className={INP} /></Campo></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Campo label="Data"><input type="date" min={oggiISO()} value={nuovo.data} onChange={(e) => setNuovo({ ...nuovo, data: e.target.value })} className={INP} /></Campo>
                <Campo label="Ora"><select value={nuovo.ora} onChange={(e) => setNuovo({ ...nuovo, ora: e.target.value })} className={`${INP} bg-white`}><option value="">—</option>{SLOT_ORARI.map((o) => <option key={o} value={o}>{o}</option>)}</select></Campo>
                <Campo label="Tipo"><select value={nuovo.categoria} onChange={(e) => setNuovo({ ...nuovo, categoria: e.target.value })} className={`${INP} bg-white`}><option value="idro">Idraulico</option><option value="elettr">Elettricista</option></select></Campo>
              </div>
              <Campo label="Note (opzionale)"><textarea rows={2} value={nuovo.note} onChange={(e) => setNuovo({ ...nuovo, note: e.target.value })} className={`${INP} h-auto py-2 resize-none`} placeholder="Cosa fare…" /></Campo>
            </div>
            {nuovoErr && <p className="text-sm text-[#C0392B] mt-3">{nuovoErr}</p>}
            <button onClick={creaAppuntamento} disabled={nuovoBusy} className="mt-4 w-full py-3 rounded-xl bg-[#F5B800] text-[#1A1A1A] font-bold hover:bg-[#E0A800] disabled:opacity-50 flex items-center justify-center gap-2">
              {nuovoBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Crea e metti in calendario
            </button>
          </div>
        </div>
      )}

      {/* ── SPOSTA APPUNTAMENTO ── */}
      {spostaTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" onClick={() => !spostando && setSpostaTarget(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3 className="font-bold text-lg mb-1">Sposta appuntamento</h3>
            <p className="text-sm text-[#6B665C] mb-4">Scegli la nuova data e ora. Il calendario di lavoro si aggiorna in automatico.</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-[#6B665C]">Data<input type="date" min={oggiISO()} value={spostaData} onChange={(e) => setSpostaData(e.target.value)} className="mt-1 w-full h-10 px-2 rounded-lg border border-[#ECE7DD] focus:border-[#F5B800] outline-none text-sm" /></label>
              <label className="text-xs text-[#6B665C]">Ora<select value={spostaOra} onChange={(e) => setSpostaOra(e.target.value)} className="mt-1 w-full h-10 px-2 rounded-lg border border-[#ECE7DD] focus:border-[#F5B800] outline-none text-sm bg-white"><option value="">—</option>{SLOT_ORARI.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>
            </div>
            {spostaErr && <p className="text-sm text-[#C0392B] mt-3">{spostaErr}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setSpostaTarget(null)} disabled={spostando} className="flex-1 py-2.5 rounded-full border-2 border-[#ECE7DD] font-semibold text-sm hover:bg-[#F5F2EB] disabled:opacity-50">Indietro</button>
              <button onClick={confermaSposta} disabled={spostando} className="flex-1 py-2.5 rounded-full bg-[#F5B800] text-[#1A1A1A] font-semibold text-sm hover:bg-[#E0A800] disabled:opacity-50">{spostando ? 'Sposto…' : 'Sposta'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sotto-componenti presentazionali ─────────────────────────────────────────
function Sezione({ titolo, contatore, icona, children }: { titolo: string; contatore: number; icona: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[#F5B800]">{icona}</span>
        <h2 className="font-bold">{titolo}</h2>
        <span className="text-xs font-bold text-[#938D80]">{contatore}</span>
      </div>
      {children}
    </section>
  );
}
function Vuoto({ testo }: { testo: string }) {
  return <p className="text-sm text-[#938D80] bg-white border border-[#ECE7DD] rounded-2xl px-4 py-6 text-center">{testo}</p>;
}
function Chip({ attivo, onClick, children }: { attivo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition ${attivo ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white' : 'bg-white border-[#ECE7DD] text-[#6B665C] hover:border-[#C9C3B6]'}`}>{children}</button>
  );
}
function AzMini({ href, icona, testo }: { href: string; icona: React.ReactNode; testo: string }) {
  return (
    <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full bg-white border border-[#ECE7DD] text-[#1A1A1A] hover:border-[#F5B800]/60 max-w-full">
      {icona}<span className="truncate">{testo}</span>
    </a>
  );
}
function Info({ label, valore }: { label: string; valore: string }) {
  return <div><p className="text-[10px] font-mono uppercase tracking-wide text-[#938D80]">{label}</p><p className="font-medium">{valore}</p></div>;
}
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-[11px] text-[#6B665C]">{label}</span><div className="mt-1">{children}</div></label>;
}
function Drawer({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-auto p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
