const express = require("express");
const router = express.Router();
const conexion = require("../config/conexion");
const link = require("../config/link");
const multer = require("multer");
const csvParser = require("csv-parser");
const fs = require("fs");

const upload = multer({ dest: "uploads/" });
router.post("/uploadCSV", upload.single("csvFile"), (req, res) => {
    const cursoId = req.body.curso_id;
    const filePath = req.file.path;

    if (!cursoId || !filePath) {
        return res.status(400).json({ success: false, error: "Faltan datos." });
    }

    const estudiantes = [];

    fs.createReadStream(filePath)
        .pipe(csvParser())
        .on("data", (row) => {
            if (row.codigo && row.nombre && row.edad && row.email) {
                estudiantes.push([
                    row.codigo,
                    row.nombre,
                    row.edad,
                    row.email,
                    cursoId
                ]);
            }
        })
        .on("end", () => {
            const query = "INSERT INTO estudiantes (codigo_estudiante, nombre_estudiante, edad, correo, curso_id) VALUES ?";
            conexion.query(query, [estudiantes], (err) => {
                if (err) {
                    console.error("Error al insertar estudiantes:", err);
                    return res.status(500).json({ success: false, error: "Error al guardar los estudiantes." });
                }

                res.json({ success: true, message: "Estudiantes agregados correctamente." });
                fs.unlinkSync(filePath); // Eliminar el archivo CSV después de procesarlo
            });
        });
});
router.get("/api/estudiantes", (req, res) => {
    if (!req.session.login) {
        return res.status(401).json({ success: false, error: "No autorizado" });
    }

    const cursoId = req.query.curso_id;
    if (!cursoId) {
        return res.status(400).json({ success: false, error: "Curso no especificado" });
    }

    const query = "SELECT codigo_estudiante, nombre_estudiante FROM estudiantes WHERE curso_id = ?";
    
    conexion.query(query, [cursoId], (err, resultados) => {
        if (err) {
            console.error("Error al obtener los estudiantes:", err);
            return res.status(500).json({ success: false, error: "Error en la base de datos" });
        }

        res.json({ success: true, estudiantes: resultados, total_estudiantes: resultados.length });
    });
});

// 📌 Ruta para agregar un estudiante
router.post("/addStudent", (req, res) => {
    const { codigo_estudiante, nombre_estudiante, edad, correo, curso_id } = req.body;

    if (!codigo_estudiante || !nombre_estudiante || !edad || !correo || !curso_id) {
        return res.status(400).json({ error: "Todos los campos son obligatorios." });
    }

    const query = "INSERT INTO estudiantes (codigo_estudiante, nombre_estudiante, edad, correo, curso_id) VALUES (?, ?, ?, ?, ?)";
    
    conexion.query(query, [codigo_estudiante, nombre_estudiante, edad, correo, curso_id], (err, result) => {
        if (err) {
            console.error("Error al agregar estudiante: ", err);
            return res.status(500).json({ error: "Error al agregar el estudiante a la base de datos." });
        }

        return res.status(201).json({ message: "Estudiante agregado exitosamente.", estudiante_id: result.insertId });
    });
});
// 📌 Ruta para eliminar estudiantes seleccionados
// 📌 Ruta para eliminar estudiantes con `fetch()`
router.post("/deleteStudent", (req, res) => {
    let { estudiantes, curso_id } = req.body;

    if (!estudiantes || !Array.isArray(estudiantes) || estudiantes.length === 0 || !curso_id) {
        return res.status(400).json({ success: false, error: "Debe seleccionar al menos un estudiante y el curso." });
    }

    const placeholders = estudiantes.map(() => "?").join(",");
    const query = `DELETE FROM estudiantes WHERE codigo_estudiante IN (${placeholders}) AND curso_id = ?`;

    conexion.query(query, [...estudiantes, curso_id], (err, result) => {
        if (err) {
            console.error("❌ Error al eliminar estudiantes:", err);
            return res.status(500).json({ success: false, error: "Error en la base de datos." });
        }

        return res.status(200).json({ success: true, message: "Estudiantes eliminados exitosamente.", affectedRows: result.affectedRows });
    });
});



module.exports = router;
