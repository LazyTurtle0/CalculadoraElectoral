const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');  // Importa el paquete cors
const partidoRoutes = require('./routes/partidoRoutes');

const app = express();

// Habilita CORS para todas las rutas
app.use(cors());

app.use(bodyParser.json());
app.use('/api/partidos', partidoRoutes);

module.exports = app;
