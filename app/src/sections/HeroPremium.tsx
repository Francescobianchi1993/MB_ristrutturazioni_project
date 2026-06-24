import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Phone, ShieldCheck, Leaf, Building2 } from 'lucide-react';
import { TEL_DISPLAY, TEL_HREF } from '@/lib/contatti';

gsap.registerPlugin(ScrollTrigger);

/**
 * HeroPremium — anteprima del riposizionamento "premium" di MB Ristrutturazioni.
 *
 * Layout/tipografia/animazioni in chiave premium (Apple/Netflix-like), ma con la
 * PALETTE DEL SITO ATTUALE (bianco / oro #F5B800 / antracite #1A1A1A / panna
 * #FFF8E7) per un confronto reale a parità di brand. Titoli in Playfair Display
 * (regola h1..h6 di index.css), testo Inter.
 *
 * COMPLETAMENTE ISOLATO: non importa né modifica nulla del sito in produzione.
 * Viene montato solo dalla pagina di anteprima (entry preview.html).
 */

const stats = [
  { value: '35+', label: 'Anni di esperienza' },
  { value: 'Classe A', label: 'Salto energetico' },
  { value: '100%', label: 'Chiavi in mano' },
];

const pillars = [
  { icon: Building2, label: 'Solidità' },
  { icon: Leaf, label: 'Efficienza' },
  { icon: ShieldCheck, label: 'Sicurezza' },
];

export default function HeroPremium() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.from('[data-anim="eyebrow"]', { opacity: 0, y: 18, duration: 0.6 }, 0.1)
        .from(
          '[data-anim="line"]',
          { yPercent: 115, duration: 0.95, stagger: 0.12, ease: 'power4.out' },
          0.2,
        )
        .from('[data-anim="lead"]', { opacity: 0, y: 24, duration: 0.7 }, 0.6)
        .from('[data-anim="cta"]', { opacity: 0, y: 20, duration: 0.6, stagger: 0.1 }, 0.75)
        .from('[data-anim="pillar"]', { opacity: 0, y: 16, duration: 0.5, stagger: 0.08 }, 0.85)
        .from(
          '[data-anim="visual"]',
          { opacity: 0, scale: 1.06, duration: 1.2, ease: 'power3.out' },
          0.35,
        )
        .from('[data-anim="badge"]', { opacity: 0, y: 24, duration: 0.7 }, 1.0)
        .from(
          '[data-anim="stat"]',
          { opacity: 0, y: 20, duration: 0.6, stagger: 0.12 },
          0.95,
        );

      // Parallax leggero sull'immagine: avanguardia senza effetti pacchiani.
      gsap.to('[data-anim="visual-img"]', {
        yPercent: -8,
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.6,
        },
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={root}
      className="relative min-h-screen w-full overflow-hidden bg-white text-[#1A1A1A] antialiased"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* Texture / glow di fondo, molto sobri (palette brand) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 right-[-10%] h-[42rem] w-[42rem] rounded-full bg-[#F5B800]/10 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[36rem] w-[36rem] rounded-full bg-[#FFF8E7] blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#1A1A1A 1px, transparent 1px), linear-gradient(90deg, #1A1A1A 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      {/* Top bar minimale */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 pt-6 sm:px-8 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5E5E5] bg-[#F8F8F8] font-semibold tracking-tight">
            MB
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">MB Ristrutturazioni</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#F5B800]">Roma · Premium</p>
          </div>
        </div>
        <a
          href={TEL_HREF}
          className="hidden items-center gap-2 rounded-full border border-[#E5E5E5] px-4 py-2 text-sm text-[#666666] transition-colors hover:border-[#F5B800] hover:text-[#1A1A1A] sm:flex"
        >
          <Phone className="h-4 w-4 text-[#F5B800]" />
          {TEL_DISPLAY}
        </a>
      </header>

      {/* Hero grid */}
      <section className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-10 lg:pt-20">
        {/* Colonna testo */}
        <div>
          <div
            data-anim="eyebrow"
            className="mb-7 inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.22em] text-[#F5B800]"
          >
            <span className="h-px w-9 bg-[#F5B800]" />
            Ristrutturazioni chiavi in mano
          </div>

          <h1 className="font-display font-bold leading-[1.0] tracking-[-0.02em] text-[2.75rem] xs:text-5xl sm:text-6xl lg:text-[4.6rem]">
            <span className="block overflow-hidden">
              <span data-anim="line" className="block">
                Solidità che
              </span>
            </span>
            <span className="block overflow-hidden">
              <span data-anim="line" className="block">
                si vede. <span className="text-[#F5B800]">Tecnologia</span>
              </span>
            </span>
            <span className="block overflow-hidden">
              <span data-anim="line" className="block">
                che si sente.
              </span>
            </span>
          </h1>

          <p
            data-anim="lead"
            className="mt-7 max-w-md text-base leading-relaxed text-[#666666] sm:text-lg"
          >
            Riqualifichiamo immobili ad alta efficienza energetica con un metodo
            preciso e trasparente. Estetica, comfort e valore che durano nel tempo.
          </p>

          {/* CTA */}
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              data-anim="cta"
              href="#contatti"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#F5B800] px-7 py-4 text-sm font-semibold text-[#1A1A1A] transition-all hover:bg-[#D9A200] hover:shadow-[0_12px_40px_-12px_rgba(245,184,0,0.6)]"
            >
              Richiedi un sopralluogo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              data-anim="cta"
              href="#metodo"
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#1A1A1A] px-7 py-[14px] text-sm font-semibold text-[#1A1A1A] transition-colors hover:bg-[#1A1A1A] hover:text-white"
            >
              Scopri il metodo
            </a>
          </div>

          {/* Pilastri valoriali */}
          <div className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-3">
            {pillars.map(({ icon: Icon, label }) => (
              <div
                key={label}
                data-anim="pillar"
                className="flex items-center gap-2 text-sm text-[#666666]"
              >
                <Icon className="h-4 w-4 text-[#F5B800]" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Colonna visual */}
        <div className="relative">
          <div
            data-anim="visual"
            className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.75rem] border border-[#E5E5E5] bg-[#F8F8F8] shadow-[0_40px_120px_-40px_rgba(26,26,26,0.35)] sm:aspect-[3/4]"
          >
            <img
              data-anim="visual-img"
              src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80"
              alt="Interno residenziale ristrutturato di alta gamma"
              loading="eager"
              className="absolute inset-0 h-[112%] w-full object-cover"
            />
            {/* Gradiente per leggibilità del badge */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/55 via-transparent to-transparent" />

            {/* Badge efficienza energetica */}
            <div
              data-anim="badge"
              className="absolute bottom-5 left-5 right-5 flex items-center justify-between rounded-2xl border border-white/60 bg-white/85 px-5 py-4 backdrop-blur-md"
            >
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#D9A200]">
                  Efficienza energetica
                </p>
                <p className="mt-1 text-lg font-semibold tracking-tight text-[#1A1A1A]">
                  Salto di 2 classi garantito
                </p>
              </div>
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#F5B800] text-xl font-bold text-[#1A1A1A]">
                A
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Striscia statistiche */}
      <section className="relative z-10 border-t border-[#E5E5E5]">
        <div className="mx-auto grid max-w-7xl grid-cols-3 divide-x divide-[#E5E5E5] px-5 sm:px-8 lg:px-10">
          {stats.map((s) => (
            <div key={s.label} data-anim="stat" className="px-3 py-7 text-center sm:py-9">
              <p className="font-display text-2xl font-bold tracking-tight text-[#1A1A1A] sm:text-4xl">
                {s.value}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[#666666] sm:text-xs">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
