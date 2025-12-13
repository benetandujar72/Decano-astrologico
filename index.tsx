import React from 'react';
import ReactDOM from 'react-dom/client';
import './src/index.css';
import App from './App';

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