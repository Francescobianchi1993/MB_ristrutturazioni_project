import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Check, Shield, Clock, Users, Award, Headphones } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: Shield,
    title: 'Certificazioni Complete',
    description: 'Tutte le certificazioni richieste e regolari per operare in sicurezza.',
  },
  {
    icon: Clock,
    title: 'Velocità Garantita',
    description: 'Completiamo i lavori nei tempi concordati, senza ritardi.',
  },
  {
    icon: Users,
    title: 'Solo Artigiani Qualificati',
    description: 'Team di professionisti esperti con anni di esperienza nel settore.',
  },
  {
    icon: Award,
    title: 'Materiali di Prima Qualità',
    description: 'Utilizziamo solo materiali certificati e di alta qualità.',
  },
  {
    icon: Headphones,
    title: 'Assistenza Post-Lavoro',
    description: 'Supporto continuo anche dopo il completamento dei lavori.',
  },
];

export default function WhyChooseUs() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Content animation
      if (contentRef.current) {
        gsap.fromTo(
          contentRef.current.children,
          { opacity: 0, x: -30 },
          {
            opacity: 1,
            x: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 70%',
              toggleActions: 'play none none none',
            },
          }
        );
      }

      // Features animation
      if (featuresRef.current) {
        const items = featuresRef.current.children;
        gsap.fromTo(
          items,
          { opacity: 0, x: 30 },
          {
            opacity: 1,
            x: 0,
            duration: 0.5,
            stagger: 0.12,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 60%',
              toggleActions: 'play none none none',
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-24 lg:py-32 bg-white overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Content Side */}
          <div ref={contentRef} className="space-y-6">
            <div className="inline-flex items-center gap-2 text-[#F5B800] font-semibold text-sm uppercase tracking-wider">
              <div className="w-8 h-0.5 bg-[#F5B800]" />
              Perché Sceglierci
            </div>

            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1A1A1A] leading-tight">
              Qualità e{' '}
              <span className="text-[#F5B800]">Sicurezza</span>
            </h2>

            <p className="text-[#666666] text-lg leading-relaxed">
              Il dettaglio fa la differenza. Scegliendo MB Ristrutturazioni avrai 
              il massimo della qualità dell'artigianato italiano e la sicurezza di 
              un risultato garantito.
            </p>

            <div className="bg-[#F8F8F8] rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#F5B800] rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-6 h-6 text-[#1A1A1A]" />
                </div>
                <div>
                  <p className="font-semibold text-[#1A1A1A] mb-1">
                    Garanzia Soddisfatto o Rimborsato
                  </p>
                  <p className="text-sm text-[#666666]">
                    Se non sei soddisfatto del nostro lavoro, ti rimborsiamo. 
                    La tua fiducia è la nostra priorità.
                  </p>
                </div>
              </div>
            </div>

            {/* Decorative image */}
            <div className="relative mt-8 hidden lg:block">
              <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-64 h-64 bg-[#F5B800]/10 rounded-full blur-3xl" />
              <img
                src="/marco-bianchi.png"
                alt="MB Ristrutturazioni"
                className="relative rounded-2xl shadow-lg w-48 h-48 object-cover object-top"
              />
            </div>
          </div>

          {/* Features Side */}
          <div ref={featuresRef} className="space-y-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group flex items-start gap-4 bg-[#F8F8F8] hover:bg-white p-5 rounded-2xl transition-all duration-300 hover:shadow-lg border border-transparent hover:border-[#F5B800]/20"
              >
                <div className="w-12 h-12 bg-[#F5B800]/10 group-hover:bg-[#F5B800] rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-300">
                  <feature.icon className="w-6 h-6 text-[#F5B800] group-hover:text-[#1A1A1A] transition-colors duration-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1A1A1A] mb-1 group-hover:text-[#F5B800] transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-[#666666] leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
