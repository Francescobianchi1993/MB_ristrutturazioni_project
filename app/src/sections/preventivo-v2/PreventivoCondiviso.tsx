/**
 * Pagina pubblica di sola lettura di una stima condivisa (?preventivo=<id>).
 *
 * Carica il record dalla edge function `leggi-preventivo` (service role lato
 * server) e mostra il riepilogo: interventi, superficie, finitura, totale e
 * range. Nessun dato sensibile è esposto: l'id uuid funge da token del link.
 */
import { useEffect, useState } from 'react';
import { Loader2, Home, Download } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { supabase } from '@/lib/supabase';
import { calcolaPrezzo, fmt } from './pricing';
import { FINITURE, TEMPISTICHE } from './data';
import {
  IVA_PCT,
  normalizzaFinitura,
  normalizzaTipoCasa,
  statoIniziale,
  type ProgettoState,
} from '@/lib/preventivoModel';
import { scaricaStimaPdf } from '@/lib/pdf/scaricaStima';
import DatiClienteGate, { type DatiCliente } from './DatiClienteGate';

interface PreventivoRecord {
  id: string;
  created_at: string;
  totale: number;
  totale_min: number | null;
  totale_max: number | null;
  totale_ivato: number | null;
  finitura: string | null;
  tempistica: string | null;
  tipo_casa: string | null;
  mq: number | null;
  interventi: string[] | null;
  /** Snapshot del configuratore, senza i contatti (rimossi lato edge function).
   *  Serve per rigenerare il PDF con la ripartizione per intervento. */
  stato?: Partial<ProgettoState> | null;
}

/**
 * Ricostruisce uno stato valido dallo snapshot salvato: i campi mancanti (o i
 * contatti, che il server non restituisce) prendono i default, così il PDF si
 * genera anche da record creati da versioni precedenti del configuratore.
 */
function statoDaSnapshot(snapshot: Partial<ProgettoState>): ProgettoState {
  const base = statoIniziale();
  return {
    ...base,
    ...snapshot,
    finitura: normalizzaFinitura(snapshot.finitura),
    tipoCasa: normalizzaTipoCasa(snapshot.tipoCasa),
    // Il link è pubblico: nessun contatto viene mostrato né stampato sul PDF.
    contatti: { name: '', email: '', phone: '' },
  };
}

type Fase = 'caricamento' | 'ok' | 'non-trovato' | 'errore';

export default function PreventivoCondiviso({ id }: { id: string }) {
  const [fase, setFase] = useState<Fase>('caricamento');
  const [rec, setRec] = useState<PreventivoRecord | null>(null);
  const [scaricando, setScaricando] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  // Dati inseriti per scaricare: memorizzati così un secondo download non li
  // richiede di nuovo.
  const [datiCliente, setDatiCliente] = useState<DatiCliente | null>(null);

  // Click su "Scarica": se abbiamo già i dati scarichiamo, altrimenti apriamo il
  // cancello dati (il link è pubblico → il PDF era anonimo: ora chi lo scarica si
  // presenta, il PDF esce intestato e l'azienda riceve il contatto).
  function richiediScarica() {
    if (!rec?.stato || scaricando) return;
    if (!(imponibile > 0)) {
      toast.error('Questa stima non è più disponibile per il download.');
      return;
    }
    if (datiCliente) {
      logAttivitaPdf(datiCliente); // già coi dati: download tracciato (silenzioso)
      void generaPdf(datiCliente);
    } else {
      setGateOpen(true);
    }
  }

  // Contenuto della stima condivisa per il CRM.
  function dettaglioCondiviso() {
    return {
      totale: imponibile,
      totale_ivato: totaleIvato,
      interventi: rec?.interventi ?? [],
      mq: rec?.mq ?? null,
      finitura: finituraLabel,
      tempistica: tempLabel,
      tipo_casa: rec?.tipo_casa ?? null,
      fonte: 'link_condiviso',
    };
  }

  // Registrazione silenziosa del download nel CRM (nessuna email). Fire-and-forget.
  function logAttivitaPdf(dati: DatiCliente) {
    if (!supabase || !dati.email.trim()) return;
    void supabase.functions
      .invoke('invia-sopralluogo', {
        body: { tipo: 'pdf', nome: dati.nome, email: dati.email, telefono: dati.telefono, dettaglio: dettaglioCondiviso(), allegati: [] },
      })
      .catch(() => { /* best-effort */ });
  }

  // Gate confermato: registriamo contatto+attività nel CRM (PDF silenzioso →
  // nessuna email), ricordiamo i dati e generiamo il PDF intestato. L'invoke è
  // awaitato (errore → il gate lo mostra).
  async function onConfermatoGate(dati: DatiCliente) {
    if (!supabase) throw new Error('servizio non disponibile');
    const { error } = await supabase.functions.invoke('invia-sopralluogo', {
      body: { tipo: 'pdf', nome: dati.nome, email: dati.email, telefono: dati.telefono, dettaglio: dettaglioCondiviso(), allegati: [] },
    });
    if (error) throw error;
    setDatiCliente(dati);
    setGateOpen(false);
    void generaPdf(dati);
  }

  async function generaPdf(dati: DatiCliente) {
    if (!rec?.stato || scaricando) return;
    // Il PDF deve stampare il prezzo CONGELATO nel record, non ricalcolarlo con
    // le tariffe di oggi: un link già inviato mostrerebbe altrimenti a schermo
    // una cifra e nel PDF un'altra dopo un aggiornamento del listino (e nel caso
    // limite un totale a 0€). Se il totale salvato non è valido, non generiamo.
    if (!(imponibile > 0)) {
      toast.error('Questa stima non è più disponibile per il download.');
      return;
    }
    setScaricando(true);
    try {
      // Intestiamo il PDF a chi lo scarica (lo snapshot non ha contatti).
      const state = { ...statoDaSnapshot(rec.stato), contatti: { name: dati.nome, email: dati.email, phone: dati.telefono } };
      // Ripartizione ricalcolata (per il donut), ma riscalata sul totale
      // congelato così le percentuali e il totale restano coerenti.
      const live = calcolaPrezzo(state);
      const fattore = live.imponibile > 0 ? imponibile / live.imponibile : 1;
      const perSlot = Object.fromEntries(
        (Object.entries(live.perSlot) as [string, number][]).map(([k, v]) => [k, Math.round(v * fattore)]),
      ) as typeof live.perSlot;
      const congelato = {
        ...live,
        perSlot,
        totale: imponibile,
        imponibile,
        ivaPct,
        iva,
        totaleIvato,
        range: {
          min: rec.totale_min ?? Math.round(imponibile * 0.85),
          max: rec.totale_max ?? Math.round(imponibile * 1.15),
        },
      };
      await scaricaStimaPdf(state, congelato, { id: rec.id });
    } catch (e) {
      console.error('[PreventivoCondiviso] PDF fallito:', e);
      toast.error('Non è stato possibile generare il PDF. Riprova tra poco.');
    } finally {
      setScaricando(false);
    }
  }

  useEffect(() => {
    let attivo = true;
    (async () => {
      if (!supabase) {
        if (attivo) setFase('errore');
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke('leggi-preventivo', {
          body: { id },
        });
        if (!attivo) return;
        if (error || !data?.preventivo) {
          setFase('non-trovato');
          return;
        }
        setRec(data.preventivo as PreventivoRecord);
        setFase('ok');
      } catch {
        if (attivo) setFase('non-trovato');
      }
    })();
    return () => {
      attivo = false;
    };
  }, [id]);

  const finituraLabel = rec
    ? FINITURE.find((f) => f.id === rec.finitura)?.label ?? rec.finitura
    : null;
  const tempLabel = rec
    ? TEMPISTICHE.find((t) => t.id === rec.tempistica)?.label ?? rec.tempistica
    : null;

  // IVA della ristrutturazione: 10% prima casa, 22% seconda. Fallback 10%.
  const ivaPct = rec?.tipo_casa === 'seconda' ? IVA_PCT.seconda : IVA_PCT.prima;
  const imponibile = rec?.totale ?? 0;
  const totaleIvato = rec?.totale_ivato ?? Math.round(imponibile * (1 + ivaPct / 100));
  const iva = totaleIvato - imponibile;

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center px-4 py-10">
      {/* Senza questo i toast di errore (es. PDF non generabile) non compaiono:
          questa pagina è renderizzata da sola, fuori dall'app principale. */}
      <Toaster richColors position="top-center" />
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 justify-center mb-6">
          <span className="text-xl font-bold text-[#1A1A1A]">MB Ristrutturazioni</span>
        </div>

        <div className="bg-white rounded-3xl border border-[#EEE] shadow-sm p-6 sm:p-8">
          {fase === 'caricamento' && (
            <div className="flex flex-col items-center py-12 text-[#666]">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              Carico la stima…
            </div>
          )}

          {(fase === 'non-trovato' || fase === 'errore') && (
            <div className="text-center py-8">
              <h1 className="text-xl font-bold mb-2">Stima non trovata</h1>
              <p className="text-[#666]">
                Il link potrebbe essere scaduto o non valido. Crea una nuova stima dal sito.
              </p>
              <a
                href="/#preventivo"
                className="inline-block mt-4 bg-[#F5B800] text-[#1A1A1A] font-bold py-2.5 px-5 rounded-xl"
              >
                Vai al configuratore
              </a>
            </div>
          )}

          {fase === 'ok' && rec && (
            <>
              <div className="flex items-center gap-2 text-[#666] text-sm mb-1">
                <Home className="w-4 h-4 text-[#F5B800]" />
                Stima condivisa
              </div>
              <div className="space-y-1 text-sm mb-1">
                <div className="flex justify-between gap-2">
                  <span className="text-[#666]">Imponibile (IVA escl.)</span>
                  <span className="font-mono">{fmt(imponibile)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#666]">IVA {ivaPct}%</span>
                  <span className="font-mono">{fmt(iva)}</span>
                </div>
              </div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#666] mt-3">
                Totale (IVA incl.)
              </div>
              <div className="font-display text-4xl font-bold text-[#F5B800] mt-0.5">
                {fmt(totaleIvato)}
              </div>
              {rec.totale_min != null && rec.totale_max != null && (
                <div className="text-xs text-[#666] mt-1">
                  Imponibile orientativo{' '}
                  <strong className="text-[#1A1A1A]">
                    {fmt(rec.totale_min)} – {fmt(rec.totale_max)}
                  </strong>{' '}
                  (oltre IVA)
                </div>
              )}

              <div className="border-t border-[#E5E5E5] mt-5 pt-5 space-y-3 text-sm">
                {rec.interventi && rec.interventi.length > 0 && (
                  <div>
                    <div className="text-[10px] font-mono uppercase text-[#666] mb-1">Interventi</div>
                    <div className="font-medium">{rec.interventi.join(' · ')}</div>
                  </div>
                )}
                {rec.mq != null && (
                  <div>
                    <div className="text-[10px] font-mono uppercase text-[#666] mb-1">Superficie</div>
                    <div className="font-medium">~{rec.mq} m²</div>
                  </div>
                )}
                <div>
                  <div className="text-[10px] font-mono uppercase text-[#666] mb-1">
                    Finitura · Tempistica
                  </div>
                  <div className="font-medium">
                    {finituraLabel ?? '—'} · {tempLabel ?? '—'}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-[#666] mt-5 leading-snug">
                Stima orientativa: il prezzo definitivo, confermato dopo il sopralluogo gratuito, può
                variare di circa ±15% in base a materiali, stato dei luoghi e dettagli del progetto.
              </p>

              {rec.stato && (
                <button
                  onClick={richiediScarica}
                  disabled={scaricando}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white font-semibold py-2.5 rounded-full text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {scaricando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {scaricando ? 'Preparo il PDF…' : 'Scarica la stima in PDF'}
                </button>
              )}

              <a
                href="/#preventivo"
                className="mt-2 w-full inline-flex items-center justify-center bg-[#1A1A1A] hover:bg-black text-white font-semibold py-3 rounded-full text-sm"
              >
                Crea la tua stima
              </a>
            </>
          )}
        </div>

        <p className="text-center text-xs text-[#AAA] mt-6">MB Ristrutturazioni · Roma</p>
      </div>

      <DatiClienteGate
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        onConfermato={onConfermatoGate}
        titolo="Scarica la stima in PDF"
        sottotitolo="Lascia i tuoi dati: il PDF esce intestato a te e ti ricontattiamo solo se vuoi procedere."
        ctaLabel="Scarica il PDF"
        ctaLoadingLabel="Preparo il PDF…"
        riepilogo={
          <div className="bg-[#FFF8E7] border border-[#F5B800]/30 rounded-xl p-4 mb-5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#666] mb-1">
              La stima
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold text-[#F5B800]">{fmt(totaleIvato)}</span>
              <span className="text-xs text-[#666]">IVA {ivaPct}% incl.</span>
            </div>
          </div>
        }
      />
    </div>
  );
}
