const express = require('express');
const router = express.Router();
const partidoController = require('../controllers/partidoController');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Rutas existentes
router.post('/procesar-csv', upload.single('file'), partidoController.procesarCSV);
router.post('/procesar-datos', partidoController.procesarDatos);

// Ruta para generar PDF
router.post('/generar-pdf', (req, res) => {
  const { resultados, cedula } = req.body;

  try {
    const pdfGenerator = new PdfGenerator();
    const pdfBuffer = pdfGenerator.generate(resultados, cedula);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="reporte_resultados.pdf"',
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error al generar el PDF:', error);
    res.status(500).send('Error al generar el PDF');
  }
});

module.exports = router;
