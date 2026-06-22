import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import GestioneAppuntamento from './sections/gestione/GestioneAppuntamento.tsx'
import GestioneRichieste from './sections/gestione/GestioneRichieste.tsx'

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
      ? <GestioneRichieste leadId={leadId} />
      : gestisciId
        ? <GestioneAppuntamento id={gestisciId} azioneIniziale={azione} dataIniziale={dataIniziale} oraIniziale={oraIniziale} />
        : <App />}
  </StrictMode>,
)
