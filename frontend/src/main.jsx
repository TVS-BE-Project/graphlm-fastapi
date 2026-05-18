import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { Toaster } from "sonner";
import './index.css'


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Toaster
      position="bottom-right"
      gap={8}
      toastOptions={{
        duration: 2500,
        classNames: {
          toast: 'bg-(--bg-elevated) text-(--text-primary) border border-(--border-subtle) font-mono text-xs rounded-lg shadow-2xl p-4',
          description: 'text-(--text-muted)',
          success: 'bg-(--accent-cyan-dim) text-(--accent-cyan) border-(--accent-cyan)/30',
          error: 'bg-(--accent-red-dim) text-(--accent-red) border-(--accent-red)/30',
          info: 'bg-(--bg-surface) text-(--text-primary) border-(--border-subtle)',
          warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
          loading: 'bg-(--bg-surface) text-(--text-muted) border-(--border-subtle)',
        },
        success: {
          duration: 2000,
        },
        error: {
          duration: 3000,
        },
        loading: {
          duration: Infinity,
        },
      }}
    />
    <App />
  </StrictMode>,
)
