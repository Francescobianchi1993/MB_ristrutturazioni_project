import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import HeroPremium from '../HeroPremium';
import EfficienzaEnergetica from './EfficienzaEnergetica';
import PrimaDopo from './PrimaDopo';
import ChiusuraCTA from './ChiusuraCTA';

gsap.registerPlugin(ScrollTrigger);

/**
 * Pagina di ANTEPRIMA del riposizionamento premium di MB Ristrutturazioni.
 * Assembla le sezioni concept e attiva lo smooth scroll (Lenis) sincronizzato
 * con GSAP ScrollTrigger. Lo smooth si applica al wheel (desktop): su mobile lo
 * scroll resta nativo/reattivo (meglio per un sito lead-gen). Rispetta
 * prefers-reduced-motion. Montata solo da /src/preview.tsx (entry preview.html):
 * il sito in produzione resta intoccato.
 */
export default function PreviewPremium() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);

    const onTick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(onTick);
      lenis.destroy();
    };
  }, []);

  return (
    <main className="bg-white">
      <HeroPremium />
      <EfficienzaEnergetica />
      <PrimaDopo />
      <ChiusuraCTA />
    </main>
  );
}
