import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowUpRight, Phone, ShieldCheck, Leaf, Building2 } from 'lucide-react';
import { TEL_DISPLAY, TEL_HREF } from '@/lib/contatti';

gsap.registerPlugin(ScrollTrigger);

/**
 * HeroPremium — anteprima del riposizionamento "premium" di MB Ristrutturazioni.
 *
 * Estetica istituzionale (Apple/Netflix-like): antracite + panna, accento salvia
 * desaturato per richiamare efficienza energetica / "green". Tipografia Inter
 * gigante, ampi spazi bianchi, micro-interazioni legate allo scroll non invasive.
 *
 * COMPLETAMENTE ISOLATO: non importa né modifica nulla del sito in produzione.
 * Viene montato solo da /src/preview.tsx (entry preview.html).
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
      className="relative min-h-screen w-full overflow-hidden bg-[#13161A] text-[#F3EFE7] antialiased"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* Texture / glow di fondo, molto sobri */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 right-[-10%] h-[42rem] w-[42rem] rounded-full bg-[#93B3A3]/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] h-[36rem] w-[36rem] rounded-full bg-[#2A3138]/40 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(#F3EFE7 1px, transparent 1px), linear-gradient(90deg, #F3EFE7 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      {/* Top bar minimale */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 pt-6 sm:px-8 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#F3EFE7]/15 bg-[#F3EFE7]/[0.03] font-semibold tracking-tight">
            MB
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">MB Ristrutturazioni</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#93B3A3]">Roma · Premium</p>
          </div>
        </div>
        <a
          href={TEL_HREF}
          className="hidden items-center gap-2 rounded-full border border-[#F3EFE7]/15 px-4 py-2 text-sm text-[#C9C7C0] transition-colors hover:border-[#93B3A3]/50 hover:text-[#F3EFE7] sm:flex"
        >
          <Phone className="h-4 w-4 text-[#93B3A3]" />
          {TEL_DISPLAY}
        </a>
      </header>

      {/* Hero grid */}
      <section className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-10 lg:pt-20">
        {/* Colonna testo */}
        <div>
          <div
            data-anim="eyebrow"
            className="mb-7 inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.22em] text-[#93B3A3]"
          >
            <span className="h-px w-9 bg-[#93B3A3]" />
            Ristrutturazioni chiavi in mano
          </div>

          <h1 className="font-semibold leading-[0.98] tracking-[-0.03em] text-[2.75rem] xs:text-5xl sm:text-6xl lg:text-[4.6rem]">
            <span className="block overflow-hidden">
              <span data-anim="line" className="block">
                Solidità che
              </span>
            </span>
            <span className="block overflow-hidden">
              <span data-anim="line" className="block">
                si vede. <span className="text-[#93B3A3]">Tecnologia</span>
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
            className="mt-7 max-w-md text-base leading-relaxed text-[#C9C7C0] sm:text-lg"
          >
            Riqualifichiamo immobili ad alta efficienza energetica con un metodo
            preciso e trasparente. Estetica, comfort e valore che durano nel tempo.
          </p>

          {/* CTA */}
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              data-anim="cta"
              href="#contatti"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#93B3A3] px-7 py-4 text-sm font-semibold text-[#13161A] transition-all hover:bg-[#A8C7B8] hover:shadow-[0_12px_40px_-12px_rgba(147,179,163,0.6)]"
            >
              Richiedi un sopralluogo
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
            <a
              data-anim="cta"
              href="#metodo"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#F3EFE7]/20 px-7 py-4 text-sm font-semibold text-[#F3EFE7] transition-colors hover:border-[#F3EFE7]/45"
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
                className="flex items-center gap-2 text-sm text-[#C9C7C0]"
              >
                <Icon className="h-4 w-4 text-[#93B3A3]" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Colonna visual */}
        <div className="relative">
          <div
            data-anim="visual"
            className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.75rem] border border-[#F3EFE7]/10 bg-[#1C2024] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.8)] sm:aspect-[3/4]"
          >
            <img
              data-anim="visual-img"
              src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80"
              alt="Interno residenziale ristrutturato di alta gamma"
              loading="eager"
              className="absolute inset-0 h-[112%] w-full object-cover"
            />
            {/* Gradiente per leggibilità e tono antracite */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#13161A] via-[#13161A]/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#13161A]/30 to-transparent" />

            {/* Badge efficienza energetica */}
            <div
              data-anim="badge"
              className="absolute bottom-5 left-5 right-5 flex items-center justify-between rounded-2xl border border-[#F3EFE7]/12 bg-[#13161A]/70 px-5 py-4 backdrop-blur-md"
            >
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#93B3A3]">
                  Efficienza energetica
                </p>
                <p className="mt-1 text-lg font-semibold tracking-tight">
                  Salto di 2 classi garantito
                </p>
              </div>
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#93B3A3] text-xl font-bold text-[#13161A]">
                A
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Striscia statistiche */}
      <section className="relative z-10 border-t border-[#F3EFE7]/10">
        <div className="mx-auto grid max-w-7xl grid-cols-3 divide-x divide-[#F3EFE7]/10 px-5 sm:px-8 lg:px-10">
          {stats.map((s) => (
            <div key={s.label} data-anim="stat" className="px-3 py-7 text-center sm:py-9">
              <p className="text-2xl font-semibold tracking-tight text-[#F3EFE7] sm:text-4xl">
                {s.value}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[#8A8F8B] sm:text-xs">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
