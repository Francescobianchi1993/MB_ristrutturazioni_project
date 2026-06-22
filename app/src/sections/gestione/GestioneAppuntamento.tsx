/**
 * Pagina di gestione self-service dell'appuntamento (?gestisci=<id>).
 *
 * Il cliente può:
 *   - SPOSTARE (calendario con la data attuale evidenziata; non si può
 *     confermare lo stesso identico orario)
 *   - ANNULLARE (conferma con data/ora) e poi RIPRENOTARE lo stesso intervento
 *     senza rifare il wizard, oppure prenotarne un altro dal sito.
 *
 * Appuntamento già passato o già annullato → stati dedicati.
 * Tutto via Edge Function `gestisci-prenotazione` (service role lato server).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Loader2, RotateCcw, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const SLOT_ORARI = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
const GIORNI_SETT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

type Disponibilita = Record<string, Record<string, boolean>>;

interface Dettagli {
  tipo: string;
  data: string | null;
  ora: string | null;
  stato: string;
  passato: boolean;
}

function toISODate(d: Date): string {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

function formatDataLeggibile(data: string): string {
  if (!data) return '';
  const d = new Date(`${data}T00:00:00`);
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

async function caricaDisponibilita(from: string, to: string): Promise<Disponibilita> {
  if (!supabase) return {};
  try {
    const { data, error } = await supabase.functions.invoke('disponibilita', { body: { from, to } });
    if (error || !data?.giorni) return {};
    return data.giorni as Disponibilita;
  } catch {
    return {};
  }
}

// ── calendario inline (apre sul mese della data selezionata) ──────────────────
function CalendarioInline({
  valore,
  onSelect,
  onMeseVisibile,
  giorniPieni,
}: {
  valore: string;
  onSelect: (iso: string) => void;
  onMeseVisibile: (from: string, to: string) => void;
  giorniPieni: Set<string>;
}) {
  const oggi = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [mese, setMese] = useState(() => {
    if (valore) {
      const [y, mm] = valore.split('-').map(Number);
      return new Date(y, mm - 1, 1);
    }
    return new Date(oggi.getFullYear(), oggi.getMonth(), 1);
  });

  const anno = mese.getFullYear();
  const m = mese.getMonth();
  const offset = (new Date(anno, m, 1).getDay() + 6) % 7;
  const giorniNelMese = new Date(anno, m + 1, 0).getDate();

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
        <span className="font-bold text-base">
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
          const pieno = !passato && giorniPieni.has(iso);
          const disabilitato = passato || pieno;
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

// ── selettore data + ora (componente STABILE, top-level) ──────────────────────
function SelettoreSlot({
  data,
  ora,
  onData,
  onOra,
  onMeseVisibile,
  giorniPieni,
  slotGiorno,
  caricandoSlot,
  noteStessoOrario,
  errMsg,
  inviando,
  bloccato,
  etichetta,
  onConferma,
  onIndietro,
}: {
  data: string;
  ora: string;
  onData: (v: string) => void;
  onOra: (v: string) => void;
  onMeseVisibile: (from: string, to: string) => void;
  giorniPieni: Set<string>;
  slotGiorno: Record<string, boolean> | undefined;
  caricandoSlot: boolean;
  noteStessoOrario: boolean;
  errMsg: string;
  inviando: boolean;
  bloccato: boolean;
  etichetta: string;
  onConferma: () => void;
  onIndietro: () => void;
}) {
  return (
    <div>
      <CalendarioInline valore={data} onSelect={onData} onMeseVisibile={onMeseVisibile} giorniPieni={giorniPieni} />
      {data && <p className="text-sm text-[#666] mt-2 capitalize text-center">{formatDataLeggibile(data)}</p>}

      <div className="mt-5">
        <span className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#666] mb-2">
          Fascia oraria
          {caricandoSlot && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#999]" />}
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
      </div>

      {noteStessoOrario && (
        <p className="text-sm text-[#999] mt-3 text-center">È lo stesso orario attuale: scegli un giorno o una fascia diversi.</p>
      )}
      {errMsg && <p className="text-sm text-[#C0392B] mt-3 text-center">{errMsg}</p>}

      <div className="flex gap-2 mt-6">
        <button onClick={onIndietro} className="flex-1 py-3 rounded-xl border-2 border-[#E5E5E5] font-semibold hover:bg-[#F7F7F7]">
          Indietro
        </button>
        <button
          onClick={onConferma}
          disabled={!data || !ora || inviando || bloccato}
          className="flex-1 flex items-center justify-center gap-2 bg-[#F5B800] text-[#1A1A1A] font-bold py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
        >
          {inviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {etichetta}
        </button>
      </div>
    </div>
  );
}

type Fase =
  | 'caricamento'
  | 'menu'
  | 'sposta'
  | 'annulla'
  | 'riprenota'
  | 'fatto-sposta'
  | 'fatto-annulla'
  | 'fatto-riprenota'
  | 'passato'
  | 'errore'
  | 'non-trovata';

export default function GestioneAppuntamento({ id, azioneIniziale }: { id: string; azioneIniziale?: string }) {
  const [fase, setFase] = useState<Fase>('caricamento');
  const [dettagli, setDettagli] = useState<Dettagli | null>(null);
  const [errMsg, setErrMsg] = useState('');

  const [data, setData] = useState('');
  const [ora, setOra] = useState('');
  const [disp, setDisp] = useState<Disponibilita>({});
  const [caricandoSlot, setCaricandoSlot] = useState(false);
  const [inviando, setInviando] = useState(false);
  const [nuovo, setNuovo] = useState<{ data: string; ora: string } | null>(null);

  useEffect(() => {
    let attivo = true;
    (async () => {
      if (!supabase) {
        setFase('errore');
        setErrMsg('Configurazione non disponibile. Riprova più tardi.');
        return;
      }
      try {
        const { data: res, error } = await supabase.functions.invoke('gestisci-prenotazione', {
          body: { azione: 'dettagli', id },
        });
        if (!attivo) return;
        if (error || !res?.ok) {
          setFase('non-trovata');
          return;
        }
        const det: Dettagli = { tipo: res.tipo, data: res.data, ora: res.ora, stato: res.stato, passato: !!res.passato };
        setDettagli(det);
        if (det.stato === 'annullata') {
          setFase('fatto-annulla');
        } else if (det.passato) {
          setFase('passato');
        } else if (azioneIniziale === 'annulla') {
          setFase('annulla');
        } else if (azioneIniziale === 'sposta') {
          if (det.data) setData(det.data);
          if (det.ora) setOra(det.ora);
          setFase('sposta');
        } else {
          setFase('menu');
        }
      } catch {
        if (attivo) setFase('non-trovata');
      }
    })();
    return () => {
      attivo = false;
    };
  }, [id, azioneIniziale]);

  const caricaMese = useCallback(async (from: string, to: string) => {
    setCaricandoSlot(true);
    const giorni = await caricaDisponibilita(from, to);
    setDisp((prev) => ({ ...prev, ...giorni }));
    setCaricandoSlot(false);
  }, []);

  // In fase "sposta" la disponibilità del server marca come occupato anche
  // l'appuntamento corrente del cliente: lo forziamo libero così la sua fascia
  // resta selezionabile (ed evidenziata), com'è l'intento della UX.
  const dispEffettiva = useMemo(() => {
    if (fase !== 'sposta' || !dettagli?.data || !dettagli?.ora) return disp;
    const giorno = disp[dettagli.data];
    if (!giorno || giorno[dettagli.ora] === true) return disp;
    return { ...disp, [dettagli.data]: { ...giorno, [dettagli.ora]: true } };
  }, [disp, fase, dettagli]);

  const giorniPieni = useMemo(() => {
    const set = new Set<string>();
    for (const [giorno, slots] of Object.entries(dispEffettiva)) {
      if (Object.values(slots).every((libero) => !libero)) set.add(giorno);
    }
    return set;
  }, [dispEffettiva]);

  const slotGiorno = data ? dispEffettiva[data] : undefined;

  // Cambiando giorno azzeriamo l'ora scelta (una fascia valida per un giorno può
  // non esserlo per un altro). Il precaricamento di "sposta" imposta invece data
  // e ora insieme, senza passare di qui, così la fascia attuale resta selezionata.
  function selezionaData(v: string) {
    setData(v);
    setOra('');
  }

  const stessoOrarioAttuale = fase === 'sposta' && !!dettagli && data === dettagli.data && ora === dettagli.ora;

  function avviaSposta() {
    if (dettagli?.data) setData(dettagli.data);
    if (dettagli?.ora) setOra(dettagli.ora);
    setErrMsg('');
    setFase('sposta');
  }

  function avviaRiprenota() {
    setData('');
    setOra('');
    setErrMsg('');
    setFase('riprenota');
  }

  async function confermaSposta() {
    if (!supabase || !data || !ora || inviando || stessoOrarioAttuale) return;
    setInviando(true);
    setErrMsg('');
    try {
      const { data: res, error } = await supabase.functions.invoke('gestisci-prenotazione', {
        body: { azione: 'sposta', id, data, ora },
      });
      if (error || !res?.ok) {
        if (res?.error === 'slot_occupato') setErrMsg('Quella fascia è appena stata occupata. Scegline un\'altra.');
        else if (res?.error === 'stesso_orario') setErrMsg('Hai scelto lo stesso orario attuale: scegline uno diverso.');
        else if (res?.error === 'gia_annullata') setErrMsg('Questo appuntamento risulta annullato: ricarica la pagina per riprenotarlo.');
        else if (res?.error === 'passato') setErrMsg('Questo appuntamento è già passato e non è più modificabile.');
        else setErrMsg('Non è stato possibile spostare l\'appuntamento. Riprova.');
        setInviando(false);
        return;
      }
      setDettagli((d) => (d ? { ...d, data, ora, stato: 'spostata' } : d));
      setFase('fatto-sposta');
    } catch {
      setErrMsg('Errore di rete. Riprova.');
    }
    setInviando(false);
  }

  async function confermaRiprenota() {
    if (!supabase || !data || !ora || inviando) return;
    setInviando(true);
    setErrMsg('');
    try {
      const { data: res, error } = await supabase.functions.invoke('gestisci-prenotazione', {
        body: { azione: 'riprenota', id, data, ora },
      });
      // Non confermiamo se manca l'id: significa che il salvataggio su DB non è
      // andato a buon fine (niente più "conferma fantasma").
      if (error || !res?.ok || !res?.id) {
        if (res?.error === 'slot_occupato') setErrMsg('Quella fascia è appena stata occupata. Scegline un\'altra.');
        else if (res?.error === 'conflitto_settimana') setErrMsg('Hai già un appuntamento attivo in quella settimana. Annulla prima quello, oppure scegli un\'altra settimana.');
        else setErrMsg('Non è stato possibile prenotare. Riprova.');
        setInviando(false);
        return;
      }
      setNuovo({ data, ora });
      setFase('fatto-riprenota');
    } catch {
      setErrMsg('Errore di rete. Riprova.');
    }
    setInviando(false);
  }

  async function confermaAnnulla() {
    if (!supabase || inviando) return;
    setInviando(true);
    setErrMsg('');
    try {
      const { data: res, error } = await supabase.functions.invoke('gestisci-prenotazione', {
        body: { azione: 'annulla', id },
      });
      if (error || !res?.ok) {
        setErrMsg('Non è stato possibile annullare. Riprova o contattaci.');
        setInviando(false);
        return;
      }
      setFase('fatto-annulla');
    } catch {
      setErrMsg('Errore di rete. Riprova.');
    }
    setInviando(false);
  }

  const tornaAlMenu = () => { setErrMsg(''); setFase('menu'); };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 justify-center mb-6">
          <span className="text-xl font-bold text-[#1A1A1A]">MB Ristrutturazioni</span>
        </div>

        <div className="bg-white rounded-3xl border border-[#EEE] shadow-sm p-6 sm:p-8">
          {fase === 'caricamento' && (
            <div className="flex flex-col items-center py-12 text-[#666]">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              Carico il tuo appuntamento…
            </div>
          )}

          {fase === 'non-trovata' && (
            <div className="text-center py-8">
              <h1 className="text-xl font-bold mb-2">Appuntamento non trovato</h1>
              <p className="text-[#666]">Il link potrebbe essere scaduto o non valido. Per qualsiasi cosa scrivici o chiamaci.</p>
            </div>
          )}

          {fase === 'errore' && (
            <div className="text-center py-8">
              <h1 className="text-xl font-bold mb-2">Qualcosa è andato storto</h1>
              <p className="text-[#666]">{errMsg}</p>
            </div>
          )}

          {fase === 'passato' && dettagli && (
            <div className="text-center py-8">
              <h1 className="text-xl font-bold mb-2">Appuntamento già passato</h1>
              {dettagli.data && dettagli.ora && (
                <p className="text-[#444] capitalize mb-2">{formatDataLeggibile(dettagli.data)} alle {dettagli.ora}</p>
              )}
              <p className="text-[#666]">Non è più modificabile online. Per un nuovo intervento contattaci o prenota dal sito.</p>
              <a href="/" className="inline-block mt-4 bg-[#F5B800] text-[#1A1A1A] font-bold py-2.5 px-5 rounded-xl">Prenota un intervento</a>
            </div>
          )}

          {dettagli && (fase === 'menu' || fase === 'sposta' || fase === 'annulla' || fase === 'riprenota') && (
            <>
              <div className="flex items-center gap-2 text-[#666] text-sm mb-1">
                <CalendarDays className="w-4 h-4 text-[#F5B800]" />
                {fase === 'riprenota' ? 'Riprenota lo stesso intervento' : 'Il tuo appuntamento'}
              </div>
              <h1 className="text-2xl font-bold mb-1">Intervento {dettagli.tipo}</h1>
              {dettagli.data && dettagli.ora && fase !== 'riprenota' && (
                <p className="text-[#444] capitalize mb-6">
                  {formatDataLeggibile(dettagli.data)} alle <strong>{dettagli.ora}</strong>
                </p>
              )}
              {fase === 'riprenota' && <p className="text-sm text-[#666] mb-6">Scegli quando vuoi il nuovo appuntamento.</p>}

              {fase === 'menu' && (
                <div className="space-y-3">
                  <button
                    onClick={avviaSposta}
                    className="w-full flex items-center justify-center gap-2 bg-[#1A1A1A] text-white font-bold py-3 rounded-xl hover:opacity-90 transition"
                  >
                    <CalendarDays className="w-4 h-4" /> Sposta appuntamento
                  </button>
                  <button
                    onClick={() => { setErrMsg(''); setFase('annulla'); }}
                    className="w-full flex items-center justify-center gap-2 bg-white text-[#C0392B] border-2 border-[#C0392B] font-bold py-3 rounded-xl hover:bg-[#C0392B]/5 transition"
                  >
                    <X className="w-4 h-4" /> Annulla appuntamento
                  </button>
                </div>
              )}

              {fase === 'sposta' && (
                <>
                  <p className="text-sm text-[#666] mb-4">Scegli il nuovo giorno e orario (la data attuale è evidenziata):</p>
                  <SelettoreSlot
                    data={data}
                    ora={ora}
                    onData={selezionaData}
                    onOra={setOra}
                    onMeseVisibile={caricaMese}
                    giorniPieni={giorniPieni}
                    slotGiorno={slotGiorno}
                    caricandoSlot={caricandoSlot}
                    noteStessoOrario={stessoOrarioAttuale}
                    errMsg={errMsg}
                    inviando={inviando}
                    bloccato={stessoOrarioAttuale}
                    etichetta="Conferma spostamento"
                    onConferma={confermaSposta}
                    onIndietro={tornaAlMenu}
                  />
                </>
              )}

              {fase === 'riprenota' && (
                <SelettoreSlot
                  data={data}
                  ora={ora}
                  onData={selezionaData}
                  onOra={setOra}
                  onMeseVisibile={caricaMese}
                  giorniPieni={giorniPieni}
                  slotGiorno={slotGiorno}
                  caricandoSlot={caricandoSlot}
                  noteStessoOrario={false}
                  errMsg={errMsg}
                  inviando={inviando}
                  bloccato={false}
                  etichetta="Conferma prenotazione"
                  onConferma={confermaRiprenota}
                  onIndietro={tornaAlMenu}
                />
              )}

              {fase === 'annulla' && (
                <div>
                  <p className="text-[#444] mb-2">Vuoi davvero annullare questo appuntamento?</p>
                  <p className="text-sm text-[#999] mb-6">Dopo l'annullamento potrai riprenotare lo stesso intervento in un altro orario.</p>
                  {errMsg && <p className="text-sm text-[#C0392B] mb-4">{errMsg}</p>}
                  <div className="flex gap-2">
                    <button onClick={tornaAlMenu} className="flex-1 py-3 rounded-xl border-2 border-[#E5E5E5] font-semibold hover:bg-[#F7F7F7]">
                      No, torna indietro
                    </button>
                    <button
                      onClick={confermaAnnulla}
                      disabled={inviando}
                      className="flex-1 flex items-center justify-center gap-2 bg-[#C0392B] text-white font-bold py-3 rounded-xl disabled:opacity-40 hover:opacity-90"
                    >
                      {inviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                      Sì, annulla
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {fase === 'fatto-sposta' && dettagli && (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-[#F5B800]/20 flex items-center justify-center mx-auto mb-4">
                <Check className="w-7 h-7 text-[#1A1A1A]" />
              </div>
              <h1 className="text-xl font-bold mb-2">Appuntamento spostato ✅</h1>
              {dettagli.data && dettagli.ora && (
                <p className="text-[#444] capitalize">
                  Nuovo orario: <strong>{formatDataLeggibile(dettagli.data)} alle {dettagli.ora}</strong>
                </p>
              )}
              <p className="text-sm text-[#999] mt-3">Ti abbiamo inviato la conferma via email. Grazie!</p>
            </div>
          )}

          {fase === 'fatto-riprenota' && nuovo && (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-[#F5B800]/20 flex items-center justify-center mx-auto mb-4">
                <Check className="w-7 h-7 text-[#1A1A1A]" />
              </div>
              <h1 className="text-xl font-bold mb-2">Prenotazione confermata ✅</h1>
              <p className="text-[#444] capitalize">
                <strong>{formatDataLeggibile(nuovo.data)} alle {nuovo.ora}</strong>
              </p>
              <p className="text-sm text-[#999] mt-3">Ti abbiamo inviato la conferma via email. Grazie!</p>
            </div>
          )}

          {fase === 'fatto-annulla' && (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-[#C0392B]/10 flex items-center justify-center mx-auto mb-4">
                <X className="w-7 h-7 text-[#C0392B]" />
              </div>
              <h1 className="text-xl font-bold mb-2">Appuntamento annullato</h1>
              <p className="text-[#666]">Vuoi prenotarne uno nuovo?</p>
              <div className="space-y-3 mt-6">
                <button
                  onClick={avviaRiprenota}
                  className="w-full flex items-center justify-center gap-2 bg-[#1A1A1A] text-white font-bold py-3 rounded-xl hover:opacity-90 transition"
                >
                  <RotateCcw className="w-4 h-4" /> Riprenota lo stesso intervento
                </button>
                <a
                  href="/"
                  className="w-full flex items-center justify-center gap-2 bg-white text-[#1A1A1A] border-2 border-[#E5E5E5] font-bold py-3 rounded-xl hover:bg-[#F7F7F7] transition"
                >
                  <CalendarDays className="w-4 h-4" /> Prenota un altro intervento
                </a>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-[#AAA] mt-6">MB Ristrutturazioni · Roma</p>
      </div>
    </div>
  );
}
