import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

/**
 * Numero che si "anima" al primo ingresso nel viewport (Tier 1 — credibilità).
 * Estrae il primo gruppo di cifre da `value` e anima 0→N mantenendo eventuale
 * prefisso/suffisso (es. "−60%", "+30%", "35+", "100%"). Se non c'è un numero
 * (es. "Classe A", "Detrazioni") mostra il valore statico. Rispetta
 * prefers-reduced-motion. Isolato: usato solo dalla pagina di anteprima.
 */
export default function CountUp({
  value,
  className,
  duration = 1.4,
}: {
  value: string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const match = value.match(/\d[\d.]*/);
  const [display, setDisplay] = useState(() => (match ? value.replace(match[0], '0') : value));

  useEffect(() => {
    if (!match) return;
    const el = ref.current;
    if (!el) return;

    const target = parseFloat(match[0]);
    const decimals = (match[0].split('.')[1] || '').length;
    const prefix = value.slice(0, match.index);
    const suffix = value.slice((match.index ?? 0) + match[0].length);
    const render = (n: number) => `${prefix}${n.toFixed(decimals)}${suffix}`;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(render(target));
      return;
    }

    const io = new IntersectionObserver(
      (entries, obs) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        obs.disconnect();
        const obj = { n: 0 };
        gsap.to(obj, {
          n: target,
          duration,
          ease: 'power2.out',
          onUpdate: () => setDisplay(render(obj.n)),
        });
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
