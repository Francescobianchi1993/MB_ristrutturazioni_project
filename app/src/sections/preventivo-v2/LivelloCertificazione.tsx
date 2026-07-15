/**
 * Richiedi certificazione — flusso indipendente dalla stima/preventivo.
 *
 * L'utente sceglie la tipologia di certificazione (gas, elettrica, idraulica,
 * altro), inserisce i dati generici + una descrizione e invia la richiesta.
 * Non c'è un prezzo: l'azienda ricontatta il cliente. La richiesta viaggia
 * riusando l'edge function `invia-sopralluogo` (notifica all'azienda + conferma
 * al cliente), con il riepilogo nel campo note.
 */

import { useRef, useState } from 'react';
import { ArrowLeft, CheckCircle, Send, ShieldCheck, Flame, Zap, Droplets, MoreHorizontal, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { EMAIL, TEL_DISPLAY } from '@/lib/contatti';
import { useScrollInCima } from './scroll';

interface Props {
  onTorna: () => void;
}

const TIPI = [
  { id: 'gas', label: 'Gas', desc: 'Impianto e apparecchi a gas', icon: Flame },
  { id: 'elettrica', label: 'Elettrica', desc: 'Conformità DM 37/08', icon: Zap },
  { id: 'idraulica', label: 'Idraulica', desc: 'Impianto idrico-sanitario', icon: Droplets },
  { id: 'altro', label: 'Altro', desc: 'Un altro tipo di certificazione', icon: MoreHorizontal },
] as const;

type TipoId = (typeof TIPI)[number]['id'];

export default function LivelloCertificazione({ onTorna }: Props) {
  // Multi-selezione: il cliente può richiedere più certificazioni insieme.
  const [tipi, setTipi] = useState<TipoId[]>([]);
  const [form, setForm] = useState({ nome: '', email: '', telefono: '', indirizzo: '', descrizione: '' });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [done, setDone] = useState(false);

  // Da telefono si arriva qui da una card dell'Hub, che sta a metà pagina:
  // senza questo, il form si apriva a metà. Riposiziona anche sulla schermata
  // di conferma, altrimenti l'utente non vede il messaggio "Richiesta inviata".
  const topRef = useRef<HTMLDivElement>(null);
  useScrollInCima(topRef, [done]);

  // Etichette delle tipologie scelte, nell'ordine di TIPI (stabile).
  const tipiLabels = TIPI.filter((t) => tipi.includes(t.id)).map((t) => t.label);
  const tipiLabel = tipiLabels.join(', ');

  function toggleTipo(id: TipoId) {
    setErrorMsg('');
    setTipi((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function buildNote(): string {
    const righe = [
      '[Richiesta CERTIFICAZIONE dal sito]',
      `Tipologie: ${tipiLabel}`,
    ];
    if (form.indirizzo.trim()) righe.push(`Indirizzo/Città: ${form.indirizzo.trim()}`);
    if (form.descrizione.trim()) {
      righe.push('', `Descrizione: ${form.descrizione.trim()}`);
    }
    righe.push('', 'Il cliente chiede di essere ricontattato al telefono.');
    return righe.join('\n');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    if (tipi.length === 0) {
      setErrorMsg('Seleziona almeno un tipo di certificazione.');
      return;
    }
    if (!supabase) {
      setErrorMsg(`Servizio momentaneamente non disponibile. Chiamaci al +39 ${TEL_DISPLAY} o scrivici a ${EMAIL}.`);
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('invia-sopralluogo', {
        body: {
          tipo: 'certificazione',
          nome: form.nome,
          email: form.email,
          telefono: form.telefono,
          note: buildNote(),
          allegati: [],
        },
      });
      if (error) throw error;
      setDone(true);
    } catch (err) {
      console.error('[Certificazione] invio fallito:', err);
      setErrorMsg(`Invio non riuscito. Riprova tra poco, oppure chiamaci al +39 ${TEL_DISPLAY}.`);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div ref={topRef} className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="bg-white border border-[#E5E5E5] rounded-3xl shadow-sm p-8 sm:p-12 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="font-display text-2xl font-bold mb-2">Richiesta inviata</h3>
          <p className="text-[#666]">
            Abbiamo ricevuto la tua richiesta di certificazione{' '}
            <strong>{tipiLabel.toLowerCase()}</strong>. A breve riceverai un'email di conferma
            {form.email.trim() ? (
              <>
                {' '}a <strong>{form.email.trim()}</strong>
              </>
            ) : null}
            : un nostro tecnico la esaminerà e ti ricontatteremo al più presto.
          </p>
          <button
            onClick={onTorna}
            className="mt-6 px-6 py-2.5 rounded-full bg-[#1A1A1A] hover:bg-black text-white text-sm font-semibold"
          >
            Torna all'inizio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={topRef} className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
      <button
        onClick={onTorna}
        className="text-sm text-[#1A1A1A] hover:text-black font-bold mb-6 flex items-center gap-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Cambia modalità
      </button>

      <div className="bg-white border border-[#E5E5E5] rounded-3xl shadow-sm p-6 lg:p-10">
        <div className="flex items-start gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#F5B800]/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-6 h-6 text-[#F5B800]" />
          </div>
          <div>
            <h3 className="font-display text-2xl font-bold">Richiedi una certificazione</h3>
            <p className="text-[#666] mt-1">
              Scegli il tipo di certificazione, lascia i tuoi dati e ti ricontatteremo al più presto.
            </p>
          </div>
        </div>

        <form onSubmit={submit}>
          {/* Selezione tipologia — multi-scelta */}
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#666] mb-2">
            Che certificazioni ti servono? <span className="text-[#F5B800]">Puoi sceglierne più di una</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            {TIPI.map((t) => {
              const sel = tipi.includes(t.id);
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={sel}
                  onClick={() => toggleTipo(t.id)}
                  className={`relative text-left p-4 rounded-2xl border-2 transition ${
                    sel
                      ? 'border-[#F5B800] bg-[#F5B800]/10'
                      : 'border-[#E5E5E5] bg-white hover:border-[#F5B800]/40'
                  }`}
                >
                  {sel && (
                    <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#F5B800] flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-[#1A1A1A]" />
                    </span>
                  )}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${
                      sel ? 'bg-[#F5B800]' : 'bg-[#F5B800]/10'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${sel ? 'text-[#1A1A1A]' : 'text-[#F5B800]'}`} />
                  </div>
                  <div className="font-semibold text-sm">{t.label}</div>
                  <div className="text-[11px] text-[#666] leading-tight mt-0.5">{t.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Dati generici */}
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#666] mb-2">
            I tuoi dati
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium" htmlFor="cert-nome">Nome e Cognome</label>
              <input
                id="cert-nome" type="text" required placeholder="Mario Rossi"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="mt-1 w-full h-11 px-3 rounded-xl border border-[#E5E5E5] focus:border-[#F5B800] outline-none"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium" htmlFor="cert-email">Email</label>
                <input
                  id="cert-email" type="email" required placeholder="mario@email.it"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="mt-1 w-full h-11 px-3 rounded-xl border border-[#E5E5E5] focus:border-[#F5B800] outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="cert-tel">Telefono</label>
                <input
                  id="cert-tel" type="tel" required placeholder="+39 123 456 7890"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  className="mt-1 w-full h-11 px-3 rounded-xl border border-[#E5E5E5] focus:border-[#F5B800] outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="cert-indirizzo">
                Indirizzo / Città <span className="text-[#999] font-normal text-xs">(opzionale)</span>
              </label>
              <input
                id="cert-indirizzo" type="text" placeholder="Via Roma 1, Roma"
                value={form.indirizzo}
                onChange={(e) => setForm({ ...form, indirizzo: e.target.value })}
                className="mt-1 w-full h-11 px-3 rounded-xl border border-[#E5E5E5] focus:border-[#F5B800] outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="cert-desc">
                Descrizione <span className="text-[#999] font-normal text-xs">(opzionale)</span>
              </label>
              <textarea
                id="cert-desc" rows={3} placeholder="Raccontaci di cosa hai bisogno: tipo di impianto, motivo della certificazione…"
                value={form.descrizione}
                onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
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
            className="mt-6 w-full bg-[#F5B800] hover:bg-[#D9A200] text-[#1A1A1A] font-semibold h-12 rounded-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Invio in corso…' : <>Invia richiesta <Send className="w-4 h-4" /></>}
          </button>

          <p className="text-[11px] text-[#666] text-center mt-3">
            Inviando accetti la nostra{' '}
            <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="text-[#F5B800] hover:underline">
              privacy policy
            </a>. Ti ricontattiamo noi, senza impegno.
          </p>
        </form>
      </div>
    </div>
  );
}
