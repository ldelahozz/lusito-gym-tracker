import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource-variable/inter'
import './styles/index.css'
import { App } from './app/App'
import { requestPersistentStorage } from './core/platform'
import { applyTextSize, readTextSize } from './core/textSize'

// El tamaño de texto elegido se aplica antes de dibujar nada, para que no brinque.
applyTextSize(readTextSize())

// Mantiene la app actualizada sola: al abrirla, si hay version nueva, se instala.
registerSW({ immediate: true })

// Pide al navegador que no borre los datos locales (clave en iPhone).
void requestPersistentStorage()

const container = document.getElementById('root')
if (!container) throw new Error('No se encontró el contenedor #root')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
