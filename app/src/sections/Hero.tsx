import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ArrowRight, Phone, Star, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Content animation
      const contentElements = contentRef.current?.children;
      if (contentElements) {
        gsap.fromTo(
          contentElements,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.15,
            ease: 'power3.out',
            delay: 0.3,
          }
        );
      }

      // Image animation
      if (imageRef.current) {
        gsap.fromTo(
          imageRef.current,
          { opacity: 0, scale: 0.9 },
          {
            opacity: 1,
            scale: 1,
            duration: 1,
            ease: 'power3.out',
            delay: 0.5,
          }
        );
      }

      // Stats animation
      if (statsRef.current) {
        gsap.fromTo(
          statsRef.current.children,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: 'power3.out',
            delay: 0.9,
          }
        );
      }
    }, heroRef);

    return () => ctx.revert();
  }, []);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="home"
      ref={heroRef}
      className="relative min-h-screen flex items-center pt-20 overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-[#FFF8E7] -z-10" />
      
      {/* Decorative elements */}
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-[#F5B800]/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#F5B800]/5 rounded-full blur-2xl -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-0">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Content */}
          <div ref={contentRef} className="space-y-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[#F5B800]/10 text-[#1A1A1A] px-4 py-2 rounded-full text-sm font-medium">
              <Star className="w-4 h-4 text-[#F5B800]" />
              Da 35 anni, l'artigianato Italiano
            </div>

            {/* Title */}
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1A1A1A] leading-tight">
              Trasformiamo la tua casa nei{' '}
              <span className="text-[#F5B800]">tuoi sogni</span>
            </h1>

            {/* Description */}
            <p className="text-lg text-[#666666] max-w-xl leading-relaxed">
              Ristrutturazioni complete a Roma e provincia. Qualità, affidabilità
              e passione artigiana dal 1989. La tua casa merita il meglio.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button
                onClick={() => scrollToSection('#contatti')}
                className="bg-[#F5B800] hover:bg-[#D9A200] text-[#1A1A1A] font-semibold px-8 py-6 rounded-full text-base transition-all hover:scale-105 hover:shadow-xl group"
              >
                Richiedi Preventivo Gratuito
                <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                onClick={() => scrollToSection('#servizi')}
                variant="outline"
                className="border-2 border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white font-semibold px-8 py-6 rounded-full text-base transition-all"
              >
                Scopri i Nostri Servizi
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center gap-6 pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-[#F5B800]" />
                <span className="text-sm text-[#666666]">Consulenza gratuita</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-[#F5B800]" />
                <span className="text-sm text-[#666666]">Preventivo in 24h</span>
              </div>
            </div>
          </div>

          {/* Image */}
          <div ref={imageRef} className="relative">
            <div className="relative aspect-[4/5] lg:aspect-[3/4] max-w-lg mx-auto">
              {/* Background shape */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#F5B800]/20 to-[#F5B800]/5 rounded-3xl transform rotate-3" />
              
              {/* Image container */}
              <div className="relative overflow-hidden rounded-3xl shadow-2xl">
                <img
                  src="/marco-bianchi.png"
                  alt="Marco Bianchi - Fondatore MB Ristrutturazioni"
                  className="w-full h-full object-cover object-top"
                />
              </div>

              {/* Floating badge */}
              <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3">
                <div className="w-12 h-12 bg-[#F5B800] rounded-full flex items-center justify-center">
                  <Phone className="w-6 h-6 text-[#1A1A1A]" />
                </div>
                <div>
                  <p className="text-xs text-[#666666]">Chiamaci ora</p>
                  <p className="font-semibold text-[#1A1A1A]">339 126 8722</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div
          ref={statsRef}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 pt-8 border-t border-[#E5E5E5]"
        >
          <div className="text-center">
            <p className="font-display text-3xl lg:text-4xl font-bold text-[#F5B800]">35+</p>
            <p className="text-sm text-[#666666] mt-1">Anni di Esperienza</p>
          </div>
          <div className="text-center">
            <p className="font-display text-3xl lg:text-4xl font-bold text-[#F5B800]">500+</p>
            <p className="text-sm text-[#666666] mt-1">Progetti Completati</p>
          </div>
          <div className="text-center">
            <p className="font-display text-3xl lg:text-4xl font-bold text-[#F5B800]">100%</p>
            <p className="text-sm text-[#666666] mt-1">Clienti Soddisfatti</p>
          </div>
          <div className="text-center">
            <p className="font-display text-3xl lg:text-4xl font-bold text-[#F5B800]">24/7</p>
            <p className="text-sm text-[#666666] mt-1">Assistenza Disponibile</p>
          </div>
        </div>
      </div>
    </section>
  );
}
