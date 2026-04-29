import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Home,
  MessageCircle,
  Wrench,
  ClipboardList,
  Box,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

// Ogni servizio porta direttamente alla sezione del sito che lo realizza,
// invece di duplicare info statiche con CTA generico verso i contatti.
const services = [
  {
    icon: Home,
    title: 'Ristrutturazioni Complete',
    description: 'Ristrutturazioni chiavi in mano, con zero pensieri e un\'unica soluzione per tutte le tue esigenze.',
    features: ['Chiavi in mano', 'Project management', 'Finanziamenti'],
    cta: 'Calcola il tuo preventivo',
    href: '#preventivo',
  },
  {
    icon: ClipboardList,
    title: 'Offerte su Misura',
    description: 'Configura il tuo intervento con il nostro preventivo guidato — dal singolo bagno alla casa intera.',
    features: ['Personalizzazione', 'Flessibilità', 'Trasparenza'],
    cta: 'Configura preventivo',
    href: '#preventivo',
  },
  {
    icon: Box,
    title: 'Progettazione 3D',
    description: 'Esplora i progetti realizzati e ricevi un render personalizzato del tuo spazio prima di iniziare.',
    features: ['Rendering 3D', 'Tour 360°', 'Before/After'],
    cta: 'Vedi i nostri progetti',
    href: '#modelli-3d',
  },
  {
    icon: Sparkles,
    title: 'Render personalizzato',
    description: 'Carica la tua planimetria e ricevi un render fotorealistico del risultato finale entro 48 ore.',
    features: ['Render 48h', 'Stile su misura', 'Gratuito'],
    cta: 'Crea il tuo render',
    href: '#crea-3d',
  },
  {
    icon: MessageCircle,
    title: 'Consulenza Gratuita',
    description: 'Sopralluogo gratuito con il nostro team. Pianifichiamo insieme tempi, materiali e budget.',
    features: ['Sopralluogo', 'Preventivo', 'Pianificazione'],
    cta: 'Prenota sopralluogo',
    href: '#contatti',
  },
  {
    icon: Wrench,
    title: 'Assistenza Tecnica',
    description: 'Servizio di assistenza sia ai privati che ai condomini, compreso il pronto intervento h24.',
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
      className="py-24 lg:py-32 bg-[#F8F8F8]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div ref={headerRef} className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 text-[#F5B800] font-semibold text-sm uppercase tracking-wider mb-4">
            <div className="w-8 h-0.5 bg-[#F5B800]" />
            I Nostri Servizi
            <div className="w-8 h-0.5 bg-[#F5B800]" />
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1A1A1A] mb-4">
            Soluzioni complete per{' '}
            <span className="text-[#F5B800]">ogni esigenza</span>
          </h2>
          <p className="text-[#666666] text-lg">
            Dalla consulenza iniziale alla consegna chiavi in mano, ti accompagniamo 
            in ogni fase del tuo progetto di ristrutturazione.
          </p>
        </div>

        {/* Services Grid — ogni card è un link diretto alla sezione corrispondente */}
        <div ref={cardsRef} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <a
              key={index}
              href={service.href}
              className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-transparent hover:border-[#F5B800]/40 cursor-pointer flex flex-col"
            >
              <div className="w-14 h-14 bg-[#F5B800]/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-[#F5B800] transition-colors duration-300">
                <service.icon className="w-7 h-7 text-[#F5B800] group-hover:text-[#1A1A1A] transition-colors duration-300" />
              </div>

              <h3 className="font-display text-xl font-semibold text-[#1A1A1A] mb-3">
                {service.title}
              </h3>
              <p className="text-[#666666] text-sm leading-relaxed mb-4">
                {service.description}
              </p>

              <ul className="space-y-2 mb-5">
                {service.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-[#666666]">
                    <div className="w-1.5 h-1.5 bg-[#F5B800] rounded-full" />
                    {feature}
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
