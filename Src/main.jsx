import React from 'react';
import ReactDOM from 'react-dom/client';
// Asegúrate de que esta ruta sea correcta:
import App from './App.jsx'; 

// *** SOLUCIÓN PROBABLE PARA EL CSS ***
// La ruta para el CSS DEBE ser correcta. Si ambos están en 'Src', 
// esta línea funciona:
import './index.css'; 

// Este es el punto de entrada de la aplicación React
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

