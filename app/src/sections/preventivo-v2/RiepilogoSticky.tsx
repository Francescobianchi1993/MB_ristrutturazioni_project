/**
 * Card riepilogo sticky con totale, range, subtotali per slot e i 3 pulsanti
 * di output (PDF / Email / Condividi). Usata da L1 (sotto il wizard) e da L2
 * (colonna destra fissa).
 */

import { Download, Mail, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useProgetto } from './state';
import { calcolaPrezzo, fmt } from './pricing';
import { MACRO_SLOT_BY_ID } from './data';
import type { MacroSlotId } from '@/lib/preventivoModel';

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

  const slotAttivi = (Object.keys(result.perSlot) as MacroSlotId[]).filter(
    (id) => (result.perSlot[id] ?? 0) > 0
  );

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
          range {fmt(result.range.min)} – {fmt(result.range.max)} · ±15%
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
        <button className="w-full bg-[#F5B800] hover:bg-[#D9A200] text-[#1A1A1A] font-semibold py-3 rounded-full text-sm">
          Richiedi sopralluogo gratuito
        </button>

        <p className="text-[11px] text-[#666] pt-1 leading-snug">
          Stima orientativa. Il preventivo definitivo viene confermato dopo sopralluogo gratuito con MB.
        </p>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            onClick={() => toast.info('PDF', { description: 'Generazione PDF in arrivo (jsPDF)' })}
            className="flex flex-col items-center gap-1 py-3 rounded-xl border border-[#E5E5E5] hover:bg-[#F8F8F8] text-xs"
          >
            <Download className="w-4 h-4" />
            Scarica
          </button>
          <button
            onClick={() => toast.info('Email', { description: 'Invio via Resend in arrivo' })}
            className="flex flex-col items-center gap-1 py-3 rounded-xl border border-[#E5E5E5] hover:bg-[#F8F8F8] text-xs"
          >
            <Mail className="w-4 h-4" />
            Email
          </button>
          <button
            onClick={async () => {
              const url = window.location.href;
              if (navigator.share) {
                try {
                  await navigator.share({ title: 'Preventivo MB', url });
                } catch {
                  // user dismissed
                }
              } else {
                await navigator.clipboard.writeText(url);
                toast.success('Link copiato');
              }
            }}
            className="flex flex-col items-center gap-1 py-3 rounded-xl border border-[#E5E5E5] hover:bg-[#F8F8F8] text-xs"
          >
            <Share2 className="w-4 h-4" />
            Condividi
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
