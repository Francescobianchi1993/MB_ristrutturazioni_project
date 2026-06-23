import { useEffect, useState, useRef, lazy, Suspense, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navbar from './sections/Navbar';
import Hero from './sections/Hero';
import Services from './sections/Services';
import WhyChooseUs from './sections/WhyChooseUs';
import FAQ from './sections/FAQ';
import Contact from './sections/Contact';
import Footer from './sections/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import CookieConsent from './components/CookieConsent';
import './App.css';

// Il wizard preventivo (con tutto il prezzario) è la parte più pesante del sito:
// lo carichiamo come chunk separato, solo quando l'utente ci arriva scrollando
// (vedi LazyOnVisible) → la home apre più in fretta.
const PreventivoV2 = lazy(() => import('./sections/preventivo-v2'));

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

/**
 * Monta i figli solo quando il segnaposto sta per entrare nel viewport.
 * Il contenitore resta sempre nel DOM (con un'altezza minima di riserva, così
 * il layout non "salta" e l'ancora #preventivo è raggiungibile dalla CTA).
 */
function LazyOnVisible({ id, children, minHeight = 640 }: { id?: string; children: ReactNode; minHeight?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '600px' }, // precarica con un po' di anticipo
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  return (
    <div id={id} ref={ref} style={{ minHeight: visible ? undefined : minHeight }}>
      {visible ? children : null}
    </div>
  );
}

function App() {
  useEffect(() => {
    // Configure ScrollTrigger defaults
    ScrollTrigger.defaults({
      toggleActions: 'play none none none',
    });

    // Refresh ScrollTrigger on load
    ScrollTrigger.refresh();

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Hero />
        <Services />
        <WhyChooseUs />
        <LazyOnVisible id="preventivo">
          <Suspense fallback={null}>
            <PreventivoV2 />
          </Suspense>
        </LazyOnVisible>
        <FAQ />
        <Contact />
      </main>
      <Footer />
      <WhatsAppButton />
      <CookieConsent />
    </div>
  );
}

export default App;
