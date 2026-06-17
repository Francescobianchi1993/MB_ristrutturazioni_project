import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import GestioneAppuntamento from './sections/gestione/GestioneAppuntamento.tsx'

// Routing minimale senza librerie: se l'URL contiene ?gestisci=<id> mostriamo
// la pagina di gestione self-service (sposta/annulla), altrimenti il sito.
const params = new URLSearchParams(window.location.search)
const gestisciId = params.get('gestisci')
const azione = params.get('do') ?? undefined

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {gestisciId
      ? <GestioneAppuntamento id={gestisciId} azioneIniziale={azione} />
      : <App />}
  </StrictMode>,
)
