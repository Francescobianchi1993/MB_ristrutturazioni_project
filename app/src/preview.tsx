import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import HeroPremium from './sections/HeroPremium'

// Entry DEDICATO all'anteprima premium (preview.html).
// Non monta App.tsx: il sito in produzione resta intoccato.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HeroPremium />
  </StrictMode>,
)
