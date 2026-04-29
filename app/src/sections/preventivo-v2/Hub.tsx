/**
 * Hub di ingresso — l'utente sceglie tra Stima rapida (L1) o Preventivo dettagliato (L2).
 */

import { Zap, ClipboardCheck, Sparkles } from 'lucide-react';

interface HubProps {
  onScegli: (modalita: 'rapida' | 'esperto') => void;
}

export default function Hub({ onScegli }: HubProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 bg-[#F5B800]/10 px-4 py-2 rounded-full text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4 text-[#F5B800]" />
          Calcola il tuo preventivo
        </div>
        <h1 className="font-display text-4xl sm:text-5xl leading-tight font-bold">
          Vuoi un'<span className="text-[#F5B800]">idea generale</span><br />
          o un preventivo <span className="text-[#F5B800]">dettagliato</span>?
        </h1>
        <p className="text-[#666] text-lg mt-4">
          Scegli il livello di precisione. Puoi sempre passare dall'uno all'altro senza perdere i dati.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <button
          onClick={() => onScegli('rapida')}
          className="group text-left bg-white border-2 border-[#E5E5E5] hover:border-[#F5B800] rounded-3xl p-8 transition shadow-sm hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="w-14 h-14 rounded-2xl bg-[#F5B800]/10 group-hover:bg-[#F5B800] flex items-center justify-center transition">
              <Zap className="w-7 h-7 text-[#F5B800] group-hover:text-[#1A1A1A]" />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#666]">
              ~ 2 minuti
            </span>
          </div>
          <div className="font-display text-2xl font-bold mb-2">Stima rapida</div>
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
          className="group text-left bg-[#1A1A1A] hover:bg-black text-white rounded-3xl p-8 transition shadow-sm hover:shadow-lg"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="w-14 h-14 rounded-2xl bg-[#F5B800] flex items-center justify-center">
              <ClipboardCheck className="w-7 h-7 text-[#1A1A1A]" />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#F5B800]">
              ~ 10 minuti
            </span>
          </div>
          <div className="font-display text-2xl font-bold mb-2">Preventivo dettagliato</div>
          <p className="text-sm text-white/70 mb-5">
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
        Dopo qualsiasi delle due strade, sopralluogo gratuito di conferma con MB.
      </p>
    </div>
  );
}
