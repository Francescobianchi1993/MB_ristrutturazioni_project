import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MoveHorizontal } from 'lucide-react';
import SplitReveal from './SplitReveal';

gsap.registerPlugin(ScrollTrigger);

/**
 * Slider "Prima / Dopo" curato (anteprima premium) — palette del sito attuale.
 *
 * Stesso scatto su due livelli: il livello "Prima" è filtrato (desaturato/cupo)
 * per leggere come ambiente datato, il livello "Dopo" è a colori pieni. Si
 * trascina la maniglia per confrontare. Self-contained: niente librerie esterne,
 * pointer events nativi, accessibile da tastiera. Non tocca la produzione.
 */

const IMG =
  'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=80';

export default function PrimaDopo() {
  const root = useRef<HTMLElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [pos, setPos] = useState(50);

  const setFromClientX = useCallback((clientX: number) => {
    const el = frame.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const p = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, p)));
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 28,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%' },
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      id="metodo"
      className="relative overflow-hidden bg-white px-5 py-24 text-[#1A1A1A] sm:px-8 lg:px-10 lg:py-32"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      <div className="pointer-events-none absolute -top-24 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[#F5B800]/10 blur-[120px]" />

      <div className="relative mx-auto max-w-5xl">
        <div className="max-w-2xl">
          <div
            data-reveal
            className="mb-6 inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.22em] text-[#D9A200]"
          >
            <span className="h-px w-9 bg-[#D9A200]" />
            Il nostro metodo · Prima / Dopo
          </div>
          <SplitReveal
            className="font-display text-4xl font-bold leading-[1.05] tracking-[-0.02em] sm:text-5xl lg:text-[3.6rem]"
            segments={[
              { text: 'La precisione che' },
              { text: 'trasforma', accent: true },
              { text: 'gli ambienti.' },
            ]}
          />
          <p data-reveal className="mt-6 text-base leading-relaxed text-[#666666] sm:text-lg">
            Ogni cantiere segue un processo controllato in ogni fase. Trascina la maniglia
            per vedere la differenza.
          </p>
        </div>

        {/* Comparatore */}
        <div
          data-reveal
          ref={frame}
          className="relative mt-12 aspect-[16/10] w-full cursor-ew-resize select-none overflow-hidden rounded-[1.75rem] border border-[#E5E5E5] bg-[#F8F8F8] shadow-[0_40px_120px_-45px_rgba(26,26,26,0.4)]"
          onPointerDown={(e) => {
            dragging.current = true;
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            setFromClientX(e.clientX);
          }}
          onPointerMove={(e) => dragging.current && setFromClientX(e.clientX)}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
        >
          {/* DOPO — colori pieni (livello di fondo) */}
          <img
            src={IMG}
            alt="Ambiente dopo la ristrutturazione"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
          {/* PRIMA — stesso scatto, filtrato (livello superiore, ritagliato a sinistra) */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
          >
            <img
              src={IMG}
              alt="Ambiente prima della ristrutturazione"
              className="h-full w-full object-cover"
              style={{ filter: 'grayscale(0.7) brightness(0.72) contrast(0.92) sepia(0.12)' }}
              draggable={false}
            />
            <div className="absolute inset-0 bg-[#1A1A1A]/10" />
          </div>

          {/* Etichette */}
          <span className="pointer-events-none absolute left-4 top-4 rounded-full border border-[#E5E5E5] bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1A1A1A] backdrop-blur-sm">
            Prima
          </span>
          <span className="pointer-events-none absolute right-4 top-4 rounded-full bg-[#F5B800] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1A1A1A]">
            Dopo
          </span>

          {/* Maniglia */}
          <div
            className="pointer-events-none absolute inset-y-0 w-px bg-white"
            style={{ left: `${pos}%` }}
          >
            <div className="absolute top-1/2 left-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#E5E5E5] bg-white text-[#1A1A1A] shadow-lg">
              <MoveHorizontal className="h-5 w-5" />
            </div>
          </div>

          {/* Slider accessibile (tastiera) sovrapposto e invisibile */}
          <input
            type="range"
            min={0}
            max={100}
            value={pos}
            onChange={(e) => setPos(Number(e.target.value))}
            aria-label="Confronto prima e dopo"
            className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
          />
        </div>
      </div>
    </section>
  );
}
