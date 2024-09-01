const fs = require('fs');
const path = require('path');

exports.procesarCSV = (req, res) => {
    const file = req.file;

    if (!file) {
        return res.status(400).send('No se ha subido ningún archivo.');
    }

    const filePath = path.join(__dirname, '../uploads', file.filename);
    const data = fs.readFileSync(filePath, 'utf8');
    const rows = data.split('\n').map(row => row.split(';'));

    const partidos = {};

    // Procesar las filas del CSV
    rows.slice(1).forEach(row => {
        const [distrito, orden, cedula, cargo, partido] = row.map(col => col.trim());

        // Ignorar filas en blanco o malformadas
        if (!partido || !cedula || !cargo) {
            return;
        }

        if (!partidos[partido]) {
            partidos[partido] = {
                nombre: partido,
                distrito: distrito,
                votosValidos: 0,
                integrantes: []
            };
        }

        partidos[partido].integrantes.push({
            id: cedula,
            orden: parseInt(orden, 10),
            cargo: cargo,
            nombre: cedula  // Asumimos que la cédula representa al propietario/suplente
        });
    });

    const partidoList = Object.values(partidos);

    // Devolver la lista de partidos con sus integrantes
    res.json(partidoList);
};

exports.procesarDatos = (req, res) => {
    const { partidos, votosNulos, votosBlancos, plazas } = req.body;

    if (!partidos || !votosNulos || !votosBlancos || !plazas) {
        return res.status(400).send('Faltan datos.');
    }

    const totalVotosValidos = partidos.reduce((acc, partido) => acc + partido.votosValidos, 0);
    const cociente = Math.floor(totalVotosValidos / plazas);
    const subcociente = Math.floor(cociente / 2);

    const partidosConMinimoVotos = partidos.filter(partido => partido.votosValidos >= subcociente);

    let partidosConAsientos = partidosConMinimoVotos.map(partido => {
        const asientosAsignados = Math.floor(partido.votosValidos / cociente);
        const votosRestantes = partido.votosValidos - (asientosAsignados * cociente);

        return {
            nombre: partido.nombre,
            votosValidos: partido.votosValidos,
            votosRestantes,
            asientosAsignados,
            residual: votosRestantes,
            residualActual: votosRestantes,  // Inicializamos con el mismo valor que residual
            ganoConResidual: false,
            integrantes: partido.integrantes
        };
    });

    partidosConAsientos.sort((a, b) => b.votosValidos - a.votosValidos);

    let asientosRestantes = plazas - partidosConAsientos.reduce((acc, partido) => acc + partido.asientosAsignados, 0);

    // Asignación de asientos restantes basada en votos residuales
    while (asientosRestantes > 0) {
        // Ordenar por votos residuales actuales (mayor a menor)
        partidosConAsientos.sort((a, b) => b.residualActual - a.residualActual);

        const partidoConMayorResidual = partidosConAsientos.find(partido => partido.residualActual > 0);

        if (partidoConMayorResidual) {
            partidoConMayorResidual.asientosAsignados += 1;
            partidoConMayorResidual.ganoConResidual = true;
            partidoConMayorResidual.residualActual = 0;  // Se establece en 0 para evitar asignar más asientos
            asientosRestantes -= 1;
        } else {
            break;  // Si no hay más partidos con votos residuales, romper el bucle
        }
    }

    const ganadores = [];
    const personasMarcadas = new Map();
    const notificaciones = new Map();

    partidosConAsientos.forEach(partido => {
        let integrantesOrdenados = [...partido.integrantes].sort((a, b) => a.orden - b.orden);
        let asientoAsignado = 0;

        while (asientoAsignado < partido.asientosAsignados) {
            const propietario = integrantesOrdenados.shift();
            let suplente = null;
            const condiciones = new Set();

            if (propietario.id) propietario.id = propietario.id.trim();
            if (integrantesOrdenados.length > 0) {
                suplente = integrantesOrdenados.shift();
                if (suplente.id) suplente.id = suplente.id.trim();
            } else if (propietario) {
                suplente = propietario;
                condiciones.add("Movimiento");
            } else {
                suplente = { id: null, nombre: "No indica" };
            }

            if (personasMarcadas.has(propietario.id) || personasMarcadas.has(suplente.id)) {
                condiciones.add("Doble Postulación");
            }

            if (integrantesOrdenados.length > 0 && integrantesOrdenados[0].orden === propietario.orden) {
                condiciones.add("Empate");
            }

            let destacar = "";
            if (condiciones.size > 1) {
                destacar = "purple";
            } else if (condiciones.has("Empate")) {
                destacar = "blue";
            } else if (condiciones.has("Doble Postulación")) {
                destacar = "red";
            } else if (condiciones.has("Movimiento")) {
                destacar = "yellow";
            }

            if (propietario.id) {
                personasMarcadas.set(propietario.id, condiciones);
            }
            if (suplente.id && suplente.id !== propietario.id) {
                personasMarcadas.set(suplente.id, condiciones);
            }

            if (condiciones.size > 0) {
                if (!notificaciones.has(propietario.id)) {
                    notificaciones.set(propietario.id, Array.from(condiciones));
                } else {
                    const existingConditions = notificaciones.get(propietario.id);
                    notificaciones.set(propietario.id, [...new Set([...existingConditions, ...Array.from(condiciones)])]);
                }
            }

            ganadores.push({
                partido: partido.nombre,
                propietario: propietario || { id: null, nombre: "No indica" },
                suplente,
                destacar
            });

            asientoAsignado++;
        }
    });

    res.json({
        totalVotosValidos,
        cociente,
        subcociente,
        partidosFinal: partidosConAsientos,
        ganadores,
        notificaciones: Array.from(notificaciones).map(([id, condiciones]) => ({ id, condiciones }))
    });
};

