/**
 * Card riepilogo sticky con totale, range, subtotali per slot e i 3 pulsanti
 * di output (PDF / Email / Condividi). Usata da L1 (sotto il wizard) e da L2
 * (colonna destra fissa).
 */

import { useState } from 'react';
import { Share2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useProgetto } from './state';
import { calcolaPrezzo, fmt } from './pricing';
import { MACRO_SLOT_BY_ID } from './data';
import { mqTotaliEffettivi } from '@/lib/preventivoModel';
import type { MacroSlotId } from '@/lib/preventivoModel';
import { supabase } from '@/lib/supabase';
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
  const { state } = useProgetto();
  const result = calcolaPrezzo(state);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [condividendo, setCondividendo] = useState(false);

  const slotAttivi = (Object.keys(result.perSlot) as MacroSlotId[]).filter(
    (id) => (result.perSlot[id] ?? 0) > 0
  );

  // La stima è "completa" (condivisibile) quando ha un valore.
  const stimaCompleta = result.totale > 0;

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
          finitura: state.finitura,
          tempistica: state.tempistica,
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
      <div className="font-display text-4xl font-bold text-[#F5B800] mt-1 transition-all">
        {fmt(result.totale)}
      </div>
      {!result.haDettaglio && result.totale > 0 && (
        <div className="text-xs text-[#666] mt-1">
          Prezzo finale stimato{' '}
          <strong className="text-[#1A1A1A]">{fmt(result.range.min)} – {fmt(result.range.max)}</strong>
        </div>
      )}
      {result.totale === 0 && (
        <div className="text-xs text-[#666] mt-1">
          Seleziona almeno un intervento per vedere la stima
        </div>
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

        <button
          onClick={condividiStima}
          disabled={!stimaCompleta || condividendo}
          title={!stimaCompleta ? 'Completa la stima per poterla condividere' : undefined}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#E5E5E5] hover:bg-[#F8F8F8] text-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {condividendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
          {condividendo ? 'Creazione link…' : 'Condividi la stima'}
        </button>

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
