//imports
const express = require("express");
const router = express.Router();
const conexion= require("../config/conexion");
const link= require("../config/link");
const bcryptjs = require("bcryptjs");
router.use(express.json());
router.use(express.urlencoded({ extended: true }));


//enlace y obtencion de los datos
router.post("/regUs", async function (req, res) {
    console.log(req.body);
    const nombre_c = req.body.nombre_C;
    const nombre_u = req.body.nombre_U;
    const cor = req.body.correo;
    const contra = req.body.contraseña;

    try {
        const hashedpas = await bcryptjs.hash(contra, 10);

        // Insertar usuario en la base de datos
        const insertarUsuario = "INSERT INTO usuarios (nombre_usuario, correo, contraseña, tipo, nombre_C) VALUES (?, ?, ?, ?, ?)";
        conexion.query(insertarUsuario, [nombre_u, cor, hashedpas, 'profesor', nombre_c], function (err, result) {
            if (err) {
                console.log("Error al intentar registrar usuario:", err);
                return res.status(500).send("Error al registrar usuario");
            }

            const usuarioId = result.insertId; // Obtener el ID del usuario recién creado

            // Copiar puntajes predeterminados al nuevo usuario
            const copiarPuntajes = `
                INSERT INTO puntajes (usuario_id, resultado_aprendizaje, criterio, subcriterio, pregunta, puntaje)
                SELECT ?, resultado_aprendizaje, criterio, subcriterio, pregunta, puntaje FROM puntajes_predeterminados
            `;

            conexion.query(copiarPuntajes, [usuarioId], function (err) {
                if (err) {
                    console.log("Error al copiar puntajes predeterminados:", err);
                    return res.status(500).send("Error al asignar puntajes predeterminados");
                }

                console.log("Registro exitoso y puntajes asignados.");
                res.render("login", { mensaje: "Registro exitoso, ya puedes iniciar sesión", link });
            });
        });
    } catch (error) {
        console.error("Error en el servidor:", error);
        res.status(500).send("Error en el servidor");
    }
});

module.exports = router