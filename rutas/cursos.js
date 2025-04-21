const express = require("express");
const router = express.Router();
const conexion = require("../config/conexion");
const link = require("../config/link");

// Ruta para mostrar la página de cursos
router.get("/cursos", (req, res) => {
    if (!req.session.login) {
        return res.render("login", { link });
    }

    const usuarioId = req.session.usuarioid;

    // Consulta para obtener los cursos y el número de estudiantes en cada curso
    const query = `
        SELECT c.curso_id, c.nombre_curso, c.colegio, 
               (SELECT COUNT(*) FROM estudiantes e WHERE e.curso_id = c.curso_id) AS num_estudiantes
        FROM cursos c
        WHERE c.usuario_id = ?`;

    conexion.query(query, [usuarioId], (err, resultados) => {
        if (err) {
            console.error("Error al obtener los cursos: ", err);
            return res.status(500).send("Error en la base de datos");
        }

        // Renderizar la vista de cursos con la cantidad de estudiantes
        res.render("cursos", { datos: req.session, cursos: resultados, link });
    });
});


router.post("/addCourse", (req, res) => {
    const { nombre_curso, colegio } = req.body;
    const usuarioId = req.session.usuarioid;

    // Validar que los campos no estén vacíos
    if (!nombre_curso || !colegio) {
        return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    const query = "INSERT INTO cursos (nombre_curso, usuario_id, colegio) VALUES (?, ?, ?)";

    conexion.query(query, [nombre_curso, usuarioId, colegio], (err) => {
        if (err) {
            console.error("Error al agregar el curso: ", err);
            return res.status(500).json({ error: "Error en la base de datos" });
        }

        
        res.redirect("dashboard?section=cursos&status=success");
    });
});
router.delete('/deleteCourse/:id', (req, res) => {
    const cursoId = req.params.id;

    //  Eliminar estudiantes relacionados con el curso
    const deleteStudentsQuery = 'DELETE FROM estudiantes WHERE curso_id = ?';

    conexion.query(deleteStudentsQuery, [cursoId], (err, result) => {
        if (err) {
            console.error('❌ Error al eliminar estudiantes:', err);
            return res.status(500).json({ error: 'Error al eliminar los estudiantes del curso' });
        }

        

        //  Eliminar el curso después de borrar los estudiantes
        const deleteCourseQuery = 'DELETE FROM cursos WHERE curso_id = ?';

        conexion.query(deleteCourseQuery, [cursoId], (err, result) => {
            if (err) {
                console.error('❌ Error al eliminar el curso:', err);
                return res.status(500).json({ error: 'Error al eliminar el curso de la base de datos' });
            }

            if (result.affectedRows > 0) {
                
                return res.status(200).json({ message: 'Curso y estudiantes eliminados exitosamente' });
            } else {
                return res.status(404).json({ error: 'Curso no encontrado' });
            }
        });
    });
});

router.post('/editCourse', (req, res) => {
    const { curso_id, nombre_curso, colegio } = req.body;
    console.log("Datos recibidos en el backend:", {curso_id, nombre_curso, colegio });
    if (!curso_id || !nombre_curso || !colegio) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const query = 'UPDATE cursos SET nombre_curso = ?, colegio = ? WHERE curso_id = ?';

    conexion.query(query, [nombre_curso, colegio, curso_id], (err, result) => {
        if (err) {
            console.error('Error al actualizar el curso: ', err);
            return res.status(500).json({ error: 'Error al actualizar el curso en la base de datos' });
        }

        if (result.affectedRows > 0) {
            return res.status(200).json({ message: 'Curso actualizado exitosamente' });
        } else {
            return res.status(404).json({ error: 'Curso no encontrado' });
        }
    });
});
router.post("/duplicateCourse/:id", (req, res) => {
    const cursoId = req.params.id;
    const usuarioId = req.session.usuarioid;

    // 🔹 Clonar el curso con un nuevo nombre
    const duplicateCourseQuery = `
        INSERT INTO cursos (nombre_curso, usuario_id, colegio)
        SELECT CONCAT(nombre_curso, ' (Copia)'), usuario_id, colegio 
        FROM cursos WHERE curso_id = ? AND usuario_id = ?`;

    conexion.query(duplicateCourseQuery, [cursoId, usuarioId], (err, result) => {
        if (err) {
            console.error("❌ Error al duplicar curso:", err);
            return res.status(500).json({ error: "Error en la base de datos" });
        }

        const nuevoCursoId = result.insertId;

        // 🔹 Clonar estudiantes del curso original al nuevo curso
        const duplicateStudentsQuery = `
            INSERT INTO estudiantes (codigo_estudiante, nombre_estudiante, edad, correo, curso_id)
            SELECT codigo_estudiante, nombre_estudiante, edad, correo, ? FROM estudiantes WHERE curso_id = ?`;

        conexion.query(duplicateStudentsQuery, [nuevoCursoId, cursoId], (err) => {
            if (err) {
                console.error("❌ Error al duplicar estudiantes:", err);
                return res.status(500).json({ error: "Error al duplicar estudiantes" });
            }

            // 🔹 Obtener los datos del nuevo curso duplicado para actualizar la UI
            const getNewCourseQuery = `SELECT * FROM cursos WHERE curso_id = ?`;

            conexion.query(getNewCourseQuery, [nuevoCursoId], (err, newCourse) => {
                if (err) {
                    console.error("❌ Error al obtener el curso duplicado:", err);
                    return res.status(500).json({ error: "Error en la base de datos" });
                }

                res.status(200).json({ message: "Curso duplicado exitosamente", curso: newCourse[0] });
            });
        });
    });
});

module.exports = router;