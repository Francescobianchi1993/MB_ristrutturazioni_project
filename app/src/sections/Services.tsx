import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Home,
  MessageCircle,
  Wrench,
  Box,
  ArrowRight,
} from 'lucide-react';
import Stats from './Stats';

gsap.registerPlugin(ScrollTrigger);

// Ogni servizio porta direttamente alla sezione del sito che lo realizza,
// invece di duplicare info statiche con CTA generico verso i contatti.
const services = [
  {
    icon: Home,
    title: 'Preventivo personalizzato',
    description: 'Configuri online, vedi subito i costi. Dalla piccola riparazione alla ristrutturazione completa, senza sorprese.',
    features: ['Tutto online, in pochi minuti', 'Costi visibili in anticipo', 'Dal piccolo intervento alla grande ristrutturazione'],
    cta: 'Calcola il tuo preventivo',
    href: '#preventivo',
  },
  {
    icon: Box,
    title: 'Progettazione & Render 3D',
    description: 'Esplora i nostri progetti realizzati con tour 360° o ricevi un render fotorealistico della tua planimetria in 48h.',
    features: ['Tour 360° dei progetti', 'Render della tua casa', 'Before / After'],
    cta: 'Vedi progetti & render',
    href: '#modelli-3d',
  },
  {
    icon: MessageCircle,
    title: 'Sopralluogo\ngratuito',
    description: 'Con un membro del nostro team pianifichiamo insieme tutte le esigenze: tempi, materiali, budget.',
    features: ['Sopralluogo', 'Preventivo', 'Pianificazione'],
    cta: 'Prenota sopralluogo',
    href: '#contatti',
  },
  {
    icon: Wrench,
    title: 'Assistenza\nPronto intervento',
    description: 'Servizio di assistenza sia privati che ai condomini. Pronto intervento.\n ',
    features: ['Pronto intervento', 'Manutenzione', 'Riparazioni'],
    cta: 'Richiedi assistenza',
    href: '#contatti',
  },
];

export default function Services() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header animation
      if (headerRef.current) {
        gsap.fromTo(
          headerRef.current.children,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
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

      // Cards animation
      if (cardsRef.current) {
        const cards = cardsRef.current.children;
        gsap.fromTo(
          cards,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: cardsRef.current,
              start: 'top 80%',
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
      id="servizi"
      ref={sectionRef}
      className="pb-16 lg:pb-20 bg-[#F8F8F8]"
    >
      {/* Stats dark band — full-width edge-to-edge, riempie lo spazio sopra
          l'header e fa da social-proof prima del titolo Servizi */}
      <div className="bg-[#1A1A1A] py-5 lg:py-6 mb-10 lg:mb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Stats />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div ref={headerRef} className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 text-[#F5B800] font-semibold text-sm uppercase tracking-wider mb-4">
            <div className="w-8 h-0.5 bg-[#F5B800]" />
            I Nostri Servizi
            <div className="w-8 h-0.5 bg-[#F5B800]" />
          </div>
          <h2 className="font-display text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1A1A1A] mb-4">
            Soluzioni complete per{' '}
            <span className="text-[#F5B800]">ogni esigenza</span>
          </h2>
          <p className="text-[#666666] text-lg">
            Dalla consulenza iniziale alla consegna chiavi in mano, ti accompagniamo 
            in ogni fase del tuo progetto di ristrutturazione.
          </p>
        </div>

        {/* Services Grid — ogni card è un link diretto alla sezione corrispondente. */}
        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <a
              key={index}
              href={service.href}
              className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-transparent hover:border-[#F5B800]/40 cursor-pointer flex flex-col"
            >
              <div className="w-14 h-14 bg-[#F5B800]/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-[#F5B800] transition-colors duration-300">
                <service.icon className="w-7 h-7 text-[#F5B800] group-hover:text-[#1A1A1A] transition-colors duration-300" />
              </div>

              <h3 className="font-display text-lg xs:text-xl font-semibold text-[#1A1A1A] mb-3 whitespace-pre-line">
                {service.title}
              </h3>
              <p className="text-[#666666] text-sm leading-relaxed mb-4 whitespace-pre-line">
                {service.description}
              </p>

              <ul className="space-y-2 mb-5">
                {service.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-[#666666]">
                    <div className="w-1.5 h-1.5 bg-[#F5B800] rounded-full flex-shrink-0 mt-[7px]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <span className="mt-auto inline-flex items-center gap-2 text-[#F5B800] font-semibold text-sm">
                {service.cta}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
