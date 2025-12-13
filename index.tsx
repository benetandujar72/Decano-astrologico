import React from 'react';
import ReactDOM from 'react-dom/client';
import './src/index.css';
import App from './App';

// Silenciar errores de scripts de Vercel en producción
if (import.meta.env.PROD) {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    // Filtrar errores de Vercel Live/feedback/instrument
    const errorMessage = args[0]?.toString() || '';
    if (
      errorMessage.includes('message channel closed') ||
      errorMessage.includes('WebSocket') ||
      errorMessage.includes('vercel.live') ||
      errorMessage.includes('instrument.') ||
      errorMessage.includes('feedback.') ||
      errorMessage.includes('data-actions.')
    ) {
      return; // Silenciar estos errores
    }
    originalError.apply(console, args);
  };

  // También silenciar advertencias de deprecación de zustand si vienen de Vercel
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const warnMessage = args[0]?.toString() || '';
    if (
      warnMessage.includes('[DEPRECATED]') && 
      warnMessage.includes('zustand') &&
      warnMessage.includes('instrument.')
    ) {
      return; // Silenciar advertencias de zustand de Vercel
    }
    originalWarn.apply(console, args);
  };
}

// Verificar variables de entorno en desarrollo
if (import.meta.env.DEV) {
  console.log('Environment variables:', {
    VITE_API_URL: import.meta.env.VITE_API_URL,
    API_KEY: import.meta.env.VITE_GEMINI_API_KEY ? '***' : 'not set'
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);