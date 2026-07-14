/**
 * Card riepilogo sticky con totale, range, subtotali per slot e i pulsanti di
 * output (scarica il PDF / condividi il link). Usata da L1 (sotto il wizard) e
 * da L2 (colonna destra fissa).
 */

import { useState } from 'react';
import { Share2, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useProgetto } from './state';
import { calcolaPrezzo, fmt } from './pricing';
import { MACRO_SLOT_BY_ID } from './data';
import { mqTotaliEffettivi } from '@/lib/preventivoModel';
import type { MacroSlotId } from '@/lib/preventivoModel';
import { supabase } from '@/lib/supabase';
import { scaricaStimaPdf } from '@/lib/pdf/scaricaStima';
import RichiediSopralluogoDialog from './RichiediSopralluogoDialog';

interface RiepilogoStickyProps {
  variant?: 'inline' | 'sticky';
  mostraDettaglio?: boolean;
  onSwitchModalita?: () => void;
  switchLabel?: string;
}

export default function RiepilogoSticky({
  variant = 'sticky',
  mostraDettaglio = true,
  onSwitchModalita,
  switchLabel,
}: RiepilogoStickyProps) {
  const { state, dispatch } = useProgetto();
  const result = calcolaPrezzo(state);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [condividendo, setCondividendo] = useState(false);
  const [scaricando, setScaricando] = useState(false);

  const slotAttivi = (Object.keys(result.perSlot) as MacroSlotId[]).filter(
    (id) => (result.perSlot[id] ?? 0) > 0
  );

  // La stima è "completa" (condivisibile) quando ha un valore.
  const stimaCompleta = result.totale > 0;

  async function scaricaPdf() {
    if (!stimaCompleta || scaricando) return;
    setScaricando(true);
    try {
      await scaricaStimaPdf(state, result);
    } catch (e) {
      console.error('[scaricaPdf] errore:', e);
      toast.error('Non è stato possibile generare il PDF. Riprova tra poco.');
    } finally {
      setScaricando(false);
    }
  }

  async function condividiStima() {
    if (!stimaCompleta || condividendo) return;
    if (!supabase) {
      toast.error('Servizio momentaneamente non disponibile. Riprova più tardi.');
      return;
    }
    setCondividendo(true);
    try {
      const interventiAttivi = (Object.keys(state.macroSlot) as MacroSlotId[])
        .filter((id) => state.macroSlot[id]?.attivo)
        .map((id) => MACRO_SLOT_BY_ID[id]?.label ?? id);

      const { data, error } = await supabase.functions.invoke('crea-preventivo', {
        body: {
          stato: state,
          totale: result.totale,
          totale_min: result.range.min,
          totale_max: result.range.max,
          totale_ivato: result.totaleIvato,
          finitura: state.finitura,
          tempistica: state.tempistica,
          tipo_casa: state.tipoCasa,
          mq: mqTotaliEffettivi(state),
          interventi: interventiAttivi,
          contatti: state.contatti,
        },
      });
      if (error || !data?.id) throw error ?? new Error('id mancante');

      const url = `${window.location.origin}/?preventivo=${data.id}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: 'La mia stima MB Ristrutturazioni', url });
        } catch {
          // l'utente ha annullato la condivisione nativa: non è un errore
        }
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link della stima copiato');
      }
    } catch (e) {
      console.error('[condividiStima] errore:', e);
      toast.error('Non è stato possibile creare il link. Riprova tra poco.');
    } finally {
      setCondividendo(false);
    }
  }

  const wrapperClass =
    variant === 'sticky'
      ? 'lg:sticky lg:top-24 self-start bg-white border-2 border-[#E5E5E5] rounded-3xl p-6 shadow-sm'
      : 'bg-gradient-to-br from-[#FFF8E7] to-white border border-[#F5B800]/30 rounded-2xl p-6';

  return (
    <div className={wrapperClass}>
      <div className="text-[10px] font-mono uppercase tracking-wider text-[#666]">
        {result.haDettaglio ? 'Totale dettagliato' : 'Stima totale'}
      </div>

      {result.totale === 0 ? (
        <>
          <div className="font-display text-4xl font-bold text-[#F5B800] mt-1">{fmt(0)}</div>
          <div className="text-xs text-[#666] mt-1">
            Seleziona almeno un intervento per vedere la stima
          </div>
        </>
      ) : (
        <>
          {/* Tipo immobile → aliquota IVA della ristrutturazione */}
          <div className="mt-3 mb-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#666] mb-1.5">
              Tipo immobile (IVA)
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {([
                ['prima', 'Prima casa', '10%'],
                ['seconda', 'Seconda casa', '22%'],
              ] as const).map(([id, label, pct]) => {
                const sel = state.tipoCasa === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => dispatch({ type: 'SET_TIPO_CASA', tipoCasa: id })}
                    className={`text-left px-2.5 py-1.5 rounded-lg border-2 text-xs transition ${
                      sel
                        ? 'border-[#F5B800] bg-[#F5B800]/10 font-semibold'
                        : 'border-[#E5E5E5] hover:border-[#F5B800]/40'
                    }`}
                  >
                    {label}
                    <span className="block text-[10px] font-normal text-[#666]">IVA {pct}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Imponibile + IVA + totale finale (IVA inclusa) */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-[#666]">Imponibile (IVA escl.)</span>
              <span className="font-mono">{fmt(result.imponibile)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#666]">IVA {result.ivaPct}%</span>
              <span className="font-mono">{fmt(result.iva)}</span>
            </div>
          </div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#666] mt-3">
            Totale (IVA incl.)
          </div>
          <div className="font-display text-4xl font-bold text-[#F5B800] mt-0.5 transition-all">
            {fmt(result.totaleIvato)}
          </div>
          {!result.haDettaglio && (
            <div className="text-xs text-[#666] mt-1">
              Imponibile orientativo{' '}
              <strong className="text-[#1A1A1A]">
                {fmt(result.range.min)} – {fmt(result.range.max)}
              </strong>{' '}
              (oltre IVA)
            </div>
          )}
        </>
      )}

      {mostraDettaglio && slotAttivi.length > 0 && (
        <div className="mt-5 space-y-1.5 text-sm">
          {slotAttivi.map((id) => {
            const meta = MACRO_SLOT_BY_ID[id];
            return (
              <div key={id} className="flex justify-between gap-2">
                <span className="text-[#666] truncate">
                  {meta.emoji} {meta.label}
                </span>
                <span className="font-mono">{fmt(result.perSlot[id]!)}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="border-t border-[#E5E5E5] mt-5 pt-5 space-y-2">
        <button
          onClick={() => setDialogOpen(true)}
          className="w-full bg-[#F5B800] hover:bg-[#D9A200] text-[#1A1A1A] font-semibold py-3 rounded-full text-sm"
        >
          Richiedi sopralluogo gratuito
        </button>

        <RichiediSopralluogoDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />

        <p className="text-[11px] text-[#666] pt-1 leading-snug">
          Stima orientativa: il prezzo definitivo, confermato dopo il sopralluogo gratuito, può
          variare di circa ±15% in base a materiali, stato dei luoghi e dettagli del progetto.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={scaricaPdf}
            disabled={!stimaCompleta || scaricando}
            title={!stimaCompleta ? 'Completa la stima per poterla scaricare' : undefined}
            className="flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white font-semibold text-xs disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#1A1A1A]"
          >
            {scaricando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {scaricando ? 'Preparo…' : 'Scarica PDF'}
          </button>

          <button
            onClick={condividiStima}
            disabled={!stimaCompleta || condividendo}
            title={!stimaCompleta ? 'Completa la stima per poterla condividere' : undefined}
            className="flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl border border-[#E5E5E5] hover:bg-[#F8F8F8] text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {condividendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            {condividendo ? 'Link…' : 'Condividi'}
          </button>
        </div>

        {onSwitchModalita && (
          <button
            onClick={onSwitchModalita}
            className="w-full bg-[#1A1A1A] hover:bg-black text-white font-semibold py-2.5 rounded-full text-xs leading-tight px-3"
          >
            {switchLabel ?? 'Aggiungi o rimuovi voci specifiche →'}
          </button>
        )}
      </div>
    </div>
  );
}
