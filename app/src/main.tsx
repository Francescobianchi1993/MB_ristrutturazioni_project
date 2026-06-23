import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Il gestionale (admin) e la pagina self-service del cliente servono solo sugli
// URL ?admin e ?gestisci: li carichiamo come chunk separati, così non pesano sul
// caricamento del sito per i normali visitatori.
const GestioneAppuntamento = lazy(() => import('./sections/gestione/GestioneAppuntamento.tsx'))
const GestioneRichieste = lazy(() => import('./sections/gestione/GestioneRichieste.tsx'))

// Routing minimale senza librerie:
//  ?admin           → mini-gestionale richieste (protetto da password)
//  ?gestisci=<id>   → pagina self-service del cliente (sposta/annulla)
//  altrimenti       → sito
const params = new URLSearchParams(window.location.search)
const adminMode = params.has('admin')
const leadId = params.get('lead') ?? undefined
const gestisciId = params.get('gestisci')
const azione = params.get('do') ?? undefined
// Slot proposto da MB (deep-link "annulla con proposta"): pre-seleziona data/ora.
const dataIniziale = params.get('data') ?? undefined
const oraIniziale = params.get('ora') ?? undefined

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {adminMode
      ? <Suspense fallback={null}><GestioneRichieste leadId={leadId} /></Suspense>
      : gestisciId
        ? <Suspense fallback={null}><GestioneAppuntamento id={gestisciId} azioneIniziale={azione} dataIniziale={dataIniziale} oraIniziale={oraIniziale} /></Suspense>
        : <App />}
  </StrictMode>,
)
