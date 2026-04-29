/**
 * Sezione "Preventivo v2" — entry point.
 *
 * Orchestra le 3 viste (Hub / LivelloRapido / LivelloDettaglio) e il
 * provider di stato condiviso. Da `<App>` viene renderizzato al posto
 * del vecchio `<Preventivo>` quando il flag ?v=2 è attivo.
 */

import { useState } from 'react';
import { Toaster } from 'sonner';
import { ProgettoProvider } from './state';
import Hub from './Hub';
import LivelloRapido from './LivelloRapido';
import LivelloDettaglio from './LivelloDettaglio';

type Modalita = 'hub' | 'rapida' | 'esperto';

export default function PreventivoV2() {
  const [modalita, setModalita] = useState<Modalita>('hub');

  return (
    <ProgettoProvider>
      <Toaster richColors position="top-center" />
      <section
        id="preventivo"
        className="py-16 lg:py-24 bg-gradient-to-b from-[#FFF8E7]/40 to-white"
      >
        {modalita === 'hub' && <Hub onScegli={setModalita} />}
        {modalita === 'rapida' && (
          <LivelloRapido
            onTorna={() => setModalita('hub')}
            onPassaAEsperto={() => setModalita('esperto')}
          />
        )}
        {modalita === 'esperto' && (
          <LivelloDettaglio
            onTorna={() => setModalita('hub')}
            onPassaARapida={() => setModalita('rapida')}
          />
        )}
      </section>
    </ProgettoProvider>
  );
}
