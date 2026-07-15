/**
 * Cancello dati prima di consegnare il PDF della stima.
 *
 * Il totale è sempre visibile, ma per SCARICARE il file l'utente deve prima
 * lasciare i propri dati: così il PDF esce compilato col nome vero (non più il
 * placeholder "Gentile cliente") e l'azienda ottiene il contatto. Componente
 * generico riusato dalla card stima (RiepilogoSticky) e dalla pagina del link
 * condiviso (PreventivoCondiviso).
 *
 * Non fa nulla di lato-server da sé: raccoglie i dati e li passa a `onConfermato`,
 * che il chiamante usa per notificare l'azienda (lead) e generare il PDF. Se
 * `onConfermato` solleva, il dialog resta aperto e mostra l'errore.
 */

import { useState } from 'react';
import { X, Send } from 'lucide-react';
import { EMAIL, TEL_DISPLAY } from '@/lib/contatti';

export interface DatiCliente {
  nome: string;
  email: string;
  telefono: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfermato: (dati: DatiCliente) => Promise<void>;
  titolo: string;
  sottotitolo: string;
  ctaLabel: string;
  ctaLoadingLabel: string;
  /** Riquadro riepilogo della stima, opzionale, mostrato sopra il form. */
  riepilogo?: React.ReactNode;
}

export default function DatiClienteGate({
  open,
  onClose,
  onConfermato,
  titolo,
  sottotitolo,
  ctaLabel,
  ctaLoadingLabel,
  riepilogo,
}: Props) {
  const [dati, setDati] = useState<DatiCliente>({ nome: '', email: '', telefono: '' });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      await onConfermato({
        nome: dati.nome.trim(),
        email: dati.email.trim(),
        telefono: dati.telefono.trim(),
      });
      // Successo: reset e chiusura sono a carico del chiamante (onConfermato →
      // poi onClose), ma azzeriamo qui il form per la prossima apertura.
      setDati({ nome: '', email: '', telefono: '' });
    } catch (err) {
      console.error('[DatiClienteGate] onConfermato fallito:', err);
      setErrorMsg(
        `Qualcosa è andato storto. Riprova tra poco, oppure chiamaci al +39 ${TEL_DISPLAY} o scrivici a ${EMAIL}.`,
      );
    } finally {
      setLoading(false);
    }
  }

  function chiudi() {
    setErrorMsg('');
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 animate-fade-in"
      onClick={chiudi}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <form onSubmit={submit} className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="font-display text-xl font-bold leading-tight">{titolo}</h3>
              <p className="text-sm text-[#666] mt-1">{sottotitolo}</p>
            </div>
            <button
              type="button"
              onClick={chiudi}
              className="text-[#999] hover:text-[#1A1A1A] shrink-0"
              aria-label="Chiudi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {riepilogo}

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium" htmlFor="dc-nome">Nome e Cognome</label>
              <input
                id="dc-nome" type="text" required placeholder="Mario Rossi"
                value={dati.nome}
                onChange={(e) => setDati({ ...dati, nome: e.target.value })}
                className="mt-1 w-full h-11 px-3 rounded-xl border border-[#E5E5E5] focus:border-[#F5B800] outline-none"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium" htmlFor="dc-email">Email</label>
                <input
                  id="dc-email" type="email" required placeholder="mario@email.it"
                  value={dati.email}
                  onChange={(e) => setDati({ ...dati, email: e.target.value })}
                  className="mt-1 w-full h-11 px-3 rounded-xl border border-[#E5E5E5] focus:border-[#F5B800] outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="dc-tel">Telefono</label>
                <input
                  id="dc-tel" type="tel" placeholder="+39 123 456 7890"
                  value={dati.telefono}
                  onChange={(e) => setDati({ ...dati, telefono: e.target.value })}
                  className="mt-1 w-full h-11 px-3 rounded-xl border border-[#E5E5E5] focus:border-[#F5B800] outline-none"
                />
              </div>
            </div>
          </div>

          {errorMsg && (
            <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full bg-[#F5B800] hover:bg-[#D9A200] text-[#1A1A1A] font-semibold h-12 rounded-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? ctaLoadingLabel : <>{ctaLabel} <Send className="w-4 h-4" /></>}
          </button>

          <p className="text-[11px] text-[#666] text-center mt-3">
            Inserendo i dati accetti la nostra{' '}
            <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="text-[#F5B800] hover:underline">
              privacy policy
            </a>. Ti contatteremo solo in merito alla tua richiesta.
          </p>
        </form>
      </div>
    </div>
  );
}
