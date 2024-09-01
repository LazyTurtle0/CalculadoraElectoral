import React, { useState } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import '../styles/styles.css'; // Adjust the path if necessary

function CargarCSV() {
  const [archivo, setArchivo] = useState(null);
  const [cedula, setCedula] = useState('');
  const [errorCedula, setErrorCedula] = useState('');
  const [partidos, setPartidos] = useState([]);
  const [resultados, setResultados] = useState(null);
  const [votosNulos, setVotosNulos] = useState(0);
  const [votosBlancos, setVotosBlancos] = useState(0);
  const [plazas, setPlazas] = useState(0);

  const handleArchivoChange = (e) => {
    setArchivo(e.target.files[0]);
  };

  const handleCedulaChange = (e) => {
    const value = e.target.value;

    // Validar que solo se ingresen números
    if (/^\d*$/.test(value)) {
      setCedula(value);

      // Validar que la cédula tenga exactamente 9 dígitos
      if (value.length !== 9) {
        setErrorCedula('La cédula debe tener exactamente 9 dígitos.');
      } else {
        setErrorCedula(''); // Sin errores
      }
    } else {
      setErrorCedula('La cédula solo puede contener números.');
    }
  };

  const handleSubmit = async () => {
    if (errorCedula || cedula.length !== 9) {
      alert('Por favor, ingrese una cédula válida.');
      return;
    }

    const formData = new FormData();
    formData.append('file', archivo);

    try {
      const response = await axios.post('http://localhost:3001/api/partidos/procesar-csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setPartidos(response.data.map(partido => ({ ...partido, votosValidos: partido.votosValidos || 0 })));
    } catch (error) {
      console.error('Error al procesar el archivo CSV:', error.response ? error.response.data : error.message);
    }
  };

  const handleVotosChange = (index, votos) => {
    const nuevosPartidos = [...partidos];
    const votosValidos = isNaN(parseInt(votos, 10)) ? 0 : parseInt(votos, 10);
    nuevosPartidos[index].votosValidos = votosValidos;
    setPartidos(nuevosPartidos);
  };

  const handleProcesarDatos = async () => {
    try {
      const response = await axios.post('http://localhost:3001/api/partidos/procesar-datos', {
        partidos,
        votosNulos,
        votosBlancos,
        plazas
      });
      setResultados(response.data);
    } catch (error) {
      console.error('Error al procesar los datos:', error.response ? error.response.data : error.message);
    }
  };

  const getRowStyle = (destacar) => {
    switch (destacar) {
      case "red":
        return { backgroundColor: 'red', color: 'white' };
      case "yellow":
        return { backgroundColor: 'yellow', color: 'black' };
      case "blue":
        return { backgroundColor: 'blue', color: 'white' };
      case "purple":
        return { backgroundColor: 'purple', color: 'white' };
      default:
        return {};
    }
  };

  const handleDescargarPDF = () => {
    const doc = new jsPDF();
    
    // Define custom styles
    const titleFontSize = 18;
    const subtitleFontSize = 14;
    const textFontSize = 12;
    const primaryColor = '#143B78';
    const secondaryColor = '#000';
  
    // Set font size and color for the title
    doc.setFontSize(titleFontSize);
    doc.setTextColor(primaryColor);
    doc.text('Reporte de Resultados', 14, 20);
  
    // Persona encargada
    doc.setFontSize(subtitleFontSize);
    doc.setTextColor(secondaryColor);
    doc.text(`Persona encargada: ${cedula}`, 14, 30);
  
    // Results section
    doc.setFontSize(subtitleFontSize);
    doc.setTextColor(primaryColor);
    doc.text('Resultados de Cálculo', 14, 40);
  
    doc.setFontSize(textFontSize);
    doc.setTextColor(secondaryColor);
    doc.text(`Total de Votos Válidos: ${resultados.totalVotosValidos}`, 14, 50);
    doc.text(`Cociente: ${resultados.cociente}`, 14, 60);
    doc.text(`Subcociente: ${resultados.subcociente}`, 14, 70);
  
    // Table 1: Asignación de Asientos
    doc.setFontSize(subtitleFontSize);
    doc.setTextColor(primaryColor);
    doc.text('Asignación de Asientos (Tabla 1)', 14, 80);
    
    doc.autoTable({
      startY: 90,
      headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 12 },
      bodyStyles: { textColor: secondaryColor, fontSize: 10 },
      alternateRowStyles: { fillColor: [240, 240, 240] }, // Light grey for alternating rows
      head: [['Partido', 'Votos Válidos', 'Votos Restantes', 'Asientos Asignados', 'Votos Residuales', 'Gano con Residual']],
      body: resultados.partidosFinal.map(partido => [
        partido.nombre,
        partido.votosValidos,
        partido.votosRestantes,
        partido.asientosAsignados,
        partido.votosRestantes,
        partido.ganoConResidual ? 'Sí' : 'No',
      ]),
      didParseCell: function (data) {
        if (data.section === 'body') { // Apply only to body cells, not headers
          const partido = resultados.partidosFinal[data.row.index];
          if (partido.ganoConResidual) {
            data.cell.styles.fillColor = [204, 229, 255]; // Blue for residual
          }
        }
      }
    });
  
    // Table 2: Ganadores
    doc.setFontSize(subtitleFontSize);
    doc.setTextColor(primaryColor);
    doc.text('Ganadores (Tabla 2)', 14, doc.autoTable.previous.finalY + 20);
  
    doc.autoTable({
      startY: doc.autoTable.previous.finalY + 30,
      headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 12 }, // Same styles as Table 1
      bodyStyles: { textColor: secondaryColor, fontSize: 10 },
      alternateRowStyles: { fillColor: [240, 240, 240] }, // Light grey for alternating rows
      head: [['Partido', 'Propietario', 'Suplente']],
      body: resultados.ganadores.map(ganador => [
        ganador.partido,
        ganador.propietario.nombre || 'No indica',
        ganador.suplente.nombre || 'No indica',
      ]),
      didParseCell: function (data) {
        if (data.section === 'body') { // Apply only to body cells, not headers
          const ganador = resultados.ganadores[data.row.index];
          if (ganador.destacar === 'red') {
            data.cell.styles.fillColor = [248, 215, 218]; // Red for doble postulación
          } else if (ganador.destacar === 'yellow') {
            data.cell.styles.fillColor = [255, 243, 205]; // Yellow for movement
          } else if (ganador.destacar === 'blue') {
            data.cell.styles.fillColor = [204, 229, 255]; // Blue for empate
          } else if (ganador.destacar === 'purple') {
            data.cell.styles.fillColor = [226, 208, 255]; // Purple for multiple conditions
          }
        }
      }
    });
  
    doc.save('reporte_resultados.pdf');
  };

  return (
    <div className="App">
      <h1>Calculadora Electoral</h1>

      <div className="form-group">
        <label>Cédula:</label>
        <input
          type="text"
          value={cedula}
          onChange={handleCedulaChange}
          maxLength={9}  // Limita la entrada a 9 dígitos
        />
        {errorCedula && <p style={{ color: 'red' }}>{errorCedula}</p>}
      </div>

      <div className="form-group">
        <input type="file" onChange={handleArchivoChange} disabled={!cedula || errorCedula} />
        <button onClick={handleSubmit} disabled={!cedula || errorCedula || !archivo}>Cargar CSV</button>
      </div>

      {partidos.length > 0 && (
        <div>
          <h3>Ingresar Votos Válidos</h3>
          <div className="partidos-container">
            <form>
              {partidos.map((partido, index) => (
                <div key={`${partido.nombre}-${index}`}>
                  <label>
                    {partido.nombre} ({partido.distrito}):
                    <input
                      type="number"
                      value={partido.votosValidos}
                      onChange={(e) => handleVotosChange(index, e.target.value)}
                      step="1"
                      min="0"
                    />
                  </label>
                </div>
              ))}
            </form>
          </div>
          <div className="additional-data">
            <label>
              Votos Nulos:
              <input type="number" value={votosNulos} onChange={(e) => setVotosNulos(e.target.value)} />
            </label>
            <label>
              Votos en Blanco:
              <input type="number" value={votosBlancos} onChange={(e) => setVotosBlancos(e.target.value)} />
            </label>
            <label>
              Plazas a Asignar:
              <input type="number" value={plazas} onChange={(e) => setPlazas(e.target.value)} />
            </label>
            <button onClick={handleProcesarDatos}>Procesar Datos</button>
          </div>
        </div>
      )}

      {resultados && (
        <div className="section">
          <h3>Resultados de Cálculo</h3>
          <p>Total de Votos Válidos: {resultados.totalVotosValidos}</p>
          <p>Cociente: {resultados.cociente}</p>
          <p>Subcociente: {resultados.subcociente}</p>

          <h3>Asignación de Asientos (Tabla 1)</h3>
          <table>
            <thead>
              <tr>
                <th>Partido</th>
                <th>Votos Válidos</th>
                <th>Votos Restantes</th>
                <th>Asientos Asignados</th>
                <th>Votos Residuales</th>
                <th>Ganó con Residual</th>
              </tr>
            </thead>
            <tbody>
              {resultados.partidosFinal.map((partido, index) => (
                <tr key={index} style={partido.ganoConResidual ? { backgroundColor: '#cce5ff' } : {}}>
                  <td>{partido.nombre}</td>
                  <td>{partido.votosValidos}</td>
                  <td>{partido.votosRestantes}</td>
                  <td>{partido.asientosAsignados}</td>
                  <td>{partido.votosRestantes}</td>
                  <td>{partido.ganoConResidual ? 'Sí' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Ganadores (Tabla 2)</h3>
          <table>
            <thead>
              <tr>
                <th>Partido</th>
                <th>Propietario</th>
                <th>Suplente</th>
              </tr>
            </thead>
            <tbody>
              {resultados.ganadores.map((ganador, index) => (
                <tr key={index} style={getRowStyle(ganador.destacar)}>
                  <td>{ganador.partido}</td>
                  <td>{ganador.propietario.nombre || 'No indica'}</td>
                  <td>{ganador.suplente.nombre || 'No indica'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <button onClick={handleDescargarPDF}>Descargar PDF</button>
        </div>
      )}
    </div>
  );
}

export default CargarCSV;
