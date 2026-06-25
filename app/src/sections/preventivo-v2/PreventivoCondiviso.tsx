/**
 * Pagina pubblica di sola lettura di una stima condivisa (?preventivo=<id>).
 *
 * Carica il record dalla edge function `leggi-preventivo` (service role lato
 * server) e mostra il riepilogo: interventi, superficie, finitura, totale e
 * range. Nessun dato sensibile è esposto: l'id uuid funge da token del link.
 */
import { useEffect, useState } from 'react';
import { Loader2, Home } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fmt } from './pricing';
import { FINITURE, TEMPISTICHE } from './data';
import { IVA_PCT } from '@/lib/preventivoModel';

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
}

type Fase = 'caricamento' | 'ok' | 'non-trovato' | 'errore';

export default function PreventivoCondiviso({ id }: { id: string }) {
  const [fase, setFase] = useState<Fase>('caricamento');
  const [rec, setRec] = useState<PreventivoRecord | null>(null);

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

              <a
                href="/#preventivo"
                className="mt-5 w-full inline-flex items-center justify-center bg-[#1A1A1A] hover:bg-black text-white font-semibold py-3 rounded-full text-sm"
              >
                Crea la tua stima
              </a>
            </>
          )}
        </div>

        <p className="text-center text-xs text-[#AAA] mt-6">MB Ristrutturazioni · Roma</p>
      </div>
    </div>
  );
}
