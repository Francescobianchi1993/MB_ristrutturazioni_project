import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Quote, Award, Users, Clock } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export default function About() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Image animation
      if (imageRef.current) {
        gsap.fromTo(
          imageRef.current,
          { opacity: 0, x: -50 },
          {
            opacity: 1,
            x: 0,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 70%',
              toggleActions: 'play none none none',
            },
          }
        );
      }

      // Content animation
      if (contentRef.current) {
        const elements = contentRef.current.children;
        gsap.fromTo(
          elements,
          { opacity: 0, x: 50 },
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
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="chi-siamo"
      ref={sectionRef}
      className="py-24 lg:py-32 bg-white"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Image Side */}
          <div ref={imageRef} className="relative">
            <div className="relative">
              {/* Main image */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="/marco-bianchi.png"
                  alt="Marco Bianchi - Artigiano e Imprenditore"
                  className="w-full aspect-[4/5] object-cover object-top"
                />
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/60 via-transparent to-transparent" />
                
                {/* Caption */}
                <div className="absolute bottom-6 left-6 right-6">
                  <p className="text-white font-display text-xl font-semibold">Marco Bianchi</p>
                  <p className="text-white/80 text-sm">Fondatore & Artigiano</p>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-[#F5B800] rounded-2xl -z-10" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 border-2 border-[#F5B800] rounded-2xl -z-10" />
            </div>

          </div>

          {/* Content Side */}
          <div ref={contentRef} className="space-y-6">
            {/* Section label */}
            <div className="inline-flex items-center gap-2 text-[#F5B800] font-semibold text-sm uppercase tracking-wider">
              <div className="w-8 h-0.5 bg-[#F5B800]" />
              Chi Siamo
            </div>

            {/* Title */}
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1A1A1A] leading-tight">
              Una vera casa è costruita con{' '}
              <span className="text-[#F5B800]">Amore & Sogni</span>
            </h2>

            {/* Paragraphs */}
            <p className="text-[#666666] leading-relaxed">
              <strong className="text-[#1A1A1A]">MB Ristrutturazioni</strong> è un nome che viene portato 
              avanti da oltre <strong className="text-[#1A1A1A]">35 anni</strong> di lavoro, di passione e 
              di esperienza nel vero artigianato del settore edile Italiano.
            </p>

            <p className="text-[#666666] leading-relaxed">
              Fondata da <strong className="text-[#1A1A1A]">Marco Bianchi</strong> che ormai da decenni 
              soddisfa i suoi clienti e porta avanti gli insegnamenti del padre,{' '}
              <strong className="text-[#1A1A1A]">Romano</strong>, trasformando le idee delle persone in 
              fantastica realtà.
            </p>

            {/* Features grid */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#F5B800]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Award className="w-5 h-5 text-[#F5B800]" />
                </div>
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Qualità Garantita</p>
                  <p className="text-sm text-[#666666]">Materiali top</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#F5B800]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-[#F5B800]" />
                </div>
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Artigiani Esperti</p>
                  <p className="text-sm text-[#666666]">Solo professionisti</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#F5B800]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-[#F5B800]" />
                </div>
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Rispetto Tempi</p>
                  <p className="text-sm text-[#666666]">Sempre puntuali</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#F5B800]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Quote className="w-5 h-5 text-[#F5B800]" />
                </div>
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Supporto 24/7</p>
                  <p className="text-sm text-[#666666]">Sempre disponibili</p>
                </div>
              </div>
            </div>

            {/* Quote */}
            <div className="bg-[#F8F8F8] rounded-2xl p-6 mt-6 relative">
              <Quote className="w-8 h-8 text-[#F5B800]/30 absolute top-4 left-4" />
              <blockquote className="text-[#1A1A1A] font-medium italic pl-8 pt-4">
                "Per noi, eseguire qualcosa di difficile è una sfida e vedere i clienti 
                soddisfatti alla fine dei nostri lavori ci spinge a fare sempre di meglio"
              </blockquote>
              <p className="text-right text-[#666666] text-sm mt-4">
                — Marco Bianchi, Fondatore
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
