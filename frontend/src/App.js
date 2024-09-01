
import React from 'react';
import CargarCSV from './components/CargarCSV';
import IngresarDatos from './components/IngresarDatos';
import Resultados from './components/Resultados';

function App() {
  return (
    <div className="App">
      <h1>Calculadora Electoral</h1>
      <CargarCSV />
    </div>
  );
}

export default App;
