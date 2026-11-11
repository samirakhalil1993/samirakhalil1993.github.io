import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import App from './App.tsx'
import { chatSettings } from './chat/setup'
import { warmUp } from './chat/warmUp'
import './styles/tokens.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// The AI backend sleeps when unused. Start waking it now, so it is likely
// ready by the time the visitor opens the chat.
warmUp(chatSettings.apiUrl)
