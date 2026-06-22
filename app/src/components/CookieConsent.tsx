/**
 * Banner di consenso cookie. Appare finché l'utente non sceglie; può essere
 * riaperto dal link "Gestisci cookie" nel footer (evento EVENTO_RIAPRI_COOKIE).
 *
 * "Accetta" abilita i cookie di marketing (Meta Pixel); "Rifiuta" li lascia
 * disattivi. La scelta è salvata in localStorage. I cookie tecnici/necessari
 * non richiedono consenso e non sono toccati qui.
 */

import { useEffect, useState } from 'react';
import { Cookie } from 'lucide-react';
import { getConsent, setConsent, initPixelSeConsentito, EVENTO_RIAPRI_COOKIE } from '@/lib/consent';

export default function CookieConsent() {
  // Visibile alla prima visita (nessuna scelta salvata); init lazy così non
  // chiamiamo setState dentro l'effect.
  const [visibile, setVisibile] = useState(() => getConsent() === null);

  useEffect(() => {
    // Utente di ritorno che aveva già accettato → carica subito il Pixel.
    initPixelSeConsentito();

    const riapri = () => setVisibile(true);
    window.addEventListener(EVENTO_RIAPRI_COOKIE, riapri);
    return () => window.removeEventListener(EVENTO_RIAPRI_COOKIE, riapri);
  }, []);

  if (!visibile) return null;

  function scegli(c: 'granted' | 'denied') {
    setConsent(c);
    setVisibile(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] p-3 sm:p-4 [padding-bottom:calc(env(safe-area-inset-bottom)+0.75rem)]">
      <div className="max-w-3xl mx-auto bg-white border border-[#E5E5E5] shadow-2xl rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-full bg-[#F5B800]/15 flex items-center justify-center flex-shrink-0">
            <Cookie className="w-5 h-5 text-[#F5B800]" />
          </div>
          <p className="text-sm text-[#444] leading-snug">
            Usiamo cookie tecnici necessari e, con il tuo consenso, cookie di
            marketing (Meta Pixel) per misurare le campagne. Vedi la{' '}
            <a href="/cookie-policy.html" target="_blank" rel="noopener noreferrer" className="text-[#F5B800] font-semibold hover:underline">Cookie Policy</a>{' '}
            e la{' '}
            <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="text-[#F5B800] font-semibold hover:underline">Privacy Policy</a>.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => scegli('denied')}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-full border-2 border-[#E5E5E5] text-[#1A1A1A] font-semibold text-sm hover:bg-[#F7F7F7]"
          >
            Rifiuta
          </button>
          <button
            onClick={() => scegli('granted')}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-full bg-[#F5B800] hover:bg-[#D9A200] text-[#1A1A1A] font-semibold text-sm"
          >
            Accetta
          </button>
        </div>
      </div>
    </div>
  );
}
