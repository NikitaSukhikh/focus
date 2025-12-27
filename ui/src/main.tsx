import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { switchAppStyle } from './helpers/switchAppStyle';
import { CURRENT_APP_STYLE } from './config/appStyle';

switchAppStyle(CURRENT_APP_STYLE);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
