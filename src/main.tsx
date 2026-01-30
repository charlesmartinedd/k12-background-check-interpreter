import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AppV2 from './AppV2.tsx'

// Check URL parameter for UI version
// Use ?ui=v1 to load the original UI (for comparison/debugging)
// Default loads the new compact UI (V2)
const urlParams = new URLSearchParams(window.location.search);
const uiVersion = urlParams.get('ui');

const AppComponent = uiVersion === 'v1' ? App : AppV2;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppComponent />
  </StrictMode>,
)
