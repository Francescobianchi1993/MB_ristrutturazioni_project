import HeroPremium from '../HeroPremium';
import EfficienzaEnergetica from './EfficienzaEnergetica';
import PrimaDopo from './PrimaDopo';
import ChiusuraCTA from './ChiusuraCTA';

/**
 * Pagina di ANTEPRIMA del riposizionamento premium di MB Ristrutturazioni.
 * Assembla le sezioni concept in un'unica scroll-experience. Montata solo da
 * /src/preview.tsx (entry preview.html): il sito in produzione resta intoccato.
 */
export default function PreviewPremium() {
  return (
    <main className="bg-[#13161A]">
      <HeroPremium />
      <EfficienzaEnergetica />
      <PrimaDopo />
      <ChiusuraCTA />
    </main>
  );
}
