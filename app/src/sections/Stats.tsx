import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const stats = [
  { value: 35, suffix: '+', label: 'Anni di Esperienza' },
  { value: 500, suffix: '+', label: 'Progetti Completati' },
  { value: 100, suffix: '%', label: 'Clienti Soddisfatti' },
  { value: 24, suffix: '/7', label: 'Assistenza Disponibile' },
];

function AnimatedNumber({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const numberRef = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!numberRef.current || hasAnimated.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;

            const obj = { val: 0 };
            gsap.to(obj, {
              val: value,
              duration: 2,
              ease: 'power2.out',
              onUpdate: () => {
                setCount(Math.round(obj.val));
              },
            });
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(numberRef.current);

    return () => observer.disconnect();
  }, [value]);

  return (
    <span
      ref={numberRef}
      className="font-display text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-bold text-[#F5B800]"
    >
      {count}
      {suffix}
    </span>
  );
}

// Embeddable stats bar — niente <section> wrapper, eredita BG dalla sezione padre.
export default function Stats() {
  const blockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        blockRef.current,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.6,
          scrollTrigger: {
            trigger: blockRef.current,
            start: 'top 90%',
            toggleActions: 'play none none none',
          },
        }
      );
    }, blockRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={blockRef}
      className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12"
    >
      {stats.map((stat, index) => (
        <div key={index} className="text-center">
          <AnimatedNumber value={stat.value} suffix={stat.suffix} />
          <p className="text-white/70 text-sm mt-2">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
