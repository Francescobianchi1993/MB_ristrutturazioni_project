import { useEffect, useRef, type ElementType } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export type Segment = { text: string; accent?: boolean };

/**
 * Titolo che si rivela parola-per-parola allo scroll-in (Tier 1).
 * Niente clipping dei discendenti: stagger di opacity + y, robusto su mobile.
 * `segments` permette di evidenziare alcune parole con l'oro brand.
 * Isolato: usato solo dalla pagina di anteprima.
 */
export default function SplitReveal({
  segments,
  as = 'h2',
  className,
}: {
  segments: Segment[];
  as?: ElementType;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const Tag = as as ElementType;

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.from('[data-word]', {
        opacity: 0,
        yPercent: 70,
        duration: 0.7,
        ease: 'power3.out',
        stagger: 0.05,
        scrollTrigger: { trigger: el, start: 'top 85%' },
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <Tag ref={ref} className={className}>
      {segments.map((seg, si) =>
        seg.text.split(' ').map((word, wi) => (
          <span key={`${si}-${wi}`} className="inline-block overflow-hidden align-bottom">
            <span
              data-word
              className={`inline-block ${seg.accent ? 'text-[#F5B800]' : ''}`}
            >
              {word}&nbsp;
            </span>
          </span>
        )),
      )}
    </Tag>
  );
}
