// React entrypoint bootstrapping the app into the DOM.

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(<App />);

  const splash = document.getElementById('alfy-splash');
  if (splash) {
    splash.classList.add('fade-out');
    window.setTimeout(() => splash.remove(), 250);
  }
}
