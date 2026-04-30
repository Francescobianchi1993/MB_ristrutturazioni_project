import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Phone, CheckCircle, Quote, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

gsap.registerPlugin(ScrollTrigger);

const slides = [
  { type: 'image' as const, src: '/marco-bianchi.png', caption: 'Marco Bianchi', subtitle: 'Fondatore & Artigiano' },
  { type: 'placeholder' as const, caption: 'I Nostri Lavori', subtitle: 'Roma e provincia' },
  { type: 'placeholder' as const, caption: 'Artigianato Italiano', subtitle: 'Dal 1989' },
];

export default function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
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

      if (aboutRef.current) {
        gsap.fromTo(
          aboutRef.current.children,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: aboutRef.current,
              start: 'top 80%',
              toggleActions: 'play none none none',
            },
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
      className="relative pt-20 pb-16 lg:pb-24 overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-[#FFF8E7] -z-10" />

      {/* Decorative elements */}
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-[#F5B800]/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#F5B800]/5 rounded-full blur-2xl -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* TOP — Hero block (2 colonne: testo + immagine) */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Content (left) */}
          <div ref={contentRef} className="flex flex-col">
            {/* Title */}
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1A1A1A] leading-tight">
              Trasformiamo la tua casa nei{' '}
              <span className="text-[#F5B800]">tuoi sogni</span>
            </h1>

            {/* Description */}
            <div className="text-xl text-[#666666] max-w-xl leading-relaxed mt-[60px] lg:mt-[72px] space-y-2">
              <p>Ristrutturazioni complete a Roma e provincia.</p>
              <p>Qualità, affidabilità e passione artigiana dal 1989.</p>
              <p>La tua casa merita il meglio.</p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mt-[60px] lg:mt-[72px]">
              <Button
                onClick={() => scrollToSection('#preventivo')}
                className="bg-[#F5B800] hover:bg-[#D9A200] text-[#1A1A1A] font-semibold px-8 py-6 rounded-full text-base transition-all hover:scale-105 hover:shadow-xl group"
              >
                Calcola il tuo preventivo
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
            <div className="flex items-center gap-6 mt-8 lg:mt-10">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-[#F5B800]" />
                <span className="text-sm text-[#666666]">Consulenza gratuita</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-[#F5B800]" />
                <span className="text-sm text-[#666666]">Preventivo immediato</span>
              </div>
            </div>
          </div>

          {/* Carousel (right) */}
          <div ref={imageRef} className="relative">
            <div className="relative aspect-[4/5] lg:aspect-[3/4] max-w-lg mx-auto">
              {/* Background shape */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#F5B800]/20 to-[#F5B800]/5 rounded-3xl transform rotate-3" />

              {/* Slides */}
              <div className="relative overflow-hidden rounded-3xl shadow-2xl h-full">
                {slides.map((slide, i) => (
                  <div
                    key={i}
                    className={`absolute inset-0 transition-opacity duration-700 ${i === currentSlide ? 'opacity-100' : 'opacity-0'}`}
                  >
                    {slide.type === 'image' ? (
                      <img
                        src={slide.src}
                        alt={slide.caption}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#F5F5F5] to-[#E8E8E8] flex flex-col items-center justify-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-[#F5B800]/20 flex items-center justify-center">
                          <ImageIcon className="w-10 h-10 text-[#F5B800]" />
                        </div>
                        <p className="text-[#BBBBBB] text-sm font-medium">Foto in arrivo</p>
                      </div>
                    )}
                  </div>
                ))}

                {/* Caption overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/60 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-6 left-6 right-6">
                  <p className="text-white font-display text-xl font-semibold transition-all duration-500">
                    {slides[currentSlide].caption}
                  </p>
                  <p className="text-white/80 text-sm">{slides[currentSlide].subtitle}</p>
                </div>

                {/* Dot indicators */}
                <div className="absolute top-4 right-4 flex gap-1.5">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentSlide(i)}
                      className={`rounded-full transition-all duration-300 ${
                        i === currentSlide
                          ? 'w-6 h-2 bg-[#F5B800]'
                          : 'w-2 h-2 bg-white/60 hover:bg-white'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Floating phone badge */}
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

        {/* BOTTOM — Chi Siamo block (1 colonna full-width centrato) */}
        <div
          id="chi-siamo"
          ref={aboutRef}
          className="max-w-3xl mx-auto mt-20 lg:mt-28 pt-16 border-t border-[#E5E5E5] space-y-6 scroll-mt-24"
        >
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
            Dietro a <strong className="text-[#1A1A1A]">MB Ristrutturazioni</strong> ci sono oltre{' '}
            <strong className="text-[#1A1A1A]">35 anni</strong> di lavoro, passione ed esperienza nel
            vero artigianato edile italiano.
          </p>

          <p className="text-[#666666] leading-relaxed">
            L'azienda nasce da <strong className="text-[#1A1A1A]">Marco Bianchi</strong>, che da decenni
            raccoglie gli insegnamenti del padre <strong className="text-[#1A1A1A]">Romano</strong> e li
            mette al servizio dei suoi clienti, trasformando ogni idea in un progetto realizzato su misura.
          </p>

          {/* Quote */}
          <div className="bg-[#FFF8E7] rounded-2xl p-6 mt-6 relative">
            <Quote className="w-8 h-8 text-[#F5B800]/30 absolute top-4 left-4" />
            <blockquote className="text-[#1A1A1A] font-medium italic pl-8 pt-4">
              "Ogni lavoro difficile è una sfida. La soddisfazione dei nostri clienti è un'ulteriore ricompensa, e la spinta a migliorare ogni giorno"
            </blockquote>
            <p className="text-right text-[#666666] text-sm mt-4">
              — Marco Bianchi, Fondatore
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
