import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Registrasi Service Worker PWA untuk offline caching
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('PWA ServiceWorker registration failed:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
