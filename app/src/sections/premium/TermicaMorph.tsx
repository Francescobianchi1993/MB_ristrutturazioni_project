import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

/**
 * Morph "Dispersione termica → Involucro isolato" — il momento-firma della
 * sezione efficienza energetica. Visualizza la proposta di valore: una casa che
 * disperde calore (rosso, Classe G) si trasforma in un involucro isolato (verde,
 * Classe A) con un marker che scorre sulla scala G→A.
 *
 * - Si auto-riproduce una volta all'ingresso nel viewport (racconta la storia)
 * - Toggle "Prima / Dopo" per confrontare a piacere
 * - Manipola direttamente il DOM (no re-render per frame), rispetta reduced-motion
 *
 * Colori SEMANTICI da mappa termica (rosso/verde) dentro una sezione che resta
 * sulla palette brand. Isolato: usato solo dalla pagina di anteprima.
 */

const TICKS = ['G', 'F', 'E', 'D', 'C', 'B', 'A'];

export default function TermicaMorph() {
  const wrap = useRef<HTMLDivElement>(null);
  const heat = useRef<SVGGElement>(null);
  const cold = useRef<SVGGElement>(null);
  const warmth = useRef<SVGGElement>(null);
  const insul = useRef<SVGPathElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLDivElement>(null);

  const pRef = useRef(0);
  const tween = useRef<gsap.core.Tween | null>(null);
  const dashLen = useRef(0);
  const [mode, setMode] = useState<'prima' | 'dopo'>('prima');

  const apply = (p: number) => {
    if (heat.current) heat.current.style.opacity = String(1 - p);
    if (cold.current) cold.current.style.opacity = String(p);
    if (warmth.current) warmth.current.style.opacity = String(p);
    if (insul.current) insul.current.style.strokeDashoffset = String(dashLen.current * (1 - p));
    if (fill.current) fill.current.style.width = `${p * 100}%`;
    if (marker.current) marker.current.style.left = `${p * 100}%`;
  };

  const go = (to: number) => {
    tween.current?.kill();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      pRef.current = to;
      apply(to);
      return;
    }
    const o = { p: pRef.current };
    tween.current = gsap.to(o, {
      p: to,
      duration: 1.2,
      ease: 'power2.inOut',
      onUpdate: () => {
        pRef.current = o.p;
        apply(o.p);
      },
    });
  };

  useLayoutEffect(() => {
    if (insul.current) {
      dashLen.current = insul.current.getTotalLength();
      insul.current.style.strokeDasharray = String(dashLen.current);
    }
    apply(0);
  }, []);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries, obs) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        obs.disconnect();
        setMode('dopo');
        go(1);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toggle = (m: 'prima' | 'dopo') => {
    setMode(m);
    go(m === 'dopo' ? 1 : 0);
  };

  return (
    <div ref={wrap} className="w-full">
      <div className="relative overflow-hidden rounded-[1.5rem] border border-[#E5E5E5] bg-white p-4 shadow-[0_30px_80px_-40px_rgba(26,26,26,0.3)] sm:p-6">
        <svg viewBox="0 0 420 320" className="w-full" role="img" aria-label="Dispersione termica prima e isolamento dopo">
          <defs>
            <radialGradient id="redGlow" cx="50%" cy="48%" r="55%">
              <stop offset="0%" stopColor="#E8543B" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#E8543B" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="greenGlow" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#4F9E7F" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#4F9E7F" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="warmKeep" cx="50%" cy="55%" r="50%">
              <stop offset="0%" stopColor="#F5B800" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#F5B800" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* DISPERSIONE (rosso) */}
          <g ref={heat}>
            <rect x="40" y="20" width="340" height="250" fill="url(#redGlow)" />
            {/* onde di calore che escono dal tetto */}
            {[170, 200, 230].map((x, i) => (
              <path
                key={`r${i}`}
                d={`M${x},78 q8,-12 0,-24 q-8,-12 0,-24`}
                fill="none"
                stroke="#E8543B"
                strokeWidth="3"
                strokeLinecap="round"
              />
            ))}
            {/* dispersione laterale sinistra */}
            {[180, 215].map((y, i) => (
              <path
                key={`l${i}`}
                d={`M126,${y} q-12,-8 -24,0 q-12,8 -24,0`}
                fill="none"
                stroke="#F08A3C"
                strokeWidth="3"
                strokeLinecap="round"
              />
            ))}
            {/* dispersione laterale destra */}
            {[180, 215].map((y, i) => (
              <path
                key={`rr${i}`}
                d={`M294,${y} q12,-8 24,0 q12,8 24,0`}
                fill="none"
                stroke="#F08A3C"
                strokeWidth="3"
                strokeLinecap="round"
              />
            ))}
          </g>

          {/* EFFICIENTE (verde) — glow esterno calmo */}
          <g ref={cold} style={{ opacity: 0 }}>
            <rect x="60" y="40" width="300" height="230" fill="url(#greenGlow)" />
          </g>

          {/* CASA (neutra, sempre visibile) */}
          <g>
            {/* tetto */}
            <polygon points="118,164 210,86 302,164" fill="#F4EFE4" stroke="#1A1A1A" strokeWidth="2.5" strokeLinejoin="round" />
            {/* mura */}
            <rect x="132" y="164" width="156" height="106" fill="#FFFFFF" stroke="#1A1A1A" strokeWidth="2.5" />
            {/* comignolo */}
            <rect x="258" y="112" width="18" height="34" fill="#1A1A1A" />
            {/* porta */}
            <rect x="150" y="212" width="34" height="58" rx="2" fill="#1A1A1A" />
            <circle cx="178" cy="242" r="2.4" fill="#F5B800" />
            {/* finestra (calore trattenuto dentro) */}
            <g>
              <rect x="222" y="190" width="46" height="46" rx="2" fill="#F5B800" stroke="#1A1A1A" strokeWidth="2" />
              <line x1="245" y1="190" x2="245" y2="236" stroke="#1A1A1A" strokeWidth="2" />
              <line x1="222" y1="213" x2="268" y2="213" stroke="#1A1A1A" strokeWidth="2" />
            </g>
            {/* terreno */}
            <line x1="40" y1="270" x2="380" y2="270" stroke="#1A1A1A" strokeWidth="2.5" />
          </g>

          {/* calore TRATTENUTO dentro quando isolato */}
          <g ref={warmth} style={{ opacity: 0 }}>
            <ellipse cx="210" cy="220" rx="70" ry="46" fill="url(#warmKeep)" />
          </g>

          {/* INVOLUCRO isolato (verde) — si "disegna" col morph */}
          <path
            ref={insul}
            d="M132,270 L132,164 L210,86 L288,164 L288,270"
            fill="none"
            stroke="#4F9E7F"
            strokeWidth="9"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>

        {/* Scala G → A con marker che scorre */}
        <div className="mt-5 px-1">
          <div className="relative">
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#EFE7D2]">
              <div ref={fill} className="h-full rounded-full bg-gradient-to-r from-[#E8543B] via-[#F5B800] to-[#4F9E7F]" style={{ width: '0%' }} />
            </div>
            <div ref={marker} className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#1A1A1A] shadow-md" style={{ left: '0%' }} />
          </div>
          <div className="mt-2 flex justify-between text-[11px] font-bold tracking-wide text-[#999999]">
            {TICKS.map((t) => (
              <span key={t} className={t === 'G' ? 'text-[#E8543B]' : t === 'A' ? 'text-[#4F9E7F]' : ''}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Toggle Prima / Dopo */}
      <div className="mt-4 inline-flex rounded-full border border-[#E5E5E5] bg-white p-1 text-sm font-semibold">
        <button
          onClick={() => toggle('prima')}
          className={`rounded-full px-5 py-2 transition-colors ${mode === 'prima' ? 'bg-[#1A1A1A] text-white' : 'text-[#666666] hover:text-[#1A1A1A]'}`}
        >
          Prima · Classe G
        </button>
        <button
          onClick={() => toggle('dopo')}
          className={`rounded-full px-5 py-2 transition-colors ${mode === 'dopo' ? 'bg-[#F5B800] text-[#1A1A1A]' : 'text-[#666666] hover:text-[#1A1A1A]'}`}
        >
          Dopo · Classe A
        </button>
      </div>
    </div>
  );
}
