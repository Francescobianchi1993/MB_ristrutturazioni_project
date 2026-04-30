import { useState, useRef, type MouseEvent, type TouchEvent } from 'react';
import {
  LayoutGrid,
  Filter,
  X,
  Box,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Sparkles,
} from 'lucide-react';

type Project = {
  id: string;
  title: string;
  category: 'Intero Appartamento' | 'Cucina' | 'Bagno' | 'Camera';
  city: string;
  year: number;
  surface: number;
  duration: string;
  budgetRange: string;
  palette: { from: string; to: string; accent: string };
  description: string;
  features: string[];
};

const PROJECTS: Project[] = [
  {
    id: 'a1',
    title: 'Appartamento Trastevere',
    category: 'Intero Appartamento',
    city: 'Roma',
    year: 2025,
    surface: 95,
    duration: '4 mesi',
    budgetRange: '€ 75k – 95k',
    palette: { from: '#E8C9A0', to: '#523A28', accent: '#F5B800' },
    description:
      'Ristrutturazione completa di un appartamento d\'epoca: nuova distribuzione, impianti a norma, parquet rovere e cucina su misura.',
    features: ['Parquet rovere chiaro', 'Cucina su misura', 'Impianti rifatti', 'Climatizzazione'],
  },
  {
    id: 'a2',
    title: 'Loft EUR',
    category: 'Intero Appartamento',
    city: 'Roma',
    year: 2025,
    surface: 110,
    duration: '5 mesi',
    budgetRange: '€ 90k – 120k',
    palette: { from: '#A8C5D6', to: '#2D3F4A', accent: '#F5B800' },
    description:
      'Loft industriale con grandi vetrate, cemento a vista e arredi scuri. Open space tra cucina, pranzo e living.',
    features: ['Open space', 'Cemento a vista', 'Cucina isola', 'Domotica integrata'],
  },
  {
    id: 'c1',
    title: 'Cucina Mediterraneo',
    category: 'Cucina',
    city: 'Frascati',
    year: 2024,
    surface: 18,
    duration: '6 settimane',
    budgetRange: '€ 22k – 28k',
    palette: { from: '#F0E8D4', to: '#8A6D3B', accent: '#F5B800' },
    description:
      'Cucina moderna in stile mediterraneo con isola centrale, top in marmo travertino e pensili sospesi.',
    features: ['Isola centrale', 'Top in travertino', 'Elettrodomestici a scomparsa'],
  },
  {
    id: 'b1',
    title: 'Bagno Master',
    category: 'Bagno',
    city: 'Roma',
    year: 2025,
    surface: 8,
    duration: '4 settimane',
    budgetRange: '€ 14k – 18k',
    palette: { from: '#D9D9D9', to: '#3A3A3A', accent: '#F5B800' },
    description:
      'Bagno padronale con doccia walk-in, mosaico in resina, sanitari sospesi e illuminazione LED integrata.',
    features: ['Doccia walk-in', 'Sanitari sospesi', 'Mosaico resina', 'LED integrato'],
  },
  {
    id: 'k1',
    title: 'Camera con Cabina',
    category: 'Camera',
    city: 'Tivoli',
    year: 2024,
    surface: 22,
    duration: '5 settimane',
    budgetRange: '€ 12k – 16k',
    palette: { from: '#EFE6D8', to: '#6B5840', accent: '#F5B800' },
    description:
      'Camera matrimoniale con cabina armadio integrata, parete in boiserie e atmosfera nordica.',
    features: ['Cabina armadio', 'Boiserie su misura', 'Parquet listoni'],
  },
  {
    id: 'a3',
    title: 'Bilocale Centro',
    category: 'Intero Appartamento',
    city: 'Roma',
    year: 2024,
    surface: 65,
    duration: '3 mesi',
    budgetRange: '€ 50k – 65k',
    palette: { from: '#FFF0E0', to: '#A8744C', accent: '#F5B800' },
    description:
      'Bilocale in centro storico, ottimizzato negli spazi con soluzioni salvaspazio e parete attrezzata.',
    features: ['Parete attrezzata', 'Spazi ottimizzati', 'Toni caldi'],
  },
];

const CATEGORIES: Array<'Tutti' | Project['category']> = [
  'Tutti',
  'Intero Appartamento',
  'Cucina',
  'Bagno',
  'Camera',
];

// ────────────────────────────────────────────────────────────────────────────
// Placeholder visuale (al posto del render vero, in attesa delle immagini)
// ────────────────────────────────────────────────────────────────────────────
function RenderPlaceholder({
  palette,
  label,
  variant = 'after',
}: {
  palette: Project['palette'];
  label: string;
  variant?: 'before' | 'after';
}) {
  const before = variant === 'before';
  return (
    <div
      className="w-full h-full flex items-center justify-center relative overflow-hidden"
      style={{
        background: before
          ? 'repeating-linear-gradient(45deg, #2a2a2a 0 10px, #222 10px 20px)'
          : `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
      }}
    >
      <div className="text-center">
        <Box
          className={`w-12 h-12 mx-auto mb-2 ${before ? 'text-white/40' : 'text-white/80'}`}
        />
        <div className={`font-display text-lg font-bold ${before ? 'text-white/60' : 'text-white'}`}>
          {before ? 'Prima' : label}
        </div>
        {!before && (
          <div className="text-xs text-white/70 mt-1">Render — versione finale</div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Before / After slider
// ────────────────────────────────────────────────────────────────────────────
function BeforeAfter({ project }: { project: Project }) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);

  const updateFromClient = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, ratio)));
  };

  const onMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    updateFromClient(e.clientX);
  };

  const onTouch = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches[0]) updateFromClient(e.touches[0].clientX);
  };

  return (
    <div
      ref={ref}
      onMouseDown={(e) => updateFromClient(e.clientX)}
      onMouseMove={onMouseMove}
      onTouchStart={onTouch}
      onTouchMove={onTouch}
      className="relative aspect-video rounded-2xl overflow-hidden select-none cursor-ew-resize"
    >
      <RenderPlaceholder palette={project.palette} label={project.title} variant="after" />
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${pos}%` }}
      >
        <div className="w-[100vw] h-full">
          <RenderPlaceholder palette={project.palette} label={project.title} variant="before" />
        </div>
      </div>
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-[#F5B800] pointer-events-none"
        style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-1/2 left-1/2 w-11 h-11 -translate-x-1/2 -translate-y-1/2 bg-[#F5B800] rounded-full shadow-xl flex items-center justify-center text-[#1A1A1A] font-bold">
          ⇄
        </div>
      </div>
      <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
        Prima
      </div>
      <div className="absolute top-3 right-3 bg-[#F5B800] text-[#1A1A1A] text-xs px-2 py-1 rounded-full font-semibold">
        Dopo
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Tour 360 (cubo CSS — placeholder fino alle vere immagini panoramiche)
// ────────────────────────────────────────────────────────────────────────────
function VirtualTour({ project }: { project: Project }) {
  const [angle, setAngle] = useState(20);
  const faces = [
    { rot: 'rotateY(0deg)', label: 'Living' },
    { rot: 'rotateY(90deg)', label: 'Cucina' },
    { rot: 'rotateY(180deg)', label: 'Camera' },
    { rot: 'rotateY(-90deg)', label: 'Bagno' },
    { rot: 'rotateX(90deg)', label: 'Soffitto' },
    { rot: 'rotateX(-90deg)', label: 'Pavimento' },
  ];

  return (
    <div
      className="rounded-2xl py-10 px-4 relative overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at 50% 100%, rgba(245,184,0,0.08), transparent 60%), linear-gradient(#fafafa, #eee)',
        perspective: '1200px',
      }}
    >
      <div
        className="relative mx-auto"
        style={{
          width: 'min(300px, 65vw)',
          height: 'min(300px, 65vw)',
          transformStyle: 'preserve-3d',
          transform: `rotateY(${angle}deg) rotateX(-10deg)`,
          transition: 'transform 0.3s linear',
        }}
      >
        {faces.map((f, i) => (
          <div
            key={i}
            className="absolute inset-0 border border-white/40 flex items-center justify-center text-white font-bold font-display"
            style={{
              transform: `${f.rot} translateZ(min(150px, 32.5vw))`,
              background: `linear-gradient(135deg, ${project.palette.from}, ${project.palette.to})`,
            }}
          >
            {f.label}
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-center gap-2">
        <button
          onClick={() => setAngle(angle - 30)}
          className="w-10 h-10 rounded-full bg-white border border-[#E5E5E5] hover:bg-[#F5B800]/10 flex items-center justify-center"
          aria-label="Ruota a sinistra"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <input
          type="range"
          min={0}
          max={360}
          value={((angle % 360) + 360) % 360}
          onChange={(e) => setAngle(Number(e.target.value))}
          className="w-48"
        />
        <button
          onClick={() => setAngle(angle + 30)}
          className="w-10 h-10 rounded-full bg-white border border-[#E5E5E5] hover:bg-[#F5B800]/10 flex items-center justify-center"
          aria-label="Ruota a destra"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="text-center text-xs text-[#666666] mt-3">
        Tour interattivo — versione panoramica disponibile dopo realizzazione.
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Card progetto
// ────────────────────────────────────────────────────────────────────────────
function ProjectCard({
  project,
  onOpen,
}: {
  project: Project;
  onOpen: (p: Project) => void;
}) {
  return (
    <button
      onClick={() => onOpen(project)}
      className="text-left bg-white border border-[#E5E5E5] rounded-3xl overflow-hidden hover:border-[#F5B800]/40 hover:shadow-xl transition-all"
    >
      <div className="aspect-[4/3]">
        <RenderPlaceholder palette={project.palette} label={project.title} variant="after" />
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#F5B800] font-semibold">
            {project.category}
          </span>
          <span className="text-xs text-[#666666]">{project.year}</span>
        </div>
        <h3 className="font-display text-lg font-bold mb-1">{project.title}</h3>
        <div className="text-sm text-[#666666] mb-3">
          {project.city} · {project.surface} m² · {project.duration}
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#1A1A1A]">
          Esplora il progetto <ArrowRight className="w-4 h-4 text-[#F5B800]" />
        </span>
      </div>
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Modal di dettaglio
// ────────────────────────────────────────────────────────────────────────────
function ProjectModal({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'tour' | 'ba' | 'info'>('tour');

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white max-w-5xl w-full rounded-3xl shadow-2xl overflow-hidden my-4">
        <div className="flex items-center justify-between p-5 border-b border-[#E5E5E5]">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#F5B800] font-semibold">
              {project.category}
            </div>
            <h2 className="font-display text-2xl font-bold">{project.title}</h2>
            <div className="text-sm text-[#666666]">
              {project.city} · {project.surface} m² · {project.duration} · {project.budgetRange}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full border border-[#E5E5E5] hover:bg-[#F8F8F8] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pt-4 flex gap-2 border-b border-[#E5E5E5]">
          {(
            [
              { id: 'tour', label: 'Tour 360°', Icon: Maximize2 },
              { id: 'ba', label: 'Prima/Dopo', Icon: Sparkles },
              { id: 'info', label: 'Dettagli', Icon: Filter },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm border-b-2 -mb-px transition ${
                tab === t.id
                  ? 'border-[#F5B800] text-[#1A1A1A] font-semibold'
                  : 'border-transparent text-[#666666] hover:text-[#1A1A1A]'
              }`}
            >
              <t.Icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'tour' && <VirtualTour project={project} />}
          {tab === 'ba' && <BeforeAfter project={project} />}
          {tab === 'info' && (
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-display font-bold text-lg mb-2">Descrizione</h3>
                <p className="text-[#666666] text-sm leading-relaxed">{project.description}</p>
              </div>
              <div>
                <h3 className="font-display font-bold text-lg mb-2">Caratteristiche</h3>
                <ul className="space-y-2">
                  {project.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-[#1A1A1A]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F5B800]" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 bg-[#F8F8F8] border-t border-[#E5E5E5] flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-[#666666]">
            Vuoi un progetto simile? Configura il tuo preventivo o richiedi un render.
          </div>
          <div className="flex gap-2">
            <a
              href="#preventivo"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full border border-[#E5E5E5] hover:bg-white text-sm font-medium"
            >
              Preventivo Online
            </a>
            <a
              href="#crea-3d"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full bg-[#F5B800] hover:bg-[#D9A200] text-[#1A1A1A] text-sm font-semibold"
            >
              Crea il tuo 3D
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sezione principale
// ────────────────────────────────────────────────────────────────────────────
export default function Modelli3D() {
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>('Tutti');
  const [active, setActive] = useState<Project | null>(null);

  const filtered = PROJECTS.filter((p) => cat === 'Tutti' || p.category === cat);

  return (
    <section id="modelli-3d" className="pt-6 pb-12 lg:pt-8 lg:pb-16 bg-[#F8F8F8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="font-display text-4xl sm:text-5xl font-bold leading-tight">
            I nostri <span className="text-[#F5B800]">modelli 3D</span>
          </h2>
          <p className="text-[#666666] text-lg mt-3">
            Esplora i progetti realizzati: tour 360°, prima/dopo e dettagli costruttivi.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-4 py-2 rounded-full text-sm border transition ${
                cat === c
                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                  : 'bg-white border-[#E5E5E5] hover:border-[#F5B800]/40'
              }`}
            >
              {c}
            </button>
          ))}
          <span className="ml-auto text-sm text-[#666666] flex items-center gap-1">
            <LayoutGrid className="w-4 h-4" /> {filtered.length} progetti
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-[#666666]">
            Nessun progetto in questa categoria.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p) => (
              <ProjectCard key={p.id} project={p} onOpen={setActive} />
            ))}
          </div>
        )}

        {active && <ProjectModal project={active} onClose={() => setActive(null)} />}
      </div>
    </section>
  );
}
