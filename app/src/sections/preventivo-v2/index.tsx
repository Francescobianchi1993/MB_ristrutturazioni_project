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
import LivelloIntervento from './LivelloIntervento';

type Modalita = 'hub' | 'rapida' | 'esperto' | 'intervento';

export default function PreventivoV2() {
  const [modalita, setModalita] = useState<Modalita>('hub');
  // Step iniziale di LivelloRapido. Tornando da "esperto" si rientra al
  // riepilogo (step 4): i dati erano già preservati nel context, ma l'utente
  // ripartendo da step 1 aveva la sensazione di aver perso le selezioni.
  const [rapidaInitialStep, setRapidaInitialStep] = useState(1);

  function vaiAHub() {
    setRapidaInitialStep(1);
    setModalita('hub');
  }

  function vaiARapida(step: number) {
    setRapidaInitialStep(step);
    setModalita('rapida');
  }

  return (
    <ProgettoProvider>
      <Toaster richColors position="top-center" />
      <section
        id="preventivo"
        className="pt-16 pb-10 lg:pt-24 lg:pb-12 bg-gradient-to-b from-[#FFF8E7]/40 to-white"
      >
        {modalita === 'hub' && <Hub onScegli={(m) => { setRapidaInitialStep(1); setModalita(m); }} />}
        {modalita === 'rapida' && (
          <LivelloRapido
            onTorna={vaiAHub}
            onPassaAEsperto={() => setModalita('esperto')}
            initialStep={rapidaInitialStep}
          />
        )}
        {modalita === 'esperto' && (
          <LivelloDettaglio
            onTorna={vaiAHub}
            onPassaARapida={() => vaiARapida(4)}
          />
        )}
        {modalita === 'intervento' && (
          <LivelloIntervento onTorna={() => setModalita('hub')} />
        )}
      </section>
    </ProgettoProvider>
  );
}
