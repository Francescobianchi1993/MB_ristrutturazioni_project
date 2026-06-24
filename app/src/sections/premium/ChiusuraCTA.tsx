import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Phone } from 'lucide-react';
import { TEL_DISPLAY, TEL_HREF } from '@/lib/contatti';
import SplitReveal from './SplitReveal';

gsap.registerPlugin(ScrollTrigger);

/**
 * Banda CTA di chiusura + footer minimale (anteprima premium).
 * Fondo antracite #1A1A1A (colore brand "secondary") + accento oro #F5B800.
 * Isolata: non tocca nulla del sito in produzione.
 */
export default function ChiusuraCTA() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 26,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%' },
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      id="contatti"
      className="relative overflow-hidden bg-[#1A1A1A] px-5 py-24 text-white sm:px-8 lg:px-10 lg:py-32"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute bottom-[-30%] right-[-10%] h-[40rem] w-[40rem] rounded-full bg-[#F5B800]/15 blur-[130px]" />
      </div>

      <div className="relative mx-auto max-w-4xl text-center">
        <SplitReveal
          className="mx-auto block max-w-3xl font-display text-4xl font-bold leading-[1.06] tracking-[-0.02em] sm:text-5xl lg:text-[3.8rem]"
          segments={[{ text: 'Pronto a dare valore al tuo immobile?' }]}
        />
        <p data-reveal className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[#CCCCCC] sm:text-lg">
          Un sopralluogo tecnico gratuito è il primo passo. Analizziamo lo stato dei
          luoghi e ti proponiamo la soluzione su misura.
        </p>

        <div data-reveal className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={TEL_HREF}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#F5B800] px-7 py-4 text-sm font-semibold text-[#1A1A1A] transition-all hover:bg-[#D9A200] hover:shadow-[0_12px_40px_-12px_rgba(245,184,0,0.6)] sm:w-auto"
          >
            Richiedi un sopralluogo
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <a
            href={TEL_HREF}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/25 px-7 py-4 text-sm font-semibold text-white transition-colors hover:border-[#F5B800] sm:w-auto"
          >
            <Phone className="h-4 w-4 text-[#F5B800]" />
            {TEL_DISPLAY}
          </a>
        </div>
      </div>

      {/* Footer minimale */}
      <div className="relative mx-auto mt-24 max-w-7xl border-t border-white/10 pt-8">
        <div className="flex flex-col items-center justify-between gap-4 text-sm text-[#999999] sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-xs font-semibold text-white">
              MB
            </div>
            <span>MB Ristrutturazioni — Roma e provincia</span>
          </div>
          <span className="text-xs uppercase tracking-[0.16em]">Anteprima concept · 2026</span>
        </div>
      </div>
    </section>
  );
}
