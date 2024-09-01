
import React, { useState } from 'react';

function IngresarDatos() {
  const [votosNulos, setVotosNulos] = useState(0);
  const [votosBlancos, setVotosBlancos] = useState(0);
  const [plazas, setPlazas] = useState(0);

  const handleSubmit = () => {
    // Lógica para enviar datos al backend
  };

  return (
    <div>
      <h2>Ingresar Datos Adicionales</h2>
      <input type="number" placeholder="Votos Nulos" onChange={(e) => setVotosNulos(e.target.value)} />
      <input type="number" placeholder="Votos en Blanco" onChange={(e) => setVotosBlancos(e.target.value)} />
      <input type="number" placeholder="Plazas a Asignar" onChange={(e) => setPlazas(e.target.value)} />
      <button onClick={handleSubmit}>Procesar Datos</button>
    </div>
  );
}

export default IngresarDatos;
