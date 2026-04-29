import { useState, type ChangeEvent, type DragEvent } from 'react';
import {
  Upload,
  FileText,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Mail,
  Phone,
  X,
  Box,
} from 'lucide-react';

const STILI = [
  { id: 'moderno', label: 'Moderno', desc: 'Linee pulite, materiali contemporanei' },
  { id: 'classico', label: 'Classico', desc: 'Eleganza senza tempo, dettagli sartoriali' },
  { id: 'industriale', label: 'Industriale', desc: 'Cemento, ferro, atmosfera urban' },
  { id: 'scandinavo', label: 'Scandinavo', desc: 'Legno chiaro, luce, semplicità nordica' },
  { id: 'minimal', label: 'Minimal', desc: 'Essenziale, neutro, ordinato' },
  { id: 'mediterraneo', label: 'Mediterraneo', desc: 'Toni caldi, materia, luce del sud' },
];

const AMBIENTI = ['Soggiorno', 'Cucina', 'Camera da letto', 'Bagno', 'Studio', 'Ingresso'];

const TONI = [
  { id: 'caldi', label: 'Toni caldi', sample: ['#E8C9A0', '#A8744C', '#523A28'] },
  { id: 'freddi', label: 'Toni freddi', sample: ['#A8C5D6', '#4F7A8A', '#2D3F4A'] },
  { id: 'neutri', label: 'Neutri', sample: ['#F0EDE5', '#B8B0A2', '#5C5650'] },
  { id: 'contrasti', label: 'Contrasti', sample: ['#1A1A1A', '#F5B800', '#FFFFFF'] },
];

type RenderState = 'upload' | 'style' | 'preview' | 'sent';

export default function Crea3D() {
  const [step, setStep] = useState<RenderState>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [style, setStyle] = useState('moderno');
  const [ambiente, setAmbiente] = useState('Soggiorno');
  const [tono, setTono] = useState('caldi');
  const [budget, setBudget] = useState(30000);
  const [note, setNote] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [rendering, setRendering] = useState(false);

  const handleFile = (f?: File | null) => {
    if (!f) return;
    setFile(f);
    setStep('style');
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const onChangeFile = (e: ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0] ?? null);
  };

  const startRender = () => {
    setRendering(true);
    // Simulated render time. La generazione vera del render è fatta offline da MB.
    setTimeout(() => setRendering(false), 2200);
    setStep('preview');
  };

  const submit = () => {
    // TODO: collegare con emailjs (già installato) per inviare la richiesta a MB.
    setStep('sent');
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setStyle('moderno');
    setAmbiente('Soggiorno');
    setTono('caldi');
    setBudget(30000);
    setNote('');
    setForm({ name: '', email: '', phone: '' });
  };

  const tonoSel = TONI.find((t) => t.id === tono)!;

  return (
    <section id="crea-3d" className="py-20 lg:py-28 bg-gradient-to-b from-white to-[#FFF8E7]/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 bg-[#F5B800]/10 text-[#1A1A1A] px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4 text-[#F5B800]" />
            Render personalizzato gratuito
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold mb-4">
            Crea il tuo <span className="text-[#F5B800]">render 3D</span>
          </h2>
          <p className="text-[#666666] text-lg">
            Carica la planimetria, scegli stile e atmosfera. Ti invieremo un render personalizzato
            del tuo spazio entro 48 ore.
          </p>
        </div>

        {/* STEP: UPLOAD */}
        {step === 'upload' && (
          <div className="max-w-2xl mx-auto">
            <p className="text-[#666666] text-center mb-6">
              Accettiamo file <strong>PDF, JPG, PNG o DWG</strong>. Se non hai una piantina precisa
              puoi anche caricare uno schizzo.
            </p>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`drop-zone border-2 border-dashed rounded-3xl p-12 text-center transition-colors ${
                dragging ? 'border-[#F5B800] bg-[#F5B800]/5' : 'border-[#E5E5E5] bg-white'
              }`}
            >
              <input
                type="file"
                id="cr3d-file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.dwg"
                onChange={onChangeFile}
              />
              <div className="w-16 h-16 bg-[#F5B800]/10 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Upload className="w-8 h-8 text-[#F5B800]" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">
                Trascina la tua planimetria qui
              </h3>
              <p className="text-[#666666] text-sm mb-6">oppure</p>
              <label
                htmlFor="cr3d-file"
                className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white font-semibold px-6 py-3 rounded-full cursor-pointer hover:bg-[#F5B800] hover:text-[#1A1A1A] transition-colors"
              >
                <FileText className="w-4 h-4" /> Sfoglia i tuoi file
              </label>
              <p className="text-xs text-[#666666] mt-6">
                I tuoi file sono trattati con riservatezza e cancellati dopo l'elaborazione.
              </p>
            </div>
          </div>
        )}

        {/* STEP: STYLE */}
        {step === 'style' && (
          <div className="max-w-5xl mx-auto">
            <div className="bg-white border border-[#E5E5E5] rounded-3xl p-6 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-[#F5B800]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-[#F5B800]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-[#666666]">File caricato</div>
                  <div className="font-medium truncate max-w-[260px]">{file?.name}</div>
                </div>
              </div>
              <button
                onClick={() => setStep('upload')}
                className="text-[#666666] hover:text-[#1A1A1A] flex items-center gap-1 text-sm"
              >
                <X className="w-4 h-4" /> Cambia
              </button>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="bg-white border border-[#E5E5E5] rounded-3xl p-6">
                <h3 className="font-display text-lg font-bold mb-4">Stile</h3>
                <div className="grid grid-cols-2 gap-2">
                  {STILI.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStyle(s.id)}
                      className={`text-left p-3 rounded-xl border transition ${
                        style === s.id
                          ? 'border-[#F5B800] bg-[#F5B800]/10'
                          : 'border-[#E5E5E5] hover:border-[#F5B800]/40'
                      }`}
                    >
                      <div className="font-semibold text-sm">{s.label}</div>
                      <div className="text-[11px] text-[#666666] leading-tight mt-1">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-[#E5E5E5] rounded-3xl p-6">
                <h3 className="font-display text-lg font-bold mb-4">Ambiente</h3>
                <div className="flex flex-wrap gap-2">
                  {AMBIENTI.map((a) => (
                    <button
                      key={a}
                      onClick={() => setAmbiente(a)}
                      className={`px-4 py-2 rounded-full text-sm border transition ${
                        ambiente === a
                          ? 'bg-[#F5B800] text-[#1A1A1A] border-[#F5B800]'
                          : 'bg-white border-[#E5E5E5] hover:border-[#F5B800]/40'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>

                <h3 className="font-display text-lg font-bold mt-6 mb-3">Palette colori</h3>
                <div className="grid grid-cols-2 gap-2">
                  {TONI.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTono(t.id)}
                      className={`p-3 rounded-xl border text-left transition ${
                        tono === t.id
                          ? 'border-[#F5B800] bg-[#F5B800]/5'
                          : 'border-[#E5E5E5] hover:border-[#F5B800]/40'
                      }`}
                    >
                      <div className="text-xs font-medium mb-1">{t.label}</div>
                      <div className="flex gap-1">
                        {t.sample.map((c) => (
                          <div
                            key={c}
                            className="w-5 h-5 rounded-full border border-white"
                            style={{ background: c }}
                          />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-[#E5E5E5] rounded-3xl p-6">
                <h3 className="font-display text-lg font-bold mb-4">Budget orientativo</h3>
                <div className="text-3xl font-display font-bold text-[#F5B800] mb-2">
                  € {budget.toLocaleString('it-IT')}
                </div>
                <input
                  type="range"
                  min={5000}
                  max={150000}
                  step={1000}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-[#666666] mb-6">
                  <span>5k</span>
                  <span>150k</span>
                </div>

                <h3 className="font-display text-lg font-bold mb-3">Note (opzionale)</h3>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Es: vorrei una zona giorno aperta, isola in cucina..."
                  className="w-full p-3 rounded-xl border border-[#E5E5E5] text-sm focus:border-[#F5B800] outline-none resize-none"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setStep('upload')}
                className="flex items-center gap-2 px-5 py-3 rounded-full border border-[#E5E5E5] hover:bg-[#F8F8F8]"
              >
                <ArrowLeft className="w-4 h-4" /> Indietro
              </button>
              <button
                onClick={startRender}
                className="flex items-center gap-2 bg-[#F5B800] hover:bg-[#D9A200] text-[#1A1A1A] font-semibold px-6 py-3 rounded-full"
              >
                Genera anteprima <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP: PREVIEW */}
        {step === 'preview' && (
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-8 items-start">
              <div className="bg-white border border-[#E5E5E5] rounded-3xl p-4">
                <div
                  className="aspect-square rounded-2xl flex items-center justify-center relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${tonoSel.sample[0]}, ${tonoSel.sample[2]})`,
                  }}
                >
                  {rendering ? (
                    <div className="text-white text-center">
                      <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
                      <div className="font-display text-xl">Genero anteprima...</div>
                      <div className="text-sm opacity-80 mt-1">Stile {style} · {ambiente}</div>
                    </div>
                  ) : (
                    <div className="text-center text-white">
                      <Box className="w-16 h-16 mx-auto mb-3 opacity-90" />
                      <div className="font-display text-2xl font-bold">Anteprima</div>
                      <div className="text-sm opacity-80 mt-1">{style} · {ambiente}</div>
                      <div className="mt-4 text-xs bg-white/20 px-3 py-1 rounded-full inline-block">
                        Render finale entro 48h
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-3 text-xs text-[#666666] text-center">
                  Anteprima orientativa. Il render fotorealistico viene preparato dal nostro team.
                </div>
              </div>

              <div className="bg-white border border-[#E5E5E5] rounded-3xl p-6">
                <h3 className="font-display text-xl font-bold mb-1">Quasi pronto</h3>
                <p className="text-[#666666] text-sm mb-5">
                  Lasciaci i tuoi contatti e ti inviamo il render in alta qualità.
                </p>

                <label className="block text-sm font-medium mb-1">Nome</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-3 rounded-xl border border-[#E5E5E5] mb-3 focus:border-[#F5B800] outline-none"
                />

                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full p-3 rounded-xl border border-[#E5E5E5] mb-3 focus:border-[#F5B800] outline-none"
                />

                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> Telefono
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full p-3 rounded-xl border border-[#E5E5E5] mb-5 focus:border-[#F5B800] outline-none"
                />

                <button
                  onClick={submit}
                  disabled={!form.name || !form.email}
                  className="w-full bg-[#F5B800] hover:bg-[#D9A200] disabled:opacity-50 disabled:cursor-not-allowed text-[#1A1A1A] font-semibold py-3 rounded-full flex items-center justify-center gap-2"
                >
                  Invia richiesta render <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setStep('style')}
                  className="w-full mt-2 text-sm text-[#666666] hover:text-[#1A1A1A] py-2"
                >
                  ← Torna indietro
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP: SENT */}
        {step === 'sent' && (
          <div className="max-w-xl mx-auto text-center bg-white border border-[#E5E5E5] rounded-3xl p-12">
            <div className="w-16 h-16 bg-[#F5B800] rounded-full flex items-center justify-center mx-auto mb-5">
              <Check className="w-8 h-8 text-[#1A1A1A]" />
            </div>
            <h3 className="font-display text-2xl font-bold mb-3">Richiesta ricevuta!</h3>
            <p className="text-[#666666] mb-1">Grazie {form.name || 'per la fiducia'}.</p>
            <p className="text-[#666666] mb-6">
              Ti invieremo il render del tuo <strong>{ambiente.toLowerCase()}</strong> in stile{' '}
              <strong>{style}</strong> all'indirizzo <strong>{form.email}</strong> entro 48 ore.
            </p>
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#F5B800] hover:text-[#1A1A1A] text-white font-semibold px-6 py-3 rounded-full"
            >
              Crea un altro render
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
