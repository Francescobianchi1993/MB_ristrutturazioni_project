/**
 * Pop-up "Richiedi sopralluogo" lanciato dalla card stima.
 *
 * A differenza del semplice scroll al form contatti, qui mostriamo CHIARAMENTE
 * che la stima appena costruita (interventi, superficie, importo) è già allegata
 * alla richiesta: l'utente inserisce solo i propri dati e l'email parte verso
 * l'azienda riusando la stessa edge function del form sopralluogo
 * (`invia-sopralluogo`), col riepilogo del preventivo nel campo note.
 */

import { useState } from 'react';
import { X, CheckCircle, Send, Download } from 'lucide-react';
import { useProgetto } from './state';
import { calcolaPrezzo, fmt, mqDiRiferimento } from './pricing';
import { MACRO_SLOT_BY_ID, FINITURE, TEMPISTICHE } from './data';
import type { MacroSlotId } from '@/lib/preventivoModel';
import { supabase } from '@/lib/supabase';
import { EMAIL, TEL_DISPLAY } from '@/lib/contatti';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Se passato, la schermata di conferma mostra "Scarica il PDF" (i dati appena
   *  inseriti sono già salvati nello stato, quindi il PDF esce intestato). */
  onScaricaPdf?: () => void;
}

export default function RichiediSopralluogoDialog({ open, onClose, onScaricaPdf }: Props) {
  const { state, dispatch } = useProgetto();
  const result = calcolaPrezzo(state);

  const [form, setForm] = useState({ nome: '', email: '', telefono: '', note: '' });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [done, setDone] = useState(false);

  if (!open) return null;

  const slotAttivi = (Object.keys(state.macroSlot) as MacroSlotId[]).filter(
    (id) => state.macroSlot[id]?.attivo
  );
  const interventiLabels = slotAttivi.map((id) => MACRO_SLOT_BY_ID[id]?.label ?? id);
  // Superficie coerente col prezzo (m² totali solo per interventi sull'intera
  // casa, altrimenti la somma delle stanze; null se solo infissi). Selettore
  // condiviso con PDF e riepilogo, così i canali dicono lo stesso numero.
  const mq: number | null = mqDiRiferimento(state);
  const finituraLabel = FINITURE.find((f) => f.id === state.finitura)?.label ?? state.finitura;
  const tempLabel = TEMPISTICHE.find((t) => t.id === state.tempistica)?.label ?? state.tempistica;

  // Riepilogo del preventivo che viaggia nel campo "note" dell'email all'azienda.
  function buildNote(): string {
    const righe = [
      '[Richiesta dal configuratore preventivo online]',
      `Interventi: ${interventiLabels.join(', ') || '—'}`,
    ];
    if (mq != null) righe.push(`Superficie indicata: ~${mq} m²`);
    righe.push(
      `Finitura: ${finituraLabel} · Tempistica: ${tempLabel}`,
      // All'azienda mandiamo la stessa cifra che il cliente ha visto (IVA inclusa)
      // più l'imponibile, così non c'è ambiguità su quale numero sia.
      `Stima indicativa: ${fmt(result.totaleIvato)} IVA incl. (imponibile ${fmt(result.imponibile)} + IVA ${result.ivaPct}%) · range imponibile ${fmt(result.range.min)}–${fmt(result.range.max)}, ±15%`,
    );
    if (form.note.trim()) {
      righe.push('', `Note del cliente: ${form.note.trim()}`);
    }
    return righe.join('\n');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    if (!supabase) {
      setErrorMsg(`Servizio momentaneamente non disponibile. Chiamaci al +39 ${TEL_DISPLAY} o scrivici a ${EMAIL}.`);
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('invia-sopralluogo', {
        body: {
          tipo: 'sopralluogo',
          nome: form.nome,
          email: form.email,
          telefono: form.telefono,
          note: buildNote(),
          allegati: [],
          // Contenuto strutturato per il CRM (storico attività del contatto).
          dettaglio: {
            totale: result.imponibile,
            totale_ivato: result.totaleIvato,
            interventi: interventiLabels,
            mq,
            finitura: finituraLabel,
            tempistica: tempLabel,
            tipo_casa: state.tipoCasa,
          },
        },
      });
      if (error) throw error;
      // Salviamo i dati nello stato: sbloccano il download del PDF (intestato) e
      // restano compilati per eventuali passi successivi.
      dispatch({
        type: 'SET_CONTATTI',
        patch: { name: form.nome.trim(), email: form.email.trim(), phone: form.telefono.trim() },
      });
      setDone(true);
    } catch (err) {
      console.error('[RichiediSopralluogo] invio fallito:', err);
      setErrorMsg(`Invio non riuscito. Riprova tra poco, oppure chiamaci al +39 ${TEL_DISPLAY}.`);
    } finally {
      setLoading(false);
    }
  }

  function chiudi() {
    // Reset così alla riapertura il dialog riparte pulito.
    setDone(false);
    setErrorMsg('');
    setForm({ nome: '', email: '', telefono: '', note: '' });
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
        {done ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-display text-xl font-bold mb-2">Richiesta inviata!</h3>
            <p className="text-[#666] text-sm">
              Abbiamo ricevuto la tua richiesta con la stima allegata. Ti ricontatteremo presto
              per fissare il sopralluogo gratuito.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
              {onScaricaPdf && (
                <button
                  onClick={() => { onScaricaPdf(); chiudi(); }}
                  className="px-6 py-2.5 rounded-full bg-[#F5B800] hover:bg-[#D9A200] text-[#1A1A1A] text-sm font-semibold inline-flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Scarica il PDF
                </button>
              )}
              <button
                onClick={chiudi}
                className="px-6 py-2.5 rounded-full bg-[#1A1A1A] hover:bg-black text-white text-sm font-semibold"
              >
                Chiudi
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="font-display text-xl font-bold leading-tight">
                  Richiedi il sopralluogo gratuito
                </h3>
                <p className="text-sm text-[#666] mt-1">
                  Inserisci i tuoi dati: la stima qui sotto è già allegata alla richiesta.
                </p>
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

            {/* Riepilogo stima già allegato */}
            <div className="bg-[#FFF8E7] border border-[#F5B800]/30 rounded-xl p-4 mb-5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#666] mb-2">
                La tua stima — allegata alla richiesta
              </div>
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-[#666]">Interventi: </span>
                  <span className="font-medium">{interventiLabels.join(', ') || '—'}</span>
                </div>
                <div>
                  {mq != null && (
                    <>
                      <span className="text-[#666]">Superficie: </span>
                      <span className="font-medium">~{mq} m²</span>
                      <span className="text-[#666]"> · </span>
                    </>
                  )}
                  <span className="text-[#666]">{finituraLabel} · {tempLabel}</span>
                </div>
                <div className="flex items-baseline gap-2 pt-1">
                  {/* Stessa cifra della card: totale IVA INCLUSA, etichettato.
                      Prima qui compariva l'imponibile (IVA escl.) senza dirlo →
                      due prezzi diversi per la stessa stima nello stesso flusso. */}
                  <span className="font-display text-2xl font-bold text-[#F5B800]">
                    {fmt(result.totaleIvato)}
                  </span>
                  <span className="text-xs text-[#666]">IVA {result.ivaPct}% incl.</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium" htmlFor="rs-nome">Nome e Cognome</label>
                <input
                  id="rs-nome" type="text" required placeholder="Mario Rossi"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="mt-1 w-full h-11 px-3 rounded-xl border border-[#E5E5E5] focus:border-[#F5B800] outline-none"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium" htmlFor="rs-email">Email</label>
                  <input
                    id="rs-email" type="email" required placeholder="mario@email.it"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="mt-1 w-full h-11 px-3 rounded-xl border border-[#E5E5E5] focus:border-[#F5B800] outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium" htmlFor="rs-tel">Telefono</label>
                  <input
                    id="rs-tel" type="tel" placeholder="+39 123 456 7890"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    className="mt-1 w-full h-11 px-3 rounded-xl border border-[#E5E5E5] focus:border-[#F5B800] outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="rs-note">
                  Note <span className="text-[#999] font-normal text-xs">(opzionale)</span>
                </label>
                <textarea
                  id="rs-note" rows={2} placeholder="Aggiungi dettagli o preferenze sull'orario…"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="mt-1 w-full p-3 rounded-xl border border-[#E5E5E5] focus:border-[#F5B800] outline-none resize-none"
                />
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
              {loading ? 'Invio in corso…' : <>Invia richiesta <Send className="w-4 h-4" /></>}
            </button>

            <p className="text-[11px] text-[#666] text-center mt-3">
              Inviando accetti la nostra{' '}
              <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="text-[#F5B800] hover:underline">
                privacy policy
              </a>. Sopralluogo gratuito e senza impegno.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
