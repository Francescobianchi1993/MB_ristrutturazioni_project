/**
 * Mini-gestionale richieste (?admin=1) — protetto da password.
 *
 * Mostra in un unico elenco le richieste di SOPRALLUOGO (lead) e gli APPUNTAMENTI
 * (interventi prenotati), perché non tutti i clienti prenotano: alcuni lasciano
 * solo la richiesta. Dettaglio con galleria allegati e "segna come gestita".
 *
 * Tutto via edge function `admin-richieste` (service role + password ADMIN_PASSWORD).
 * La password resta in localStorage del dispositivo dopo il primo accesso.
 */
import { useCallback, useEffect, useState } from 'react';
import { Loader2, Lock, RefreshCw, X, CheckCircle2, FileText, ExternalLink, Eye, EyeOff, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const PW_KEY = 'mb_admin_pw';
const SLOT_ORARI = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
const oggiISO = () => new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

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
}
type Riga =
  | ({ tipo: 'sopralluogo' } & Sopralluogo)
  | ({ tipo: 'intervento' } & Intervento);

function dt(iso: string): string {
  try { return new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}
function isImg(nome: string): boolean {
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(nome);
}

export default function GestioneRichieste({ leadId }: { leadId?: string }) {
  const [pw, setPw] = useState<string>(() => localStorage.getItem(PW_KEY) ?? '');
  const [pwInput, setPwInput] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [recMsg, setRecMsg] = useState('');
  const [authed, setAuthed] = useState(false);
  const [caricando, setCaricando] = useState(false);
  const [errore, setErrore] = useState('');
  const [righe, setRighe] = useState<Riga[]>([]);
  const [sel, setSel] = useState<Riga | null>(null);
  const [firme, setFirme] = useState<{ nome: string; url: string | null }[]>([]);
  const [azioneErr, setAzioneErr] = useState('');
  // Esito dell'invio email al cliente dopo un annullamento: { ok } distingue
  // "annullato + email partita" da "annullato ma email non inviata".
  const [annullaEsito, setAnnullaEsito] = useState<{ ok: boolean; testo: string } | null>(null);
  const [annullaTarget, setAnnullaTarget] = useState<Riga | null>(null);
  const [propData, setPropData] = useState('');
  const [propOra, setPropOra] = useState('');
  const [annullando, setAnnullando] = useState(false);

  const chiama = useCallback(async (azione: string, extra: Record<string, unknown> = {}, password = pw) => {
    if (!supabase) throw new Error('config');
    const { data, error } = await supabase.functions.invoke('admin-richieste', {
      body: { password, azione, ...extra },
    });
    if (error) {
      const status = (error as { context?: Response }).context?.status;
      if (status === 401) throw new Error('password_errata');
      if (status === 503) throw new Error('non_configurato');
      // Il codice specifico sta nel body JSON della risposta di errore.
      if (status === 502) {
        try {
          const body = await (error as { context?: Response }).context?.clone().json();
          if (body?.error) throw new Error(String(body.error));
        } catch { /* body non leggibile: cade nel throw generico sotto */ }
      }
      throw error;
    }
    return data;
  }, [pw]);

  const caricaLista = useCallback(async (password: string) => {
    setCaricando(true); setErrore('');
    try {
      const data = await chiama('lista', {}, password);
      const sop: Riga[] = (data.sopralluoghi ?? []).map((s: Sopralluogo) => ({ tipo: 'sopralluogo' as const, ...s }));
      const int: Riga[] = (data.interventi ?? []).map((i: Intervento) => ({ tipo: 'intervento' as const, ...i }));
      const tutte = [...sop, ...int].sort((a, b) => b.created_at.localeCompare(a.created_at));
      setRighe(tutte);
      setAuthed(true);
      localStorage.setItem(PW_KEY, password);
      if (leadId) {
        const r = tutte.find((x) => x.id === leadId);
        // Passiamo la password appena usata: al primo login lo stato `pw` non è
        // ancora aggiornato, quindi apri() userebbe una password stale (vuota).
        if (r) apri(r, password);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'password_errata') { setErrore('Password errata.'); setAuthed(false); localStorage.removeItem(PW_KEY); }
      else if (msg === 'non_configurato') setErrore('Gestionale non ancora configurato (manca la password lato server).');
      else setErrore('Errore di caricamento. Riprova.');
    }
    setCaricando(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiama, leadId]);

  useEffect(() => {
    if (pw) caricaLista(pw);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function apri(r: Riga, password = pw) {
    setSel(r);
    setFirme([]);
    setAnnullaEsito(null);
    if (r.tipo === 'sopralluogo' && r.allegati?.length) {
      try {
        const data = await chiama('firma', { paths: r.allegati.map((a) => a.path) }, password);
        const map = new Map<string, string | null>((data.urls ?? []).map((u: { path: string; url: string | null }) => [u.path, u.url]));
        setFirme(r.allegati.map((a) => ({ nome: a.nome, url: map.get(a.path) ?? null })));
      } catch { /* allegati non firmabili */ }
    }
  }

  async function segna(r: Riga, nuovoStato: string) {
    setAzioneErr('');
    try {
      await chiama('segna', { tipo: r.tipo, id: r.id, stato: nuovoStato });
      setRighe((prev) => prev.map((x) => (x.id === r.id && x.tipo === r.tipo ? { ...x, stato: nuovoStato } : x)));
      setSel((s) => (s ? { ...s, stato: nuovoStato } as Riga : s));
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'password_errata') {
        // Sessione scaduta: torna al login con avviso.
        esci();
        setErrore('Sessione scaduta, accedi di nuovo.');
      } else {
        setAzioneErr('Operazione non riuscita. Controlla la connessione e riprova.');
      }
    }
  }

  function apriAnnulla(r: Riga) {
    if (r.tipo !== 'intervento') return;
    setPropData(''); setPropOra(''); setAzioneErr('');
    setAnnullaTarget(r);
  }

  async function confermaAnnulla() {
    const r = annullaTarget;
    if (!r || annullando) return;
    setAnnullando(true); setAzioneErr('');
    const proposta = propData && propOra ? { propostaData: propData, propostaOra: propOra } : {};
    try {
      const res = await chiama('annulla', { tipo: 'intervento', id: r.id, ...proposta });
      setRighe((prev) => prev.map((x) => (x.id === r.id && x.tipo === r.tipo ? { ...x, stato: 'annullata' } : x)));
      setSel((s) => (s ? { ...s, stato: 'annullata' } as Riga : s));
      setAnnullaTarget(null);
      const esitoEmail = (res as { email?: string } | null)?.email;
      if (esitoEmail === 'inviata') {
        setAnnullaEsito({ ok: true, testo: 'Appuntamento annullato ed email inviata al cliente.' });
      } else if (esitoEmail) {
        const motivo = esitoEmail === 'senza_email'
          ? 'il cliente non ha lasciato un indirizzo email'
          : esitoEmail === 'non_configurata'
            ? 'le credenziali email del server non sono configurate'
            : "l'invio è fallito";
        setAnnullaEsito({ ok: false, testo: `Appuntamento annullato, ma l'email al cliente NON è partita (${motivo}). Avvisa tu il cliente.` });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'password_errata') { setAnnullaTarget(null); esci(); setErrore('Sessione scaduta, accedi di nuovo.'); }
      else if (msg === 'calendario_non_aggiornato') {
        // L'evento non è stato rimosso dal calendario: NON è stato annullato
        // nulla e il cliente NON è stato avvisato. Meglio ritentare che lasciare
        // il tecnico con l'appuntamento in agenda.
        setAzioneErr('Non è stato possibile aggiornare il calendario Google: l’appuntamento NON è stato annullato. Riprova tra poco.');
      }
      else setAzioneErr('Annullamento non riuscito. Riprova.');
    }
    setAnnullando(false);
  }

  function login(e: React.FormEvent) {
    e.preventDefault();
    if (!pwInput.trim()) return;
    setPw(pwInput.trim());
    caricaLista(pwInput.trim());
  }

  function esci() {
    localStorage.removeItem(PW_KEY);
    setPw(''); setPwInput(''); setAuthed(false);
    setRighe([]); setSel(null); setRecMsg(''); setErrore('');
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
    } catch {
      setRecMsg('Invio non riuscito. Riprova.');
    }
  }

  // ── LOGIN ───────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
        <form onSubmit={login} className="bg-white rounded-3xl border border-[#EEE] shadow-sm p-8 w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-[#F5B800]/15 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-[#F5B800]" />
          </div>
          <h1 className="text-xl font-bold mb-1">Gestionale richieste</h1>
          <p className="text-sm text-[#666] mb-5">MB Ristrutturazioni · accesso riservato</p>
          <div className="relative mb-3">
            <input
              type={showPw ? 'text' : 'password'} value={pwInput} onChange={(e) => setPwInput(e.target.value)}
              placeholder="Password" autoFocus
              className="w-full h-12 rounded-xl border-2 border-[#E5E5E5] pl-4 pr-12 focus:border-[#F5B800] outline-none"
            />
            <button type="button" onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? 'Nascondi password' : 'Mostra password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#1A1A1A]">
              {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errore && <p className="text-sm text-[#C0392B] mb-3">{errore}</p>}
          <button type="submit" disabled={caricando}
            className="w-full bg-[#1A1A1A] text-white font-bold h-12 rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            {caricando ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Entra
          </button>
          <button type="button" onClick={recupera}
            className="mt-4 text-sm text-[#666] hover:text-[#1A1A1A] underline">
            Password dimenticata? Inviala alla mail aziendale
          </button>
          {recMsg && <p className="text-sm text-[#2E7D32] mt-2">{recMsg}</p>}
        </form>
      </div>
    );
  }

  // ── LISTA ───────────────────────────────────────────────────────────────
  const badge = (r: Riga) => {
    if (r.tipo === 'sopralluogo') {
      // Le richieste di certificazione arrivano nella stessa tabella lead_sopralluogo:
      // le distinguiamo dalla nota, così in lista non si confondono con i sopralluoghi.
      if (r.note?.startsWith('[Richiesta CERTIFICAZIONE')) {
        return <span className="text-[10px] font-bold uppercase tracking-wide bg-[#2E7D32]/15 text-[#2E7D32] px-2 py-0.5 rounded">Certificazione</span>;
      }
      return <span className="text-[10px] font-bold uppercase tracking-wide bg-[#F5B800]/20 text-[#8a6d00] px-2 py-0.5 rounded">Sopralluogo</span>;
    }
    return <span className="text-[10px] font-bold uppercase tracking-wide bg-[#1A1A1A]/10 text-[#1A1A1A] px-2 py-0.5 rounded">{r.categoria === 'idro' ? 'Idraulico' : 'Elettricista'}</span>;
  };
  // Colori di stato: rosso = nuovo (da lavorare), ambra = spostata dal cliente
  // (DA ATTENZIONARE: l'appuntamento è cambiato, non è "a posto"), grigio =
  // annullata (nessuna azione), verde = tutto il resto (gestito/confermato).
  const statoCol = (s: string) =>
    s === 'nuovo' || s === 'nuova'
      ? 'text-[#C0392B]'
      : s === 'spostata'
        ? 'text-[#B36B00]'
        : s === 'annullata'
          ? 'text-[#999]'
          : 'text-[#2E7D32]';

  return (
    <div className="min-h-screen bg-[#FAFAFA] px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Richieste</h1>
            <p className="text-sm text-[#666]">{righe.length} totali · MB Ristrutturazioni</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => caricaLista(pw)} className="flex items-center gap-2 text-sm font-semibold bg-white border border-[#E5E5E5] rounded-xl px-3 py-2 hover:bg-[#F7F7F7]">
              <RefreshCw className={`w-4 h-4 ${caricando ? 'animate-spin' : ''}`} /> Aggiorna
            </button>
            <button onClick={esci} title="Esci" className="flex items-center gap-2 text-sm font-semibold bg-white border border-[#E5E5E5] rounded-xl px-3 py-2 hover:bg-[#F7F7F7] text-[#666]">
              <LogOut className="w-4 h-4" /> Esci
            </button>
          </div>
        </div>

        {righe.length === 0 && !caricando && (
          <div className="text-center text-[#999] py-16">Nessuna richiesta per ora.</div>
        )}

        <div className="space-y-2">
          {righe.map((r) => (
            <button key={`${r.tipo}-${r.id}`} onClick={() => apri(r)}
              className="w-full text-left bg-white rounded-2xl border border-[#EEE] p-4 hover:shadow-sm transition flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {badge(r)}
                  <span className={`text-[11px] font-bold ${statoCol(r.stato)}`}>{r.stato}</span>
                </div>
                <p className="font-semibold truncate">{r.nome || 'Senza nome'}</p>
                <p className="text-sm text-[#666] truncate">
                  {r.telefono || r.email || '—'}
                  {r.tipo === 'sopralluogo' && r.allegati?.length ? ` · ${r.allegati.length} allegati` : ''}
                  {r.tipo === 'intervento' && r.data_intervento ? ` · ${r.data_intervento} ${r.ora_intervento ?? ''}` : ''}
                </p>
              </div>
              <span className="text-xs text-[#999] shrink-0">{dt(r.created_at)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* DETTAGLIO */}
      {sel && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setSel(null)}>
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">{badge(sel)}<span className={`text-xs font-bold ${statoCol(sel.stato)}`}>{sel.stato}</span></div>
              <button onClick={() => setSel(null)} className="text-[#999] hover:text-[#1A1A1A]"><X className="w-5 h-5" /></button>
            </div>
            <h2 className="text-xl font-bold mb-1">{sel.nome || 'Senza nome'}</h2>
            <p className="text-sm text-[#999] mb-4">{dt(sel.created_at)}</p>

            <div className="space-y-1.5 text-sm">
              {sel.telefono && <p><span className="text-[#888]">Telefono:</span> <a className="text-[#1A1A1A] font-medium" href={`tel:${sel.telefono}`}>{sel.telefono}</a></p>}
              {sel.email && <p><span className="text-[#888]">Email:</span> <a className="text-[#1A1A1A] font-medium" href={`mailto:${sel.email}`}>{sel.email}</a></p>}
              {sel.tipo === 'sopralluogo' && sel.note && (
                <p className="pt-1"><span className="text-[#888]">Note:</span><br /><span className="whitespace-pre-wrap">{sel.note}</span></p>
              )}
              {sel.tipo === 'intervento' && (
                <>
                  <p><span className="text-[#888]">Quando:</span> {sel.data_intervento} {sel.ora_intervento}</p>
                  <p><span className="text-[#888]">Urgenza:</span> {sel.urgenza}</p>
                  <p><span className="text-[#888]">Totale stimato:</span> € {Number(sel.totale_stimato ?? 0).toFixed(2)}</p>
                </>
              )}
            </div>

            {sel.tipo === 'sopralluogo' && sel.allegati?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-mono uppercase tracking-wide text-[#888] mb-2">Allegati ({sel.allegati.length})</p>
                <div className="grid grid-cols-3 gap-2">
                  {firme.length === 0 && <Loader2 className="w-4 h-4 animate-spin text-[#999]" />}
                  {firme.map((f, i) => (
                    f.url ? (
                      isImg(f.nome)
                        ? <a key={i} href={f.url} target="_blank" rel="noreferrer" className="block aspect-square rounded-lg overflow-hidden border border-[#EEE]">
                            <img src={f.url} alt={f.nome} className="w-full h-full object-cover" />
                          </a>
                        : <a key={i} href={f.url} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center aspect-square rounded-lg border border-[#EEE] text-[#666] text-xs p-2 text-center hover:bg-[#F7F7F7]">
                            <FileText className="w-5 h-5 mb-1" /><span className="truncate w-full">{f.nome}</span>
                          </a>
                    ) : (
                      <div key={i} className="aspect-square rounded-lg border border-[#EEE] flex items-center justify-center text-[10px] text-[#999] p-2 text-center">{f.nome}<br />(non disp.)</div>
                    )
                  ))}
                </div>
              </div>
            )}

            {azioneErr && <p className="text-sm text-[#C0392B] mt-4">{azioneErr}</p>}

            {annullaEsito && (
              <p className={`text-sm mt-4 rounded-lg px-3 py-2 ${annullaEsito.ok ? 'text-[#2E7D32] bg-[#2E7D32]/8' : 'text-[#B26A00] bg-[#F5B800]/12'}`}>
                {annullaEsito.ok ? '✓ ' : '⚠️ '}{annullaEsito.testo}
              </p>
            )}

            <div className="mt-3 flex gap-2">
              {(sel.stato === 'nuovo' || sel.stato === 'nuova') ? (
                <button onClick={() => segna(sel, 'gestito')} className="flex-1 flex items-center justify-center gap-2 bg-[#1A1A1A] text-white font-bold py-3 rounded-xl hover:opacity-90">
                  <CheckCircle2 className="w-4 h-4" /> Segna come gestita
                </button>
              ) : sel.stato === 'annullata' ? (
                // Un appuntamento annullato non va "rimesso tra le nuove": l'evento
                // Calendar è stato cancellato, riattivarlo creerebbe incoerenza. Il
                // cliente riprenota dal link nell'email di annullamento.
                <div className="flex-1 py-3 rounded-xl border-2 border-[#E5E5E5] text-center text-sm font-semibold text-[#999]">
                  Appuntamento annullato
                </div>
              ) : (
                <button onClick={() => segna(sel, sel.tipo === 'sopralluogo' ? 'nuovo' : 'nuova')} className="flex-1 py-3 rounded-xl border-2 border-[#E5E5E5] font-semibold hover:bg-[#F7F7F7]">
                  Rimetti tra le nuove
                </button>
              )}
              <a href={`mailto:${sel.email ?? ''}`} className="px-4 py-3 rounded-xl border-2 border-[#E5E5E5] font-semibold hover:bg-[#F7F7F7] flex items-center gap-1"><ExternalLink className="w-4 h-4" /> Rispondi</a>
            </div>

            {sel.tipo === 'intervento' && sel.stato !== 'annullata' && (
              <button
                onClick={() => apriAnnulla(sel)}
                className="mt-2 w-full py-3 rounded-xl border-2 border-[#C0392B] text-[#C0392B] font-semibold hover:bg-[#C0392B]/5 flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" /> Annulla appuntamento
              </button>
            )}
          </div>
        </div>
      )}

      {annullaTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={() => !annullando && setAnnullaTarget(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3 className="font-bold text-lg mb-1">Annulla appuntamento</h3>
            <p className="text-sm text-[#666] mb-4">
              Il cliente riceverà un'email con il link per riprenotare. Puoi anche
              <strong> proporgli un nuovo orario</strong> (facoltativo): lo accetterà con un tap.
            </p>
            <div className="grid grid-cols-2 gap-2 mb-1">
              <label className="text-xs text-[#666]">
                Data proposta
                <input type="date" min={oggiISO()} value={propData} onChange={(e) => setPropData(e.target.value)}
                  className="mt-1 w-full h-10 px-2 rounded-lg border border-[#E5E5E5] focus:border-[#F5B800] outline-none text-sm" />
              </label>
              <label className="text-xs text-[#666]">
                Ora proposta
                <select value={propOra} onChange={(e) => setPropOra(e.target.value)}
                  className="mt-1 w-full h-10 px-2 rounded-lg border border-[#E5E5E5] focus:border-[#F5B800] outline-none text-sm bg-white">
                  <option value="">—</option>
                  {SLOT_ORARI.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
            </div>
            <p className="text-[11px] text-[#999] mb-4">Lascia vuoto per annullare senza proposta.</p>
            {(!!propData) !== (!!propOra) && (
              <p className="text-sm text-[#C0392B] mb-3">Per proporre un orario indica <strong>sia data che ora</strong>, oppure lascia entrambi vuoti.</p>
            )}
            {azioneErr && <p className="text-sm text-[#C0392B] mb-3">{azioneErr}</p>}
            <div className="flex gap-2">
              <button onClick={() => setAnnullaTarget(null)} disabled={annullando}
                className="flex-1 py-2.5 rounded-full border-2 border-[#E5E5E5] font-semibold text-sm hover:bg-[#F7F7F7] disabled:opacity-50">
                Indietro
              </button>
              <button onClick={confermaAnnulla} disabled={annullando || (!!propData) !== (!!propOra)}
                className="flex-1 py-2.5 rounded-full bg-[#C0392B] text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50">
                {annullando ? 'Annullo…' : (propData && propOra ? 'Annulla e proponi' : 'Annulla appuntamento')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
