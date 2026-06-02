import 'jeep-sqlite/dist/jeep-sqlite/jeep-sqlite.esm.js';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/base.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
