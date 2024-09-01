
class Partido {
  constructor(nombre, votosValidos) {
    this.nombre = nombre;
    this.votosValidos = votosValidos;
    this.integrantes = [];
    this.votosRestantes = 0;
    this.asientosAsignados = 0;
  }

  addIntegrante(integrante) {
    this.integrantes.push(integrante);
  }
}

module.exports = Partido;
