import { useRef, useState, useCallback } from 'react';
import {
  MapPin, Phone, Mail, MessageCircle, Calendar, CheckCircle,
  Upload, X, FileText, Image, Film, Paperclip,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { EMAIL, TEL_DISPLAY, TEL_HREF, whatsappHref } from '@/lib/contatti';
import { trackLead } from '@/lib/consent';

// Supabase Storage: il bucket "sopralluogo-files" DEVE restare PRIVATO (Public: OFF).
// Contiene foto/planimetrie dei clienti: l'accesso avviene solo tramite signed URL
// generati lato server (service role). L'upload da anon è permesso da una policy
// INSERT dedicata; la lettura pubblica va lasciata disattivata.
// Dashboard → Storage → New bucket → Name: sopralluogo-files → Public: OFF
const BUCKET = 'sopralluogo-files';
const MAX_FILES = 5;
const MAX_MB = 8;
const ACCEPTED = '.jpg,.jpeg,.png,.webp,.heic,.pdf,.doc,.docx,.mp4,.mov';
const ACCEPTED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'video/mp4', 'video/quicktime',
]);

interface ContactInfo {
  icon: typeof MapPin;
  title: string;
  content: string;
  /** Se assente, la card è informativa e NON cliccabile. */
  href?: string;
  external?: boolean;
}

const contactInfo: ContactInfo[] = [
  {
    icon: MapPin,
    title: 'Dove Operiamo',
    content: 'Roma e provincia',
  },
  {
    icon: Phone,
    title: 'Telefono',
    content: `+39 ${TEL_DISPLAY}`,
    href: TEL_HREF,
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp',
    content: `+39 ${TEL_DISPLAY}`,
    href: whatsappHref('Ciao, vorrei prenotare un sopralluogo'),
    external: true,
  },
  {
    icon: Mail,
    title: 'Email',
    content: EMAIL,
    href: `mailto:${EMAIL}`,
  },
];

function FileTypeIcon({ file }: { file: File }) {
  if (file.type.startsWith('image/')) return <Image className="w-4 h-4 text-[#F5B800] shrink-0" />;
  if (file.type.startsWith('video/')) return <Film className="w-4 h-4 text-blue-400 shrink-0" />;
  return <FileText className="w-4 h-4 text-[#888] shrink-0" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Comprime un'immagine nel browser prima dell'upload: ridimensiona a max 1920px
 * e ricomprime in JPEG ~82%. Riduce molto il peso (foto telefono 3-8MB → ~0.3-0.8MB).
 * HEIC/HEIF, PDF, DOC e video NON sono toccati (il browser non li sa ridisegnare).
 * Se per qualunque motivo non migliora o fallisce, ritorna il file originale.
 */
async function comprimiImmagine(file: File): Promise<File> {
  const tipo = file.type;
  if (!tipo.startsWith('image/') || tipo === 'image/heic' || tipo === 'image/heif') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const MAX_DIM = 1920;
    let { width, height } = bitmap;
    if (width > MAX_DIM || height > MAX_DIM) {
      const r = Math.min(MAX_DIM / width, MAX_DIM / height);
      width = Math.round(width * r);
      height = Math.round(height * r);
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.82));
    if (!blob || blob.size >= file.size) return file; // se non riduce, tieni l'originale
    const nome = file.name.replace(/\.(png|webp|jpe?g)$/i, '') + '.jpg';
    return new File([blob], nome, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export default function Contact() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState('');
  // Errore "bloccante" dell'invio (mostrato nel form) e avviso non bloccante
  // (mostrato nella schermata di conferma, es. allegati non caricati).
  const [errorMsg, setErrorMsg] = useState('');
  const [warnMsg, setWarnMsg] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });

  // Animazioni GSAP rimosse: causavano transform residui (translateX) sui box
  // su mobile quando lo ScrollTrigger non scattava esattamente come previsto.
  // Il fade-in CSS è sufficiente per la sezione Contact.

  const addFiles = useCallback((incoming: FileList | File[]) => {
    setFileError('');
    const arr = Array.from(incoming);
    const valid: File[] = [];
    // Estensioni ammesse: molti browser NON popolano file.type per HEIC/HEIF
    // (foto iPhone) e a volte per .mov/.docx → controllare anche l'estensione.
    const acceptedExt = ACCEPTED.split(',').map((e) => e.trim().toLowerCase());
    for (const f of arr) {
      const dot = f.name.lastIndexOf('.');
      const ext = dot >= 0 ? f.name.slice(dot).toLowerCase() : '';
      const tipoOk = !!f.type && ACCEPTED_TYPES.has(f.type);
      const estOk = !!ext && acceptedExt.includes(ext);
      if (!tipoOk && !estOk) {
        setFileError(`Formato non supportato: ${f.name}`);
        continue;
      }
      if (f.size > MAX_MB * 1024 * 1024) {
        setFileError(`File troppo grande (max ${MAX_MB} MB): ${f.name}`);
        continue;
      }
      valid.push(f);
    }
    setFiles(prev => {
      const merged = [...prev, ...valid];
      if (merged.length > MAX_FILES) {
        setFileError(`Massimo ${MAX_FILES} file consentiti`);
        return merged.slice(0, MAX_FILES);
      }
      return merged;
    });
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setFileError('');
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  // Comprime + carica nel bucket privato. Ritorna gli allegati caricati con
  // successo come { nome, path } (gli upload falliti vengono semplicemente saltati).
  const uploadFiles = async (): Promise<{ nome: string; path: string }[]> => {
    if (!supabase || files.length === 0) return [];
    // Chiave storage: solo [A-Za-z0-9._-]; caratteri anomali (spazi, '/', accenti…)
    // in nome cliente o file spezzerebbero il path e farebbero fallire l'upload.
    const safe = (s: string) =>
      (s || '').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/_+/g, '_').replace(/^[_.]+|_+$/g, '') || 'file';
    const prefix = `${Date.now()}-${safe(formData.name.toLowerCase()) || 'anon'}`;
    const out: { nome: string; path: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const original = files[i];
      const file = await comprimiImmagine(original);
      try {
        // Prefissiamo l'indice al nome: due file con lo stesso nome nella stessa
        // richiesta avrebbero la stessa chiave e con upsert:true si sovrascriverebbero.
        const { data, error } = await supabase.storage
          .from(BUCKET)
          .upload(`${prefix}/${i}-${safe(file.name)}`, file, { upsert: true, contentType: file.type });
        if (!error && data) out.push({ nome: original.name, path: data.path });
      } catch {
        // upload singolo fallito: lo saltiamo
      }
    }
    return out;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setWarnMsg('');
    if (!supabase) {
      // Config mancante (es. env non settate in produzione): non lasciare
      // l'utente senza feedback, indicagli un canale alternativo.
      setErrorMsg(`Servizio di invio momentaneamente non disponibile. Chiamaci al +39 ${TEL_DISPLAY} o scrivici a ${EMAIL}.`);
      return;
    }
    setIsLoading(true);
    try {
      const numFile = files.length;
      const allegati = await uploadFiles();
      // Tutti gli allegati selezionati hanno fallito l'upload: blocco l'invio
      // (le foto sono spesso decisive) e chiedo di riprovare.
      if (numFile > 0 && allegati.length === 0) {
        throw new Error('upload_allegati_fallito');
      }
      const { error } = await supabase.functions.invoke('invia-sopralluogo', {
        body: {
          tipo: 'contatto',
          nome: formData.name,
          email: formData.email,
          telefono: formData.phone,
          note: formData.message,
          allegati,
        },
      });
      if (error) throw error;

      // Invio riuscito ma alcuni (non tutti) allegati non sono saliti: avviso.
      if (numFile > 0 && allegati.length < numFile) {
        setWarnMsg(`Alcuni allegati non sono stati caricati. Se vuoi, inviaci le foto via WhatsApp al +39 ${TEL_DISPLAY}.`);
      }
      trackLead(); // conversione: sopralluogo richiesto (no valore monetario)
      setIsSubmitted(true);
      setFormData({ name: '', email: '', phone: '', message: '' });
      setFiles([]);
      setTimeout(() => { setIsSubmitted(false); setWarnMsg(''); }, 8000);
    } catch (err) {
      console.error('[Contact] Invio fallito:', err);
      setErrorMsg(`Invio non riuscito. Riprova tra poco, oppure chiamaci al +39 ${TEL_DISPLAY}.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <section id="contatti" ref={sectionRef} className="py-16 lg:py-20 bg-[#F8F8F8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-stretch">

          {/* Left — info */}
          <div ref={contentRef} className="flex flex-col justify-between gap-8 min-w-0">
            <div className="space-y-8">
              <div>
                <div className="inline-flex items-center gap-2 text-[#F5B800] font-semibold text-sm uppercase tracking-wider mb-4">
                  <div className="w-8 h-0.5 bg-[#F5B800]" />
                  Contattaci
                </div>
                <h2 className="font-display text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1A1A1A] mb-4">
                  Pronto a trasformare{' '}
                  <span className="text-[#F5B800]">la tua casa?</span>
                </h2>
                <p className="text-[#666666] text-lg">
                  Prenota un sopralluogo gratuito. I nostri esperti vengono da te,
                  valutano il progetto e ti consegnano il preventivo sul posto.
                </p>
              </div>

              <div className="space-y-4">
                {contactInfo.map((info, index) => {
                  const inner = (
                    <>
                      <div className="w-12 h-12 bg-[#F5B800]/10 group-hover:bg-[#F5B800] rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-300">
                        <info.icon className="w-6 h-6 text-[#F5B800] group-hover:text-[#1A1A1A] transition-colors duration-300" />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="font-semibold text-[#1A1A1A] mb-1">{info.title}</p>
                        <p className="text-[#666666] text-sm break-all">{info.content}</p>
                      </div>
                    </>
                  );
                  const baseCls = 'flex items-center gap-4 bg-white p-5 rounded-2xl transition-all duration-300 group';

                  // Senza href la card è solo informativa: niente link, niente cursore a mano.
                  if (!info.href) {
                    return (
                      <div key={index} className={baseCls}>
                        {inner}
                      </div>
                    );
                  }
                  return (
                    <a
                      key={index}
                      href={info.href}
                      {...(info.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      className={`${baseCls} hover:shadow-lg`}
                    >
                      {inner}
                    </a>
                  );
                })}
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-2xl p-6 text-white">
              <p className="font-semibold mb-3">Orari di Lavoro</p>
              <div className="space-y-2 text-sm text-white/70">
                <div className="flex justify-between"><span>Lunedì - Venerdì</span><span>07:00 - 18:00</span></div>
                <div className="flex justify-between"><span>Sabato</span><span>09:00 - 13:00</span></div>
                <div className="flex justify-between"><span>Domenica</span><span>Chiuso</span></div>
              </div>
              <p className="text-xs text-white/60 mt-3">
                <span className="underline">Il sabato solo interventi o contatti telefonici/email.</span>
              </p>
            </div>
          </div>

          {/* Right — form */}
          <div ref={formRef} className="flex flex-col h-full min-w-0">
            <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-lg flex flex-col flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-[#F5B800]/10 rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-[#F5B800]" />
                </div>
                <h3 className="font-display text-2xl font-semibold text-[#1A1A1A]">
                  Prenota un Sopralluogo
                </h3>
              </div>
              <p className="text-[#666666] mb-6">
                Compila il form e ti ricontatteremo entro 24 ore per fissare la data.
              </p>

              {isSubmitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-[#1A1A1A] text-xl mb-2">Richiesta Inviata!</h4>
                  <p className="text-[#666666]">
                    Ti contatteremo presto per confermare la data del sopralluogo.
                  </p>
                  {warnMsg && (
                    <p className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                      {warnMsg}
                    </p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <Label htmlFor="name" className="text-[#1A1A1A] font-medium">Nome e Cognome</Label>
                    <Input
                      id="name" name="name" type="text" placeholder="Mario Rossi"
                      value={formData.name} onChange={handleChange} required
                      className="mt-1.5 h-12 rounded-xl border-[#E5E5E5] focus:border-[#F5B800] focus:ring-[#F5B800]"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email" className="text-[#1A1A1A] font-medium">Email</Label>
                      <Input
                        id="email" name="email" type="email" placeholder="mario@email.it"
                        value={formData.email} onChange={handleChange} required
                        className="mt-1.5 h-12 rounded-xl border-[#E5E5E5] focus:border-[#F5B800] focus:ring-[#F5B800]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-[#1A1A1A] font-medium">Telefono</Label>
                      <Input
                        id="phone" name="phone" type="tel" placeholder="+39 123 456 7890"
                        value={formData.phone} onChange={handleChange}
                        className="mt-1.5 h-12 rounded-xl border-[#E5E5E5] focus:border-[#F5B800] focus:ring-[#F5B800]"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="message" className="text-[#1A1A1A] font-medium">Note sul progetto</Label>
                    <Textarea
                      id="message" name="message"
                      placeholder="Descrivi brevemente cosa vorresti fare (es. cucina + bagno, ~60 mq)..."
                      value={formData.message} onChange={handleChange} rows={3}
                      className="mt-1.5 rounded-xl border-[#E5E5E5] focus:border-[#F5B800] focus:ring-[#F5B800] resize-none"
                    />
                  </div>

                  {/* Upload zone */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="text-[#1A1A1A] font-medium flex items-center gap-1.5">
                        <Paperclip className="w-4 h-4" />
                        Allega foto o planimetrie
                        <span className="text-[#999] font-normal text-xs">(opzionale)</span>
                      </Label>
                      <span className="text-xs text-[#999]">{files.length} / {MAX_FILES}</span>
                    </div>

                    {files.length < MAX_FILES && (
                      <div
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={[
                          'border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors',
                          isDragging
                            ? 'border-[#F5B800] bg-[#F5B800]/5'
                            : 'border-[#E5E5E5] hover:border-[#F5B800] hover:bg-[#FFFDF0]',
                        ].join(' ')}
                      >
                        <Upload className="w-6 h-6 text-[#BBBBBB] mx-auto mb-2" />
                        <p className="text-sm text-[#555]">
                          <span className="font-semibold text-[#F5B800]">Tocca o carica file</span>
                          <span className="hidden sm:inline"> · trascina qui</span>
                        </p>
                        <p className="text-xs text-[#999] mt-1">
                          JPG · PNG · PDF · DOCX · MP4 · MOV — max {MAX_FILES} file · {MAX_MB} MB cad.
                        </p>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED}
                      multiple
                      className="hidden"
                      onChange={e => {
                        if (e.target.files) addFiles(e.target.files);
                        e.target.value = '';
                      }}
                    />

                    {fileError && (
                      <p className="text-red-500 text-xs mt-1.5">{fileError}</p>
                    )}

                    {files.length > 0 && (
                      <ul className="mt-2 space-y-1.5">
                        {files.map((file, i) => (
                          <li key={i} className="flex items-center gap-2 bg-[#F8F8F8] rounded-lg px-3 py-2">
                            <FileTypeIcon file={file} />
                            <span className="text-sm text-[#1A1A1A] truncate flex-1 min-w-0">{file.name}</span>
                            <span className="text-xs text-[#999] shrink-0">{formatSize(file.size)}</span>
                            <button
                              type="button"
                              onClick={() => removeFile(i)}
                              className="shrink-0 text-[#BBBBBB] hover:text-red-500 transition-colors ml-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {errorMsg && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
                      {errorMsg}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#F5B800] hover:bg-[#D9A200] text-[#1A1A1A] font-semibold h-12 rounded-xl transition-all hover:scale-[1.02] hover:shadow-lg disabled:opacity-60 disabled:scale-100 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Invio in corso…' : 'Prenota Sopralluogo'}
                    {!isLoading && <Calendar className="w-5 h-5 ml-2" />}
                  </Button>

                  <p className="text-xs text-[#666666] text-center">
                    Cliccando su "Prenota Sopralluogo" accetti la nostra{' '}
                    <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="text-[#F5B800] hover:underline">privacy policy</a>
                  </p>
                </form>
              )}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
