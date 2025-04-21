const express = require("express");
const router = express.Router();
const conexion = require("../config/conexion");
const link = require("../config/link");
const multer = require("multer");
const csvParser = require("csv-parser");
const fs = require("fs");

const upload = multer({ dest: "uploads/" });

router.get("/evaluacion", function(req, res) {
    if (!req.session.login) {
        return res.redirect("/login");
    }
    res.render("evaluacion", { datos: req.session });
});

// Ruta para obtener los cursos en formato JSON
router.get("/api/cursos", (req, res) => {
    if (!req.session.login) {
        return res.status(401).json({ success: false, error: "No autorizado" });
    }

    const usuarioId = req.session.usuarioid;
    const query = "SELECT curso_id, nombre_curso FROM cursos WHERE usuario_id = ?";

    conexion.query(query, [usuarioId], (err, resultados) => {
        if (err) {
            console.error("Error al obtener los cursos: ", err);
            return res.status(500).json({ success: false, error: "Error en la base de datos" });
        }

        res.json({ success: true, cursos: resultados });
    });
});
router.get("/api/evaluaciones", (req, res) => {
    const queryUsuario = `
        SELECT id_evaluacion AS id, nombre, resultado_aprendizaje, 'usuario' AS tipo
        FROM evaluaciones
    `;

    const queryPredeterminadas = `
        SELECT id_evaluacion_base AS id, nombre, resultado_aprendizaje, 'predeterminada' AS tipo
        FROM evaluaciones_predeterminadas
    `;

    conexion.query(`${queryUsuario} UNION ${queryPredeterminadas}`, (err, rows) => {
        if (err) {
            console.error(" Error al obtener evaluaciones:", err);
            return res.status(500).json({ success: false, error: "Error en la base de datos." });
        }

        res.json({ success: true, evaluaciones: rows });
    });
});

//  Obtener los estudiantes de un curso específico
router.get("/api/estudiantes/:curso_id", (req, res) => {
    if (!req.session || !req.session.login) {
        return res.status(401).json({ success: false, error: " No autorizado. Inicia sesión para continuar." });
    }

    const cursoId = req.params.curso_id; //  Se usa req.params en lugar de req.query

    if (!cursoId) {
        return res.status(400).json({ success: false, error: " Curso no especificado en la URL." });
    }

    const query = "SELECT codigo_estudiante, nombre_estudiante FROM estudiantes WHERE curso_id = ?";

    conexion.query(query, [cursoId], (err, resultados) => {
        if (err) {
            console.error(" Error al obtener los estudiantes:", err);
            return res.status(500).json({ success: false, error: " Error en la base de datos." });
        }

        if (resultados.length === 0) {
            return res.status(404).json({ success: false, error: " No se encontraron estudiantes para este curso." });
        }

        res.json({ success: true, estudiantes: resultados });
    });
});
//cargar base 
router.get("/api/evaluacion-base/:resultado", (req, res) => {
    const resultadoAprendizaje = req.params.resultado;

    const query = `
        SELECT e.id_evaluacion_base, e.resultado_aprendizaje, e.nombre,
               c.id_criterio_base, c.nombre AS criterio, c.detalle AS criterio_detalle, c.puntaje AS criterio_puntaje,
               clc.nivel_basico AS criterio_nivel_basico, clc.nivel_intermedio AS criterio_nivel_intermedio, clc.nivel_alto AS criterio_nivel_alto,
               i.id_indLog_base, i.nombre AS indicador, i.detalle AS indicador_detalle, i.puntaje AS indicador_puntaje,
               cli.nivel_basico AS indicador_nivel_basico, cli.nivel_intermedio AS indicador_nivel_intermedio, cli.nivel_alto AS indicador_nivel_alto,
               p.id_pregunta_base, p.nombre AS pregunta, p.detalle AS pregunta_detalle, p.puntaje AS pregunta_puntaje
        FROM evaluaciones_predeterminadas e
        LEFT JOIN criterios_predeterminados c ON e.id_evaluacion_base = c.id_evaluacion_base
        LEFT JOIN clasificador_niveles_critpredeter clc ON c.id_criterio_base = clc.id_criterio
        LEFT JOIN indicadores_logro_predeterminados i ON c.id_criterio_base = i.id_criterio_base
        LEFT JOIN clasificador_niveles_indpredeter cli ON i.id_indLog_base = cli.id_indicador
        LEFT JOIN preguntas_predeterminadas p ON i.id_indLog_base = p.id_indLog_base
        WHERE e.resultado_aprendizaje = ?

    `;

    conexion.query(query, [resultadoAprendizaje, resultadoAprendizaje], (err, rows) => {
        if (err) {
            console.error(" Error al obtener evaluación base:", err);
            return res.status(500).json({ success: false, error: "Error al obtener la evaluación base." });
        }
        if (rows.length > 0) {
            const nombreEvaluacion = rows[0].nombre; // Tomar el nombre desde la primera fila
            return res.json({ success: true, nombreEvaluacion, datos: rows });
        } else {
            return res.json({ success: false, error: "No se encontró la evaluación base." });
        }
        
    });
});


//  Ruta para obtener evaluación creada por el usuario
router.get("/api/evaluacion-usuario/:id", (req, res) => {
    const evaluacionId = req.params.id;

    const query = `
        SELECT e.id_evaluacion, e.resultado_aprendizaje, e.nombre,
               c.id_criterio, c.nombre AS criterio, c.detalle AS criterio_detalle, c.puntaje AS criterio_puntaje,
               clc.nivel_basico AS criterio_nivel_basico, clc.nivel_intermedio AS criterio_nivel_intermedio, clc.nivel_alto AS criterio_nivel_alto,
               i.id_indLog, i.nombre AS indicador, i.detalle AS indicador_detalle, i.puntaje AS indicador_puntaje,
               cli.nivel_basico AS indicador_nivel_basico, cli.nivel_intermedio AS indicador_nivel_intermedio, cli.nivel_alto AS indicador_nivel_alto,
               p.id_pregunta, p.nombre AS pregunta, p.detalle AS pregunta_detalle, p.puntaje AS pregunta_puntaje
        FROM evaluaciones e
        LEFT JOIN criterios c ON e.id_evaluacion = c.id_evaluacion
        LEFT JOIN clasificador_niveles_criterio clc ON c.id_criterio = clc.id_criterio
        LEFT JOIN indicadores_logro i ON c.id_criterio = i.id_criterio
        LEFT JOIN clasificador_niveles_indicador cli ON i.id_indLog = cli.id_indicador
        LEFT JOIN preguntas p ON i.id_indLog = p.id_indLog
        WHERE e.id_evaluacion = ?
        ORDER BY c.id_criterio, i.id_indLog, p.id_pregunta;
    `;

    conexion.query(query, [evaluacionId], (err, rows) => {
        if (err) {
            console.error("❌ Error al obtener evaluación de usuario:", err);
            return res.status(500).json({ success: false, error: "Error en la base de datos." });
        }
        if (rows.length > 0) {
            const nombreEvaluacion = rows[0].nombre; // Tomar el nombre desde la primera fila
            return res.json({ success: true, nombreEvaluacion, datos: rows });
        } else {
            return res.json({ success: false, error: "No se encontró la evaluación del usuario." });
        }
    });
});
//ruta generar preguntas 
router.get("/api/evaluacion-preguntas/:id", (req, res) => {
    const evaluacionId = req.params.id;

    if (!evaluacionId) {
        return res.status(400).json({ success: false, error: "ID de evaluación no proporcionado." });
    }

    const query = `
        SELECT p.id_pregunta, p.nombre AS pregunta
        FROM preguntas p
        JOIN indicadores_logro i ON p.id_indLog = i.id_indLog
        JOIN criterios c ON i.id_criterio = c.id_criterio
        WHERE c.id_evaluacion = ?
    `;

    conexion.query(query, [evaluacionId], (err, rows) => {
        if (err) {
            console.error(" Error al obtener preguntas de la evaluación:", err);
            return res.status(500).json({ success: false, error: "Error en la base de datos." });
        }

        res.json({ success: true, preguntas: rows });
    });
});
// ruta generar preguntas predeterminadas 
router.get("/api/evaluacion-preguntas-base/:resultado", (req, res) => {
    const resultadoAprendizaje = req.params.resultado;

    if (!resultadoAprendizaje) {
        return res.status(400).json({ success: false, error: "Resultado de aprendizaje no especificado." });
    }

    const query = `
        SELECT p.id_pregunta_base AS id_pregunta, p.nombre AS pregunta
        FROM preguntas_predeterminadas p
        JOIN indicadores_logro_predeterminados i ON p.id_indLog_base = i.id_indLog_base
        JOIN criterios_predeterminados c ON i.id_criterio_base = c.id_criterio_base
        JOIN evaluaciones_predeterminadas e ON c.id_evaluacion_base = e.id_evaluacion_base
        WHERE e.resultado_aprendizaje = ?
    `;

    conexion.query(query, [resultadoAprendizaje], (err, rows) => {
        if (err) {
            console.error(" Error al obtener preguntas de la evaluación predeterminada:", err);
            return res.status(500).json({ success: false, error: "Error en la base de datos." });
        }

        res.json({ success: true, preguntas: rows });
    });
});


//  Ruta para guardar
router.post("/api/guardar-evaluacion", (req, res) => {
    const usuario_id = req.session.usuarioid;
    const { nombre, resultadoAprendizaje, criterios } = req.body;

    if (!req.session || !req.session.usuarioid) {
        return res.status(401).json({ success: false, error: " Sesión no válida. Inicia sesión nuevamente." });
    }
    if (!usuario_id) {
        return res.status(401).json({ success: false, error: " No hay un usuario autenticado en la sesión." });
    }
    if (!nombre || !criterios || criterios.length === 0) {
        return res.status(400).json({ success: false, error: "Faltan datos para guardar la evaluación." });
    }

    conexion.beginTransaction((err) => {
        if (err) {
            console.error(" Error iniciando transacción:", err);
            return res.status(500).json({ success: false, error: "Error en la base de datos." });
        }

        // 1 Insertar Evaluación
        const queryEvaluacion = "INSERT INTO evaluaciones (usuario_id, resultado_aprendizaje, nombre) VALUES (?, ?, ?)";
        conexion.query(queryEvaluacion, [usuario_id, resultadoAprendizaje, nombre], (err, resultEvaluacion) => {
            if (err) {
                console.error(" Error al guardar la evaluación:", err);
                return conexion.rollback(() => res.status(500).json({ success: false, error: "Error en la base de datos." }));
            }

            const idEvaluacion = resultEvaluacion.insertId;
            let criteriosIDs = [];

            // 2 Insertar Criterios y almacenar sus IDs
            let criteriosQuery = "INSERT INTO criterios (id_evaluacion, nombre, detalle, puntaje) VALUES ?";
            let criteriosValues = criterios.map(c => [idEvaluacion, c.nombre, c.detalle, c.puntaje]);

            conexion.query(criteriosQuery, [criteriosValues], (err, resultCriterios) => {
                if (err) {
                    console.error(" Error al guardar los criterios:", err);
                    return conexion.rollback(() => res.status(500).json({ success: false, error: "Error al guardar los criterios." }));
                }

                let criterioInsertId = resultCriterios.insertId;
                criteriosIDs = criterios.map((_, i) => criterioInsertId + i);

                // 3 Insertar Clasificadores de Criterios
                let clasificadoresCriteriosQuery = "INSERT INTO clasificador_niveles_criterio (id_criterio, nivel_basico, nivel_intermedio, nivel_alto) VALUES ?";
                let clasificadoresCriteriosValues = criterios.map((c, i) => [criteriosIDs[i], c.nivel_basico, c.nivel_intermedio, c.nivel_alto]);

                conexion.query(clasificadoresCriteriosQuery, [clasificadoresCriteriosValues], (err) => {
                    if (err) {
                        console.error(" Error al guardar los clasificadores de criterios:", err);
                        return conexion.rollback(() => res.status(500).json({ success: false, error: "Error al guardar los clasificadores de criterios." }));
                    }

                    // 4 Insertar Indicadores y almacenar sus IDs correctamente
                    let indicadoresQuery = "INSERT INTO indicadores_logro (id_criterio, nombre, detalle, puntaje) VALUES ?";
                    let indicadoresValues = [];
                    let indicadorCriterioMap = {}; // Mapa para almacenar los IDs de indicadores

                    criterios.forEach((criterio, i) => {
                        criterio.indicadores.forEach(indicador => {
                            indicadoresValues.push([criteriosIDs[i], indicador.nombre, indicador.detalle, indicador.puntaje]);
                        });
                    });

                    conexion.query(indicadoresQuery, [indicadoresValues], (err, resultIndicadores) => {
                        if (err) {
                            console.error(" Error al guardar los indicadores:", err);
                            return conexion.rollback(() => res.status(500).json({ success: false, error: "Error al guardar los indicadores." }));
                        }

                        let indicadorInsertId = resultIndicadores.insertId;
                        let contadorIndicador = 0;

                        criterios.forEach((criterio, i) => {
                            criterio.indicadores.forEach((indicador, j) => {
                                indicadorCriterioMap[indicador.nombre] = indicadorInsertId + contadorIndicador;
                                contadorIndicador++;
                            });
                        });

                        // 5 Insertar Clasificadores de Indicadores
                        let clasificadoresIndicadoresQuery = "INSERT INTO clasificador_niveles_indicador (id_indicador, nivel_basico, nivel_intermedio, nivel_alto) VALUES ?";
                        let clasificadoresIndicadoresValues = [];

                        criterios.forEach(criterio => {
                            criterio.indicadores.forEach(indicador => {
                                let idIndicador = indicadorCriterioMap[indicador.nombre];
                                clasificadoresIndicadoresValues.push([idIndicador, indicador.nivel_basico, indicador.nivel_intermedio, indicador.nivel_alto]);
                            });
                        });

                        conexion.query(clasificadoresIndicadoresQuery, [clasificadoresIndicadoresValues], (err) => {
                            if (err) {
                                console.error(" Error al guardar los clasificadores de indicadores:", err);
                                return conexion.rollback(() => res.status(500).json({ success: false, error: "Error al guardar los clasificadores de indicadores." }));
                            }

                            // 6 Insertar Preguntas con IDs de Indicadores correctamente enlazados
                            let preguntasQuery = "INSERT INTO preguntas (id_indLog, nombre, detalle, puntaje) VALUES ?";
                            let preguntasValues = [];

                            criterios.forEach(criterio => {
                                criterio.indicadores.forEach(indicador => {
                                    let idIndicador = indicadorCriterioMap[indicador.nombre]; // Obtenemos el ID correcto del indicador
                                    indicador.preguntas.forEach(pregunta => {
                                        preguntasValues.push([idIndicador, pregunta.nombre, pregunta.detalle, pregunta.puntaje]);
                                    });
                                });
                            });

                            conexion.query(preguntasQuery, [preguntasValues], (err) => {
                                if (err) {
                                    console.error(" Error al guardar las preguntas:", err);
                                    return conexion.rollback(() => res.status(500).json({ success: false, error: "Error al guardar las preguntas." }));
                                }

                                // 7 Confirmar la transacción si todo está bien
                                conexion.commit((err) => {
                                    if (err) {
                                        return conexion.rollback(() => res.status(500).json({ success: false, error: "Error en la base de datos." }));
                                    }
                                    res.json({
                                        success: true,
                                        id: idEvaluacion,
                                        nombre: nombre,
                                        message: " Evaluación guardada correctamente con clasificadores de niveles."
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});
//  Ruta para actualizar una evaluación existente
router.post("/api/editar-evaluacion", (req, res) => {
    const { idEvaluacion, nombre, criterios } = req.body;

    if (!idEvaluacion || !nombre || !criterios || criterios.length === 0) {
        return res.status(400).json({ success: false, error: "Datos insuficientes para actualizar la evaluación." });
    }

    conexion.beginTransaction((err) => {
        if (err) {
            console.error(" Error iniciando transacción:", err);
            return res.status(500).json({ success: false, error: "Error en la base de datos." });
        }

        //  Actualizar el nombre de la evaluación
        const queryUpdateEvaluacion = "UPDATE evaluaciones SET nombre = ? WHERE id_evaluacion = ?";
        conexion.query(queryUpdateEvaluacion, [nombre, idEvaluacion], (err) => {
            if (err) {
                console.error(" Error al actualizar la evaluación:", err);
                return conexion.rollback(() => res.status(500).json({ success: false, error: "Error al actualizar la evaluación." }));
            }

            let criteriosUpdates = criterios.map(c => new Promise((resolve, reject) => {
                const queryUpdateCriterio = "UPDATE criterios SET nombre = ?, detalle = ?, puntaje = ? WHERE id_criterio = ?";
                conexion.query(queryUpdateCriterio, [c.nombre, c.detalle, c.puntaje, c.id], (err) => {
                    if (err) {
                        console.error(" Error al actualizar criterio:", err);
                        return reject("Error al actualizar criterio.");
                    }

                    let indicadoresUpdates = c.indicadores.map(i => new Promise((resolve, reject) => {
                        const queryUpdateIndicador = "UPDATE indicadores_logro SET nombre = ?, detalle = ?, puntaje = ? WHERE id_indLog = ?";
                        conexion.query(queryUpdateIndicador, [i.nombre, i.detalle, i.puntaje, i.id], (err) => {
                            if (err) {
                                console.error(" Error al actualizar indicador:", err);
                                return reject("Error al actualizar indicador.");
                            }

                            let preguntasUpdates = i.preguntas.map(p => new Promise((resolve, reject) => {
                                const queryUpdatePregunta = "UPDATE preguntas SET nombre = ?, detalle = ?, puntaje = ? WHERE id_pregunta = ?";
                                conexion.query(queryUpdatePregunta, [p.nombre, p.detalle, p.puntaje, p.id], (err) => {
                                    if (err) {
                                        console.error(" Error al actualizar pregunta:", err);
                                        return reject("Error al actualizar pregunta.");
                                    }
                                    resolve();
                                });
                            }));

                            Promise.all(preguntasUpdates).then(resolve).catch(reject);
                        });
                    }));

                    Promise.all(indicadoresUpdates).then(resolve).catch(reject);
                });
            }));

            Promise.all(criteriosUpdates).then(() => {
                conexion.commit((err) => {
                    if (err) {
                        return conexion.rollback(() => res.status(500).json({ success: false, error: "Error al confirmar la actualización." }));
                    }
                    res.json({ success: true, message: "Evaluación actualizada correctamente." });
                });
            }).catch(error => {
                console.error(" Error en actualización:", error);
                return conexion.rollback(() => res.status(500).json({ success: false, error: error }));
            });
        });
    });
});
//ruta eliminar
router.delete("/api/eliminar-evaluacion/:id", (req, res) => {
    const idEvaluacion = req.params.id;

    if (!idEvaluacion) {
        return res.status(400).json({ success: false, error: "ID de evaluación no proporcionado." });
    }

    conexion.beginTransaction(err => {
        if (err) {
            console.error(" Error iniciando transacción:", err);
            return res.status(500).json({ success: false, error: "Error en la base de datos." });
        }

        //  Primero eliminar las preguntas asociadas a los indicadores de la evaluación
        const deletePreguntas = "DELETE FROM preguntas WHERE id_indLog IN (SELECT id_indLog FROM indicadores_logro WHERE id_criterio IN (SELECT id_criterio FROM criterios WHERE id_evaluacion = ?))";
        conexion.query(deletePreguntas, [idEvaluacion], err => {
            if (err) {
                return conexion.rollback(() => {
                    console.error(" Error eliminando preguntas:", err);
                    res.status(500).json({ success: false, error: "Error eliminando preguntas." });
                });
            }

            //  Luego eliminar los indicadores asociados
            const deleteIndicadores = "DELETE FROM indicadores_logro WHERE id_criterio IN (SELECT id_criterio FROM criterios WHERE id_evaluacion = ?)";
            conexion.query(deleteIndicadores, [idEvaluacion], err => {
                if (err) {
                    return conexion.rollback(() => {
                        console.error(" Error eliminando indicadores:", err);
                        res.status(500).json({ success: false, error: "Error eliminando indicadores." });
                    });
                }

                // 🔹 Luego eliminar los criterios asociados
                const deleteCriterios = "DELETE FROM criterios WHERE id_evaluacion = ?";
                conexion.query(deleteCriterios, [idEvaluacion], err => {
                    if (err) {
                        return conexion.rollback(() => {
                            console.error(" Error eliminando criterios:", err);
                            res.status(500).json({ success: false, error: "Error eliminando criterios." });
                        });
                    }

                    //  Finalmente eliminar la evaluación
                    const deleteEvaluacion = "DELETE FROM evaluaciones WHERE id_evaluacion = ?";
                    conexion.query(deleteEvaluacion, [idEvaluacion], err => {
                        if (err) {
                            return conexion.rollback(() => {
                                console.error(" Error eliminando evaluación:", err);
                                res.status(500).json({ success: false, error: "Error eliminando evaluación." });
                            });
                        }

                        //  Confirmar eliminación
                        conexion.commit(err => {
                            if (err) {
                                return conexion.rollback(() => {
                                    console.error(" Error confirmando eliminación:", err);
                                    res.status(500).json({ success: false, error: "Error al confirmar eliminación." });
                                });
                            }
                            res.json({ success: true, message: "Evaluación eliminada correctamente." });
                        });
                    });
                });
            });
        });
    });
});
//ruta subir puntajes cvs 
router.post("/uploadPuntajesCSV", upload.single("csvPuntajes"), (req, res) => {
    const cursoId = req.body.curso_id;
    const evaluacionId = req.body.evaluacion_id;
    const filePath = req.file.path;

    if (!cursoId || !evaluacionId || !filePath) {
        return res.status(400).json({ success: false, error: "Faltan datos." });
    }

    const puntajes = [];

    fs.createReadStream(filePath)
        .pipe(csvParser())
        .on("data", (row) => {
            if (row.codigo_estudiante) {
                let puntajeEstudiante = {
                    codigo_estudiante: row.codigo_estudiante,
                    curso_id: cursoId,
                    evaluacion_id: evaluacionId,
                    puntajes: Object.values(row).slice(1).map(p => parseFloat(p) || 0) // Tomar los puntajes desde la segunda columna
                };
                puntajes.push(puntajeEstudiante);
            }
        })
        .on("end", () => {
            if (puntajes.length === 0) {
                return res.status(400).json({ success: false, error: "El archivo CSV no contiene datos válidos." });
            }

            //  Eliminar los puntajes anteriores antes de insertar nuevos
            let deleteQuery = "DELETE FROM resultados WHERE curso_id = ? AND evaluacion_id = ?";
            conexion.query(deleteQuery, [cursoId, evaluacionId], (err) => {
                if (err) {
                    console.error(" Error al eliminar puntajes antiguos:", err);
                    return res.status(500).json({ success: false, error: "Error al eliminar puntajes antiguos." });
                }

                

                // Convertir codigo_estudiante a id_estudiante
                let codigos = puntajes.map(p => p.codigo_estudiante);
                

                let query = "SELECT estudiante_id, codigo_estudiante FROM estudiantes WHERE codigo_estudiante IN (?)";

                conexion.query(query, [codigos], (err, results) => {
                    if (err) {
                        console.error(" Error al obtener IDs de estudiantes:", err);
                        return res.status(500).json({ success: false, error: "Error en la base de datos." });
                    }

                    

                    if (results.length === 0) {
                        return res.status(400).json({ success: false, error: "Ningún código de estudiante fue encontrado en la base de datos." });
                    }

                    // Crear un mapa de código_estudiante -> estudiante_id
                    let codigoIdMap = {};
                    results.forEach(row => {
                        codigoIdMap[row.codigo_estudiante] = row.estudiante_id;
                    });

                    // Reemplazar codigo_estudiante por estudiante_id
                    let valoresInsertar = puntajes
                        .filter(p => codigoIdMap[p.codigo_estudiante]) // Filtrar estudiantes encontrados
                        .map(p => [
                            codigoIdMap[p.codigo_estudiante], //  Usar `estudiante_id` correcto
                            p.curso_id,
                            p.evaluacion_id,
                            JSON.stringify(p.puntajes)
                        ]);

                    

                    if (valoresInsertar.length === 0) {
                        return res.status(400).json({ success: false, error: "No se encontraron estudiantes en la base de datos para los códigos proporcionados." });
                    }

                    let insertQuery = "INSERT INTO resultados (id_estudiante, curso_id, evaluacion_id, puntajes) VALUES ?";
                    conexion.query(insertQuery, [valoresInsertar], (err) => {
                        if (err) {
                            console.error(" Error al guardar puntajes:", err);
                            return res.status(500).json({ success: false, error: "Error al guardar los puntajes." });
                        }

                        res.json({ success: true, message: " Puntajes guardados correctamente y datos anteriores eliminados." });
                        fs.unlinkSync(filePath); // Eliminar el archivo CSV después de procesarlo
                    });
                });
            });
        });
});

//llenado de la tabla
router.get("/api/puntajes/:curso_id/:evaluacion_id", (req, res) => {
    const cursoId = req.params.curso_id;
    const evaluacionId = req.params.evaluacion_id;

    if (!cursoId || !evaluacionId) {
        return res.status(400).json({ success: false, error: "Curso y evaluación son obligatorios." });
    }

    const query = `
        SELECT r.id_estudiante, e.nombre_estudiante, e.codigo_estudiante, r.puntajes
        FROM resultados r
        JOIN estudiantes e ON r.id_estudiante = e.estudiante_id
        WHERE r.curso_id = ? AND r.evaluacion_id = ?
    `;

    conexion.query(query, [cursoId, evaluacionId], (err, results) => {
        if (err) {
            console.error("❌ Error al obtener puntajes:", err);
            return res.status(500).json({ success: false, error: "Error al obtener puntajes." });
        }

        res.json({ success: true, puntajes: results });
    });
});
// obtener puntaje
router.get("/api/evaluacion/personalizada/:id_evaluacion", (req, res) => {
    const evaluacionId = req.params.id_evaluacion;

    if (!evaluacionId) {
        return res.status(400).json({ success: false, error: "Evaluación ID requerido." });
    }

    const query = `
        SELECT p.id_pregunta, p.puntaje, p.nombre, p.id_indLog
        FROM preguntas p
        JOIN indicadores_logro i ON p.id_indLog = i.id_indLog
        JOIN criterios c ON i.id_criterio = c.id_criterio
        JOIN evaluaciones e ON c.id_evaluacion = e.id_evaluacion
        WHERE e.id_evaluacion = ?`;

    conexion.query(query, [evaluacionId], (err, results) => {
        if (err) {
            console.error("❌ Error al obtener preguntas de la evaluación personalizada:", err);
            return res.status(500).json({ success: false, error: "Error en la base de datos." });
        }

        res.json({ success: true, tipo: "personalizada", preguntas: results });
    });
});
router.get("/api/evaluacion/predeterminada/:evaluacion_id", (req, res) => {
    const evaluacionId = req.params.evaluacion_id;

    if (!evaluacionId) {
        return res.status(400).json({ success: false, error: "Evaluación ID requerido." });
    }

    const query = `
        SELECT p.id_pregunta_base AS id_pregunta, p.puntaje AS puntaje, p.id_indLog_base AS id_indLog, p.nombre
        FROM preguntas_predeterminadas p
        JOIN indicadores_logro_predeterminados i ON p.id_indLog_base = i.id_indLog_base
        JOIN criterios_predeterminados c ON i.id_criterio_base = c.id_criterio_base
        JOIN evaluaciones_predeterminadas e ON c.id_evaluacion_base = e.id_evaluacion_base
        WHERE e.id_evaluacion_base = ?`;

    conexion.query(query, [evaluacionId], (err, results) => {
        if (err) {
            console.error("❌ Error al obtener preguntas de la evaluación predeterminada:", err);
            return res.status(500).json({ success: false, error: "Error en la base de datos." });
        }

        res.json({ success: true, tipo: "predeterminada", preguntas: results });
    });
});
//guardar resultados
router.post("/guardarResultados", (req, res) => {
    const resultados = req.body.resultados;

    if (!resultados || resultados.length === 0) {
        return res.status(400).json({ success: false, error: "No se recibieron resultados." });
    }

    const cursoId = resultados[0].curso_id;
    const evaluacionId = resultados[0].evaluacion_id;
    const tipoEvaluacion = resultados[0].tipo_evaluacion; //  Recibido del frontend

    //  Verificar si `evaluacion_id` existe en la tabla correcta
    const queryVerificarEvaluacion = tipoEvaluacion === "usuario"
        ? "SELECT id_evaluacion FROM evaluaciones WHERE id_evaluacion = ?"
        : "SELECT id_evaluacion_base FROM evaluaciones_predeterminadas WHERE id_evaluacion_base = ?";

    conexion.query(queryVerificarEvaluacion, [evaluacionId], (err, result) => {
        if (err) {
            console.error(" Error al verificar evaluación:", err);
            return res.status(500).json({ success: false, error: "Error en la base de datos al verificar la evaluación." });
        }

        if (result.length === 0) {
            return res.status(400).json({ success: false, error: `La evaluación con ID ${evaluacionId} no existe en la tabla ${tipoEvaluacion === "personalizada" ? "evaluaciones" : "evaluaciones_predeterminadas"}.` });
        }

        //  Obtener los códigos de los estudiantes
        let codigos = resultados.map(r => r.codigo_estudiante);

        let query = "SELECT estudiante_id, codigo_estudiante FROM estudiantes WHERE codigo_estudiante IN (?)";

        conexion.query(query, [codigos], (err, results) => {
            if (err) {
                console.error(" Error al obtener IDs de estudiantes:", err);
                return res.status(500).json({ success: false, error: "Error en la base de datos al obtener los estudiantes." });
            }

            if (results.length === 0) {
                return res.status(400).json({ success: false, error: "Ningún código de estudiante fue encontrado en la base de datos." });
            }

            //  Crear un mapa código_estudiante -> id_estudiante
            let codigoIdMap = {};
            results.forEach(row => {
                codigoIdMap[row.codigo_estudiante] = row.estudiante_id;
            });

            //  Reemplazar codigo_estudiante por id_estudiante
            let valoresInsertar = resultados
                .filter(r => codigoIdMap[r.codigo_estudiante])
                .map(r => [
                    codigoIdMap[r.codigo_estudiante],
                    r.curso_id,
                    r.evaluacion_id,
                    JSON.stringify(r.puntajes)
                ]);

            if (valoresInsertar.length === 0) {
                return res.status(400).json({ success: false, error: "No se encontraron estudiantes en la base de datos para los códigos proporcionados." });
            }

            //  Eliminar los resultados anteriores antes de insertar los nuevos
            let deleteQuery = "DELETE FROM resultados WHERE curso_id = ? AND evaluacion_id = ?";
            conexion.query(deleteQuery, [cursoId, evaluacionId], (err) => {
                if (err) {
                    console.error(" Error al eliminar resultados anteriores:", err);
                    return res.status(500).json({ success: false, error: "Error al eliminar resultados anteriores." });
                }

                console.log(" Resultados anteriores eliminados correctamente.");

                let insertQuery = "INSERT INTO resultados (id_estudiante, curso_id, evaluacion_id, puntajes) VALUES ?";
                conexion.query(insertQuery, [valoresInsertar], (err) => {
                    if (err) {
                        console.error(" Error al guardar nuevos resultados:", err);
                        return res.status(500).json({ success: false, error: "Error al guardar los resultados." });
                    }

                    res.json({ success: true, message: ` Resultados guardados correctamente para evaluación ${tipoEvaluacion}.` });
                });
            });
        });
    });
});
//calculo de resultados
router.get("/api/calcular-niveles/:curso_id/:evaluacion_id", (req, res) => {
    const { curso_id, evaluacion_id } = req.params;

    //  1. Obtener los puntajes de los estudiantes
    const queryResultados = `
        SELECT r.id_estudiante, e.nombre_estudiante, e.codigo_estudiante, r.puntajes
        FROM resultados r
        JOIN estudiantes e ON r.id_estudiante = e.estudiante_id
        WHERE r.curso_id = ? AND r.evaluacion_id = ?`;

    conexion.query(queryResultados, [curso_id, evaluacion_id], (err, resultados) => {
        if (err) {
            console.error(" Error al obtener puntajes:", err);
            return res.status(500).json({ success: false, error: "Error en la base de datos." });
        }

        if (resultados.length === 0) {
            return res.json({ success: false, error: "No hay resultados registrados." });
        }

        //  2. Obtener la estructura de la evaluación
        const queryEstructura = `
            SELECT p.id_pregunta, p.puntaje, p.id_indLog, i.id_criterio, i.nombre AS nombre_indicador, c.nombre AS nombre_criterio,
                   cli.nivel_basico AS nivel_basico_ind, cli.nivel_intermedio AS nivel_intermedio_ind, cli.nivel_alto AS nivel_alto_ind,
                   clc.nivel_basico AS nivel_basico_crit, clc.nivel_intermedio AS nivel_intermedio_crit, clc.nivel_alto AS nivel_alto_crit
            FROM preguntas p
            JOIN indicadores_logro i ON p.id_indLog = i.id_indLog
            JOIN criterios c ON i.id_criterio = c.id_criterio
            JOIN clasificador_niveles_indicador cli ON i.id_indLog = cli.id_indicador
            JOIN clasificador_niveles_criterio clc ON c.id_criterio = clc.id_criterio
            WHERE c.id_evaluacion = ?`;

        conexion.query(queryEstructura, [evaluacion_id], (err, estructura) => {
            if (err) {
                console.error(" Error al obtener estructura de evaluación:", err);
                return res.status(500).json({ success: false, error: "Error en la base de datos." });
            }

            if (estructura.length === 0) {
                return res.json({ success: false, error: "No se encontró la estructura de la evaluación." });
            }

            let indicadores = {};
            let criterios = {};
            let trazabilidad = [];
            let nivelesResultados = [];

            // Mapear niveles desde la BD
            estructura.forEach(p => {
                if (!indicadores[p.id_indLog]) {
                    indicadores[p.id_indLog] = {
                        maximo: 0, suma: 0, id_criterio: p.id_criterio,
                        nivel_basico: p.nivel_basico_ind,
                        nivel_intermedio: p.nivel_intermedio_ind,
                        nivel_alto: p.nivel_alto_ind
                    };
                }
                if (!criterios[p.id_criterio]) {
                    criterios[p.id_criterio] = {
                        maximo: 0, suma: 0,
                        nivel_basico: p.nivel_basico_crit,
                        nivel_intermedio: p.nivel_intermedio_crit,
                        nivel_alto: p.nivel_alto_crit
                    };
                }
                indicadores[p.id_indLog].maximo += p.puntaje;
                criterios[p.id_criterio].maximo += p.puntaje;
            });

            // Procesar los datos de cada estudiante
            resultados.forEach(estudiante => {
                let puntajes = JSON.parse(estudiante.puntajes);
                let niveles = {};
                let trazabilidadEstudiante = { estudiante: estudiante.nombre_estudiante, indicadores: {}, criterios: {}, resultado: {} };
                 // Reiniciar las sumas de indicadores y criterios por estudiante
                let sumaIndicadores = {};
                let sumaCriterios = {};

                // Calcular Indicadores de Logro
                estructura.forEach((p, index) => {
                    let puntaje = puntajes[index] || 0;
            
                    // Indicadores
                    if (!sumaIndicadores[p.id_indLog]) sumaIndicadores[p.id_indLog] = 0;
                    sumaIndicadores[p.id_indLog] += puntaje;
            
                    // Criterios
                    if (!sumaCriterios[p.id_criterio]) sumaCriterios[p.id_criterio] = 0;
                    sumaCriterios[p.id_criterio] += puntaje;
                });

                for (let indLog in sumaIndicadores) {
                    const total = sumaIndicadores[indLog];
                    const ref = indicadores[indLog];
                    const maximo = ref.maximo;
            
                    const nivel = total <= ref.nivel_basico ? "Básico" :
                                  total >= ref.nivel_alto ? "Avanzado" : "Intermedio";
            
                    niveles[indLog] = nivel;
            
                    const indObj = estructura.find(p => String(p.id_indLog) === String(indLog));
                    trazabilidadEstudiante.indicadores[indLog] = {
                        nombre: indObj?.nombre || indObj?.nombre_indicador || "Indicador",
                        puntaje: parseFloat(total.toFixed(3)),
                        maximo,
                        nivel
                    };
                }
                // Calcular niveles por criterio + valores invisibles
                let valorInvisibleRA = 0;
                let maxInvisibleRA = 0;
                let sumaRealRA = 0;
                let maxRealRA = 0;
                // Calcular Criterios de Evaluación
                for (let critId in sumaCriterios) {
                    const total = sumaCriterios[critId];
                    const ref = criterios[critId];
                    const maximo = ref.maximo;
            
                    const nivel = total <= ref.nivel_basico ? "Básico" :
                                  total >= ref.nivel_alto ? "Avanzado" : "Intermedio";
            
                    const critObj = estructura.find(p => String(p.id_criterio) === String(critId));
                    trazabilidadEstudiante.criterios[critId] = {
                        nombre: critObj?.criterio || critObj?.nombre_criterio || "Criterio",
                        puntaje: parseFloat(total.toFixed(3)),
                        maximo,
                        nivel
                    };
                    // ➕ Valor invisible según el nivel alcanzado
                    if (nivel === "Básico") {
                        valorInvisibleRA += ref.nivel_basico;
                    } else if (nivel === "Intermedio") {
                        valorInvisibleRA += ref.nivel_intermedio;
                    } else if (nivel === "Avanzado") {
                        valorInvisibleRA += ref.nivel_alto;
                    }

                    maxInvisibleRA += ref.nivel_alto;
                    sumaRealRA += total;
                    maxRealRA += maximo;
                }

                // Calcular Resultado de Aprendizaje (RA)
                const nivelRA = valorInvisibleRA <= maxInvisibleRA * 0.4 ? "Básico" :
                    valorInvisibleRA >= maxInvisibleRA * 0.8 ? "Avanzado" : "Intermedio";
            
                trazabilidadEstudiante.resultado = {
                    puntaje: parseFloat(sumaRealRA.toFixed(3)),    //  Este es el real que se muestra
                    maximo: parseFloat(maxRealRA.toFixed(3)),
                    nivel: nivelRA           //  Este es el calculado por los niveles invisibles
                };
            
                trazabilidad.push(trazabilidadEstudiante);

                nivelesResultados.push({
                    estudiante_id: estudiante.id_estudiante,
                    nombre: estudiante.nombre_estudiante,
                    codigo: estudiante.codigo_estudiante,
                    niveles
                });
            });

            // 🔹 Guardar los resultados en la BD sin promise()
            conexion.query("DELETE FROM resultados_niveles WHERE curso_id = ? AND evaluacion_id = ?", [curso_id, evaluacion_id], (err) => {
                if (err) {
                    console.error(" Error al limpiar registros anteriores:", err);
                    return res.status(500).json({ success: false, error: "Error en la base de datos." });
                }

                const valoresInsertar = nivelesResultados.map(est => [
                    est.estudiante_id, curso_id, evaluacion_id, JSON.stringify(est.niveles),
                    JSON.stringify(trazabilidad.find(t => t.estudiante === est.nombre)),
                    "usuario"

                ]);

                const queryInsert = `
                    INSERT INTO resultados_niveles (id_estudiante, curso_id, evaluacion_id, nivel, trazabilidad, tipo_evaluacion)
                    VALUES ?`;

                conexion.query(queryInsert, [valoresInsertar], (err) => {
                    if (err) {
                        console.error(" Error al guardar niveles:", err);
                        return res.status(500).json({ success: false, error: "Error al guardar los niveles." });
                    }

                    res.json({ success: true, message: " Niveles calculados y guardados correctamente.", datos: nivelesResultados, trazabilidad: trazabilidad });
                });
            });
        });
    });
});
router.get("/api/calcular-niveles-predeterminada/:curso_id/:evaluacion_id", (req, res) => {
    const { curso_id, evaluacion_id } = req.params;

    //  1. Obtener los puntajes de los estudiantes
    const queryResultados = `
        SELECT r.id_estudiante, e.nombre_estudiante, e.codigo_estudiante, r.puntajes
        FROM resultados r
        JOIN estudiantes e ON r.id_estudiante = e.estudiante_id
        WHERE r.curso_id = ? AND r.evaluacion_id = ?
    `;

    conexion.query(queryResultados, [curso_id, evaluacion_id], (err, resultados) => {
        if (err) {
            console.error(" Error al obtener puntajes:", err);
            return res.status(500).json({ success: false, error: "Error en la base de datos." });
        }

        if (resultados.length === 0) {
            return res.json({ success: false, error: "No hay resultados registrados." });
        }

        //  2. Obtener la estructura de la evaluación predeterminada
        const queryEstructura = `
            SELECT p.id_pregunta_base AS id_pregunta, p.puntaje, p.id_indLog_base AS id_indLog, i.id_criterio_base AS id_criterio, i.nombre AS nombre_indicador, c.nombre AS nombre_criterio, 
                cli.nivel_basico AS nivel_basico_ind, cli.nivel_intermedio AS nivel_intermedio_ind, cli.nivel_alto AS nivel_alto_ind,
                clc.nivel_basico AS nivel_basico_crit, clc.nivel_intermedio AS nivel_intermedio_crit, clc.nivel_alto AS nivel_alto_crit
            FROM preguntas_predeterminadas p
            JOIN indicadores_logro_predeterminados i ON p.id_indLog_base = i.id_indLog_base
            JOIN criterios_predeterminados c ON i.id_criterio_base = c.id_criterio_base
            JOIN clasificador_niveles_indpredeter cli ON i.id_indLog_base = cli.id_indicador
            JOIN clasificador_niveles_critpredeter clc ON c.id_criterio_base = clc.id_criterio
            WHERE c.id_evaluacion_base = ?
        `;

        conexion.query(queryEstructura, [evaluacion_id], (err, estructura) => {
            if (err) {
                console.error(" Error al obtener estructura de evaluación predeterminada:", err);
                return res.status(500).json({ success: false, error: "Error en la base de datos." });
            }

            if (estructura.length === 0) {
                return res.json({ success: false, error: "No se encontró la estructura de la evaluación predeterminada." });
            }

            let indicadores = {};
            let criterios = {};
            let trazabilidad = [];
            let nivelesResultados = [];

            //  3. Mapear niveles desde la BD
            estructura.forEach(p => {
                if (!indicadores[p.id_indLog]) {
                    indicadores[p.id_indLog] = {
                        maximo: 0, suma: 0, id_criterio: p.id_criterio,
                        nivel_basico: p.nivel_basico_ind,
                        nivel_intermedio: p.nivel_intermedio_ind,
                        nivel_alto: p.nivel_alto_ind
                    };
                }
                if (!criterios[p.id_criterio]) {
                    criterios[p.id_criterio] = {
                        maximo: 0, suma: 0,
                        nivel_basico: p.nivel_basico_crit,
                        nivel_intermedio: p.nivel_intermedio_crit,
                        nivel_alto: p.nivel_alto_crit
                    };
                }
                indicadores[p.id_indLog].maximo += p.puntaje;
                criterios[p.id_criterio].maximo += p.puntaje;
            });

            //  4. Procesar los datos de cada estudiante
            resultados.forEach(estudiante => {
                let puntajes = JSON.parse(estudiante.puntajes);
                let niveles = {};
                let trazabilidadEstudiante = { estudiante: estudiante.nombre_estudiante, indicadores: {}, criterios: {}, resultado: {} };

                // Reiniciar las sumas de indicadores y criterios por estudiante
                let sumaIndicadores = {};
                let sumaCriterios = {};
                
                //  5. Calcular Indicadores de Logro
                estructura.forEach((p, index) => {
                    let puntaje = puntajes[index] || 0;
            
                    // Indicadores
                    if (!sumaIndicadores[p.id_indLog]) sumaIndicadores[p.id_indLog] = 0;
                    sumaIndicadores[p.id_indLog] += puntaje;
            
                    // Criterios
                    if (!sumaCriterios[p.id_criterio]) sumaCriterios[p.id_criterio] = 0;
                    sumaCriterios[p.id_criterio] += puntaje;
                });

                for (let indLog in sumaIndicadores) {
                    const total = sumaIndicadores[indLog];
                    const ref = indicadores[indLog];
                    const maximo = ref.maximo;
            
                    const nivel = total <= ref.nivel_basico ? "Básico" :
                                  total >= ref.nivel_alto ? "Avanzado" : "Intermedio";
            
                    niveles[indLog] = nivel;
            
                    const indObj = estructura.find(p => String(p.id_indLog) === String(indLog));
                    trazabilidadEstudiante.indicadores[indLog] = {
                        nombre: indObj?.nombre || indObj?.nombre_indicador || "Indicador",
                        puntaje: parseFloat(total.toFixed(3)),
                        maximo,
                        nivel
                    };
                }            
                let valorInvisibleRA = 0;
                let maxInvisibleRA = 0;
                let sumaRealRA = 0;
                let maxRealRA = 0;
                //  6. Calcular Criterios de Evaluación
                for (let critId in sumaCriterios) {
                    const total = sumaCriterios[critId];
                    const ref = criterios[critId];
                    const maximo = ref.maximo;
            
                    const nivel = total <= ref.nivel_basico ? "Básico" :
                                  total >= ref.nivel_alto ? "Avanzado" : "Intermedio";
            
                    const critObj = estructura.find(p => String(p.id_criterio) === String(critId));
                    trazabilidadEstudiante.criterios[critId] = {
                        nombre: critObj?.criterio || critObj?.nombre_criterio || "Criterio",
                        puntaje: parseFloat(total.toFixed(3)),
                        maximo,
                        nivel
                    };
                
                    // ➕ Agregar al valor invisible según el nivel alcanzado
                    if (nivel === "Básico") {
                        valorInvisibleRA += ref.nivel_basico;
                    } else if (nivel === "Intermedio") {
                        valorInvisibleRA += ref.nivel_intermedio;
                    } else if (nivel === "Avanzado") {
                        valorInvisibleRA += ref.nivel_alto;
                    }
        
                    maxInvisibleRA += ref.nivel_alto; // El máximo posible para cada criterio es su nivel alto
                    sumaRealRA += total;
                    maxRealRA += maximo;
                }
                //  7. Calcular Resultado de Aprendizaje (RA)
                const nivelRA = valorInvisibleRA <= maxInvisibleRA * 0.4 ? "Básico" :
                valorInvisibleRA >= maxInvisibleRA * 0.8 ? "Avanzado" :
                "Intermedio";

                trazabilidadEstudiante.resultado = {
                    puntaje: parseFloat(sumaRealRA.toFixed(3)),     //  Este es el real que se muestra
                    maximo: parseFloat(maxRealRA.toFixed(3)),
                    nivel: nivelRA 
                };

                trazabilidad.push(trazabilidadEstudiante);

                nivelesResultados.push({
                    estudiante_id: estudiante.id_estudiante,
                    nombre: estudiante.nombre_estudiante,
                    codigo: estudiante.codigo_estudiante,
                    niveles
                });
            });
            //  8. Guardar los resultados en la BD
            conexion.query("DELETE FROM resultados_niveles WHERE curso_id = ? AND evaluacion_id = ?", [curso_id, evaluacion_id], (err) => {
                if (err) {
                    console.error(" Error al limpiar registros anteriores:", err);
                    return res.status(500).json({ success: false, error: "Error en la base de datos." });
                }

                const valoresInsertar = nivelesResultados.map(est => [
                    est.estudiante_id, curso_id, evaluacion_id, JSON.stringify(est.niveles),
                    JSON.stringify(trazabilidad.find(t => t.estudiante === est.nombre)),
                    "predeterminada"
                ]);

                const queryInsert = `
                    INSERT INTO resultados_niveles (id_estudiante, curso_id, evaluacion_id, nivel, trazabilidad, tipo_evaluacion)
                    VALUES ?
                `;

                conexion.query(queryInsert, [valoresInsertar], (err) => {
                    if (err) {
                        console.error(" Error al guardar niveles:", err);
                        return res.status(500).json({ success: false, error: "Error al guardar los niveles." });
                    }

                    res.json({ success: true, message: " Niveles calculados y guardados correctamente.", datos: nivelesResultados, trazabilidad: trazabilidad });
                });
            });
        });
    });
});

module.exports = router;
