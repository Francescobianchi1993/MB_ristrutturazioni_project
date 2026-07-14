/**
 * Sezione "Preventivo v2" — entry point.
 *
 * Orchestra le viste (Hub / LivelloRapido / LivelloDettaglio / LivelloIntervento /
 * LivelloCertificazione) e il provider di stato condiviso.
 *
 * Qui vive anche la navigazione: modalità e step stanno in questo componente e
 * non dentro i wizard, perché ogni schermata deve corrispondere a una voce nella
 * cronologia del browser (vedi `storia.ts`) e le due cose devono restare
 * allineate. Con lo step locale al wizard, cronologia e schermata mostrata
 * potrebbero divergere e il tasto Indietro del telefono farebbe cose sbagliate.
 */

import { useCallback, useState } from 'react';
import { Toaster } from 'sonner';
import { ProgettoProvider } from './state';
import Hub from './Hub';
import LivelloRapido from './LivelloRapido';
import LivelloDettaglio from './LivelloDettaglio';
import LivelloIntervento from './LivelloIntervento';
import LivelloCertificazione from './LivelloCertificazione';
import { apriVista, sostituisciVista, tornaIndietro, useStoriaVista, type Vista } from './storia';

type Modalita = Vista['m'];

/** Step di partenza di ogni modalità: il wizard rapido parte da 1, l'intervento da 0. */
const STEP_INIZIALE: Record<Modalita, number> = {
  hub: 0,
  rapida: 1,
  esperto: 0,
  intervento: 0,
  certificazione: 0,
};

export default function PreventivoV2() {
  const [vista, setVista] = useState<Vista>({ m: 'hub', s: 0 });

  /** Apre una schermata nuova: avanza nella cronologia. */
  const apri = useCallback((m: Modalita, s: number = STEP_INIZIALE[m]) => {
    const v: Vista = { m, s };
    apriVista(v);
    setVista(v);
  }, []);

  /** Avanza di step dentro il wizard corrente. */
  const vaiAStep = useCallback((s: number) => {
    setVista((corr) => {
      const v: Vista = { m: corr.m, s };
      apriVista(v);
      return v;
    });
  }, []);

  /**
   * Cambia schermata SENZA aggiungere una voce: per le correzioni che non sono
   * una navigazione dell'utente (il "ricomincia", o l'orario che viene occupato
   * mentre sta confermando e lo si rimanda alla scelta della data). Aggiungere
   * una voce, lì, farebbe sì che il tasto Indietro lo riporti su una schermata
   * che non ha mai chiesto.
   */
  const sostituisciStep = useCallback((s: number) => {
    setVista((corr) => {
      const v: Vista = { m: corr.m, s };
      sostituisciVista(v);
      return v;
    });
  }, []);

  // Tasto Indietro del telefono (o del browser): `null` = siamo tornati alla
  // voce da cui il configuratore è partito → si mostra l'Hub.
  const onVista = useCallback((v: Vista | null) => {
    setVista(v ?? { m: 'hub', s: 0 });
  }, []);
  useStoriaVista(onVista);

  const { m: modalita, s: step } = vista;

  return (
    <ProgettoProvider>
      <Toaster richColors position="top-center" />
      {/* L'ancora #preventivo è sul contenitore lazy in App.tsx (LazyOnVisible),
          così la CTA della navbar la raggiunge anche prima che questo chunk si carichi. */}
      <section
        className="scroll-mt-20 pt-16 pb-10 lg:pt-24 lg:pb-12 bg-gradient-to-b from-[#FFF8E7]/40 to-white"
      >
        {modalita === 'hub' && <Hub onScegli={(m) => apri(m)} />}

        {modalita === 'rapida' && (
          <LivelloRapido
            step={step}
            onStep={vaiAStep}
            onIndietro={tornaIndietro}
            onTorna={() => apri('hub')}
          />
        )}

        {/* Modalità "esperto" (Preventivo dettagliato) nascosta al pubblico:
            l'Hub non la propone più. Codice e branch mantenuti per riattivarla
            in futuro (basta ripristinare la card in Hub.tsx). */}
        {modalita === 'esperto' && (
          <LivelloDettaglio
            onTorna={() => apri('hub')}
            onPassaARapida={() => apri('rapida', 4)}
          />
        )}

        {modalita === 'intervento' && (
          <LivelloIntervento
            step={step}
            onStep={vaiAStep}
            onSostituisciStep={sostituisciStep}
            onIndietro={tornaIndietro}
            onTorna={() => apri('hub')}
          />
        )}

        {modalita === 'certificazione' && <LivelloCertificazione onTorna={() => apri('hub')} />}
      </section>
    </ProgettoProvider>
  );
}
