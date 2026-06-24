import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Layers, Frame, Wind, Sun, Gauge, TrendingUp, Percent } from 'lucide-react';
import SplitReveal from './SplitReveal';
import CountUp from './CountUp';
import TermicaMorph from './TermicaMorph';

gsap.registerPlugin(ScrollTrigger);

/**
 * Sezione "Efficienza Energetica & Riqualificazione" (anteprima premium).
 * Palette del sito attuale (bianco / oro #F5B800 / antracite #1A1A1A / panna
 * #FFF8E7). Centro della sezione: la morph termica dispersione→isolamento.
 * Isolata: usata solo dalla pagina di anteprima, non tocca la produzione.
 */

const soluzioni = [
  { icon: Layers, title: 'Cappotto termico', desc: 'Isolamento dell’involucro per eliminare dispersioni e ponti termici.' },
  { icon: Frame, title: 'Infissi a taglio termico', desc: 'Serramenti ad alte prestazioni: meno freddo, meno rumore, più comfort.' },
  { icon: Wind, title: 'Pompa di calore', desc: 'Climatizzazione efficiente tutto l’anno, addio caldaia a gas.' },
  { icon: Sun, title: 'Fotovoltaico & accumulo', desc: 'Energia autoprodotta e immagazzinata: bollette ridotte al minimo.' },
];

const numeri = [
  { icon: Gauge, value: '−60%', label: 'Consumi energetici' },
  { icon: TrendingUp, value: '+30%', label: 'Valore dell’immobile' },
  { icon: Percent, value: 'Detrazioni', label: 'Pratiche incluse' },
];

export default function EfficienzaEnergetica() {
  const root = useRef<HTMLElement>(null);

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
      id="efficienza"
      className="relative bg-[#FFF8E7] px-5 py-24 text-[#1A1A1A] sm:px-8 lg:px-10 lg:py-32"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      <div className="mx-auto max-w-7xl">
        {/* Intestazione */}
        <div className="max-w-3xl">
          <div
            data-reveal
            className="mb-6 inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.22em] text-[#D9A200]"
          >
            <span className="h-px w-9 bg-[#D9A200]" />
            Efficienza energetica & riqualificazione
          </div>
          <SplitReveal
            className="font-display text-4xl font-bold leading-[1.05] tracking-[-0.02em] sm:text-5xl lg:text-[3.6rem]"
            segments={[
              { text: 'Dalla classe G alla classe A.' },
              { text: 'Senza compromessi.', accent: true },
            ]}
          />
          <p data-reveal className="mt-6 max-w-2xl text-base leading-relaxed text-[#666666] sm:text-lg">
            Progettiamo la riqualificazione come un sistema: involucro, impianti ed
            energia lavorano insieme per ridurre i consumi, aumentare il comfort e far
            crescere il valore del tuo immobile nel tempo.
          </p>
        </div>

        {/* Morph termica + soluzioni */}
        <div className="mt-14 grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Sinistra: la morph (momento-firma) */}
          <div data-reveal>
            <TermicaMorph />
            <p className="mt-4 text-xs uppercase tracking-[0.16em] text-[#999999]">
              Dispersione termica → involucro isolato · salto medio garantito ≥ 2 classi
            </p>
          </div>

          {/* Destra: card soluzioni 2×2 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {soluzioni.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                data-reveal
                className="group rounded-2xl border border-[#E5E5E5] bg-white p-6 transition-all hover:border-[#F5B800] hover:shadow-[0_20px_50px_-25px_rgba(245,184,0,0.55)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5B800]/15 text-[#D9A200] transition-colors group-hover:bg-[#F5B800] group-hover:text-[#1A1A1A]">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-lg font-bold tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#666666]">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Numeri (count-up) */}
        <div className="mt-16 grid grid-cols-1 divide-y divide-[#E5E5E5] overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {numeri.map(({ icon: Icon, value, label }) => (
            <div key={label} data-reveal className="flex items-center gap-4 p-6 sm:p-7">
              <Icon className="h-7 w-7 flex-shrink-0 text-[#F5B800]" />
              <div>
                <CountUp value={value} className="font-display text-2xl font-bold tracking-tight" />
                <p className="text-sm text-[#666666]">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
