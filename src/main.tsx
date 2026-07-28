import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign Vite WebSocket / HMR disconnection rejections in sandboxed iframe environment
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (
      reason &&
      (reason.message?.includes('WebSocket') ||
       reason.toString().includes('WebSocket') ||
       reason.message?.includes('vite') ||
       reason.toString().includes('failed to connect'))
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('error', (event) => {
    if (
      event.message?.includes('WebSocket') ||
      event.message?.includes('vite')
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
