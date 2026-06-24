import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import PreviewPremium from './sections/premium/PreviewPremium'

// Entry DEDICATO all'anteprima premium (preview.html).
// Non monta App.tsx: il sito in produzione resta intoccato.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PreviewPremium />
  </StrictMode>,
)
