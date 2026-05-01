/**
 * Hub di ingresso — l'utente sceglie tra Intervento puntuale (L3),
 * Stima rapida (L1) o Preventivo dettagliato (L2).
 */

import { Zap, ClipboardCheck, Wrench, Star } from 'lucide-react';

interface HubProps {
  onScegli: (modalita: 'rapida' | 'esperto' | 'intervento') => void;
}

export default function Hub({ onScegli }: HubProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="font-display text-4xl sm:text-5xl leading-tight font-bold">
          Ristrutturazione completa o <span className="text-[#F5B800]">intervento</span>?
        </h1>
        <p className="text-[#666] text-lg mt-4">
          Scegli la modalità adatta al tuo bisogno. Puoi cambiare in qualsiasi momento.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        <button
          onClick={() => onScegli('intervento')}
          className="group text-left bg-white border-2 border-[#E5E5E5] hover:border-[#F5B800] rounded-2xl sm:rounded-3xl p-5 sm:p-8 transition shadow-sm hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="w-14 h-14 rounded-2xl bg-[#F5B800]/10 group-hover:bg-[#F5B800] flex items-center justify-center transition">
              <Wrench className="w-7 h-7 text-[#F5B800] group-hover:text-[#1A1A1A]" />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#666]">
              ~ 1 minuto
            </span>
          </div>
          <div className="font-display text-xl sm:text-2xl font-bold mb-2">Intervento</div>
          <p className="text-sm text-[#666] mb-5">
            Un singolo lavoro, riparazione o manutenzione. Cerca, aggiungi al carrello e scarica il preventivo.
          </p>
          <ul className="text-sm space-y-2">
            <li className="flex items-center gap-2"><span className="text-[#F5B800]">✓</span> Catalogo a tariffe fisse</li>
            <li className="flex items-center gap-2"><span className="text-[#F5B800]">✓</span> Pacchetti tutto incluso</li>
            <li className="flex items-center gap-2"><span className="text-[#F5B800]">✓</span> Download immediato del preventivo</li>
          </ul>
          <div className="mt-6 inline-flex items-center gap-2 text-[#F5B800] font-semibold text-sm">
            Trova il tuo intervento
            <span className="group-hover:translate-x-1 transition">→</span>
          </div>
        </button>

        <button
          onClick={() => onScegli('rapida')}
          className="group text-left bg-[#F5B800]/[0.03] border-2 border-[#E5E5E5] hover:border-[#F5B800] rounded-2xl sm:rounded-3xl p-5 sm:p-8 transition shadow-sm hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="w-14 h-14 rounded-2xl bg-[#F5B800]/50 group-hover:bg-[#F5B800] flex items-center justify-center transition">
              <Zap className="w-7 h-7 text-[#1A1A1A]" />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#666]">
              ~ 2 minuti
            </span>
          </div>
          <div className="font-display text-xl sm:text-2xl font-bold mb-2">Stima rapida</div>
          <p className="text-sm text-[#666] mb-5">
            Pochi parametri, range di prezzo realistico per orientarti subito. Ideale come primo passo.
          </p>
          <ul className="text-sm space-y-2">
            <li className="flex items-center gap-2"><span className="text-[#F5B800]">✓</span> 5 step guidati</li>
            <li className="flex items-center gap-2"><span className="text-[#F5B800]">✓</span> Range "min – max" realistico</li>
            <li className="flex items-center gap-2"><span className="text-[#F5B800]">✓</span> Risultato approssimativo (±15%)</li>
          </ul>
          <div className="mt-6 inline-flex items-center gap-2 text-[#F5B800] font-semibold text-sm">
            Inizia stima rapida
            <span className="group-hover:translate-x-1 transition">→</span>
          </div>
        </button>

        <button
          onClick={() => onScegli('esperto')}
          className="group relative text-left bg-[#F5B800]/[0.07] border-2 border-[#F5B800]/40 hover:border-[#F5B800] rounded-2xl sm:rounded-3xl p-5 sm:p-8 transition shadow-sm hover:shadow-md"
        >
          <div className="absolute -top-3 right-6 bg-[#F5B800] text-[#1A1A1A] text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
            <Star className="w-3 h-3 fill-current" /> Più completo
          </div>
          <div className="flex items-center justify-between mb-5">
            <div className="w-14 h-14 rounded-2xl bg-[#F5B800] flex items-center justify-center shadow-sm">
              <ClipboardCheck className="w-7 h-7 text-[#1A1A1A]" />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#666]">
              ~ 10 minuti
            </span>
          </div>
          <div className="font-display text-xl sm:text-2xl font-bold mb-2">Preventivo dettagliato</div>
          <p className="text-sm text-[#666] mb-5">
            Componi il preventivo voce per voce dal listino MB. Prezzi reali per unità, calcolati sul DB.
          </p>
          <ul className="text-sm space-y-2">
            <li className="flex items-center gap-2"><span className="text-[#F5B800]">✓</span> Listino MB validato</li>
            <li className="flex items-center gap-2"><span className="text-[#F5B800]">✓</span> Quantità + unità reali</li>
            <li className="flex items-center gap-2"><span className="text-[#F5B800]">✓</span> Pre-compilato dalla stima rapida</li>
          </ul>
          <div className="mt-6 inline-flex items-center gap-2 text-[#F5B800] font-semibold text-sm">
            Crea preventivo esperto
            <span className="group-hover:translate-x-1 transition">→</span>
          </div>
        </button>
      </div>

      <p className="text-center text-xs text-[#666] mt-8">
        Dopo qualsiasi delle tre strade, sopralluogo gratuito di conferma con MB.
      </p>
    </div>
  );
}
