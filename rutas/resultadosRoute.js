const express = require("express");
const router = express.Router();
const conexion = require("../config/conexion");

router.get("/resultados", (req, res) => {
    if (!req.session.login) {
        return res.redirect("/login");
    }
    res.render("resultados", { datos: req.session });
});

// Evaluaciones del usuario con resultado_aprendizaje
router.get("/api/evaluaciones-por-curso/:curso_id", (req, res) => {
    const cursoId = req.params.curso_id;

    const query = `
        SELECT rn.evaluacion_id, rn.tipo_evaluacion,
        COALESCE(e.nombre, ep.nombre) AS nombre,
        COALESCE(e.resultado_aprendizaje, ep.resultado_aprendizaje) AS ra
        FROM resultados_niveles rn
        LEFT JOIN evaluaciones e ON rn.evaluacion_id = e.id_evaluacion AND rn.tipo_evaluacion = 'usuario'
        LEFT JOIN evaluaciones_predeterminadas ep ON rn.evaluacion_id = ep.id_evaluacion_base AND rn.tipo_evaluacion = 'predeterminada'
        WHERE rn.curso_id = ?
        GROUP BY rn.evaluacion_id, rn.tipo_evaluacion
    `;

    conexion.query(query, [cursoId], (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: "Error al obtener evaluaciones." });
        res.json({ success: true, evaluaciones: rows });
    });
});

// Resultados por evaluación (nivel de RA por estudiante)
router.get("/api/resultados-ra/:curso_id/:evaluacion_id", (req, res) => {
    const { curso_id, evaluacion_id } = req.params;

    const query = `
        SELECT e.nombre_estudiante, e.codigo_estudiante, rn.trazabilidad
        FROM resultados_niveles rn
        JOIN estudiantes e ON rn.id_estudiante = e.estudiante_id
        WHERE rn.curso_id = ? AND rn.evaluacion_id = ?
    `;

    conexion.query(query, [curso_id, evaluacion_id], (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: "Error al obtener resultados." });

        const resultados = rows.map(row => {
            let nivelRA = "-";
            let trazabilidad = null;

            try {
                trazabilidad = JSON.parse(row.trazabilidad);
                nivelRA = trazabilidad.resultado?.nivel || "-";
            } catch (e) {
                console.warn("Error parsing trazabilidad:", e);
            }

            return {
                nombre_estudiante: row.nombre_estudiante,
                codigo_estudiante: row.codigo_estudiante,
                nivel_ra: nivelRA,
                trazabilidad
            };
        });

        res.json({ success: true, resultados });
    });
});
//graficos
router.get("/api/puntajes-ra-boxplot/:curso_id/:evaluacion_id", (req, res) => {
    const { curso_id, evaluacion_id } = req.params;

    const query = `
        SELECT rn.trazabilidad
        FROM resultados_niveles rn
        WHERE rn.curso_id = ? AND rn.evaluacion_id = ?
    `;

    conexion.query(query, [curso_id, evaluacion_id], (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, error: "Error al obtener puntajes." });
        }

        const puntajes = rows.map(row => {
            try {
                const trazabilidad = JSON.parse(row.trazabilidad);
                const puntaje = trazabilidad?.resultado?.puntaje;
                return typeof puntaje === 'number' ? puntaje : null;
            } catch {
                return null;
            }
        }).filter(p => p !== null);

        res.json({ success: true, puntajes });
    });
});



module.exports = router;
