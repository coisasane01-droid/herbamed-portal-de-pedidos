
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Registro do Service Worker e solicitação de permissão de notificação
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const isAdmin = window.location.hash.includes('/admin');

    const swFile = isAdmin 
      ? '/sw-admin.js' 
      : '/sw-site.js';

    navigator.serviceWorker.register(swFile).then(registration => {

      // Detecta nova versão
      registration.onupdatefound = () => {
        const newWorker = registration.installing;

        newWorker.onstatechange = () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            window.dispatchEvent(new Event('swUpdated'));
          }
        };
      };

    }).catch(err => {
      console.log('Erro ao registrar SW:', err);
    });
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
navigator.serviceWorker.addEventListener("message", event => {
  if (event.data?.type === "SW_UPDATED") {
    window.dispatchEvent(new Event("swUpdated"));
  }
});
