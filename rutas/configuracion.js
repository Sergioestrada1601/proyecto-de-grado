const express = require("express");
const bcrypt = require("bcrypt"); // Para encriptar contraseñas
const router = express.Router();
const conexion = require("../config/conexion");
const multer = require("multer");
const path = require("path");

// Configuración de Multer para cargar imágenes
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../public/uploads"));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});
const upload = multer({ 
    storage, 
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB de límite
    fileFilter: (req, file, cb) => {
        // Solo permitir imágenes
        const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif"];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Formato de archivo no permitido. Solo JPG, PNG y GIF."));
        }
    }
});

// Ruta para obtener la configuración del usuario
router.get("/configuracion", function (req, res) {
    if (!req.session.login) {
        return res.redirect("/login"); // Redirigir si no hay sesión activa
    }
    res.render("configuracion", { datos: req.session });
});
//ruta para actualizar perfil
router.post("/updateProfile", (req, res) => {
    upload.single("fotoPerfil")(req, res, function (err) {
        if (err) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.json({ success: false, error: "El archivo es demasiado grande" });
            } else {
                return res.json({ success: false, error: "Formato de archivo no permitido" });
            }
        }

        if (!req.session.login) {
            return res.json({ success: false, error: "No autorizado. Inicia sesión nuevamente." });
        }

        const { nombreCompleto, nombreUsuario, correo } = req.body;
        const fotoPerfil = req.file ? `/uploads/${req.file.filename}` : req.session.fotoPerfil;
        const usuarioid = req.session.usuarioid;

        if (!usuarioid) {
            return res.json({ success: false, error: "Usuario no identificado" });
        }

        const query = `
            UPDATE usuarios 
            SET nombre_C = ?, nombre_usuario = ?, correo = ?, fotoPerfil = ?
            WHERE usuario_id = ?
        `;

        conexion.query(query, [nombreCompleto, nombreUsuario, correo, fotoPerfil, usuarioid], (err, result) => {
            if (err) {
                console.error("Error al actualizar el perfil:", err);
                return res.json({ success: false, error: "Error al actualizar el perfil" });
            }

            if (result.affectedRows > 0) {
                req.session.nombreC = nombreCompleto;
                req.session.nombreusuario = nombreUsuario;
                req.session.correo1 = correo;
                req.session.fotoPerfil = fotoPerfil;

                return res.json({
                    success: true,
                    message: "Perfil actualizado correctamente",
                    datos: {
                        nombreC: nombreCompleto,
                        nombreUsuario: nombreUsuario,
                        correo1: correo,
                        fotoPerfil: fotoPerfil,
                    },
                });
            } else {
                return res.json({ success: false, error: "No se pudo actualizar el perfil" });
            }
        });
    });
});



// 🚀 **Ruta para cambiar la contraseña**
router.post("/changePassword", (req, res) => {
    if (!req.session.login) {
        return res.status(401).json({ success: false, error: "No autorizado" });
    }

    console.log("Datos recibidos en /changePassword:", req.body);

    const { oldPassword, newPassword, confirmPassword } = req.body;
    const usuarioid = req.session.usuarioid;

    if (!usuarioid) {
        return res.status(400).json({ success: false, error: "Usuario no identificado" });
    }

    if (!oldPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ success: false, error: "Todos los campos son obligatorios" });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ success: false, error: "Las contraseñas no coinciden" });
    }

    const getPasswordQuery = `SELECT contraseña FROM usuarios WHERE usuario_id = ?`;

    conexion.query(getPasswordQuery, [usuarioid], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, error: "Error interno del servidor" });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, error: "Usuario no encontrado" });
        }

        const hashedPassword = results[0].contraseña;

        bcrypt.compare(oldPassword, hashedPassword, (err, isMatch) => {
            if (err) {
                return res.status(500).json({ success: false, error: "Error interno del servidor" });
            }

            if (!isMatch) {
                return res.status(400).json({ success: false, error: "La contraseña actual es incorrecta" });
            }

            bcrypt.hash(newPassword, 10, (err, hashedNewPassword) => {
                if (err) {
                    return res.status(500).json({ success: false, error: "Error interno del servidor" });
                }

                const updatePasswordQuery = `UPDATE usuarios SET contraseña = ? WHERE usuario_id = ?`;

                conexion.query(updatePasswordQuery, [hashedNewPassword, usuarioid], (err, result) => {
                    if (err) {
                        return res.status(500).json({ success: false, error: "Error interno del servidor" });
                    }

                    if (result.affectedRows > 0) {
                        return res.json({ success: true, message: "Contraseña actualizada correctamente" });
                    } else {
                        return res.status(400).json({ success: false, error: "No se pudo actualizar la contraseña" });
                    }
                });
            });
        });
    });
});


module.exports = router;
