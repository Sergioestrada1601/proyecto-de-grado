//imports 
const express = require("express");
const router = express.Router();
const conexion= require("../config/conexion");
const link= require("../config/link")




router.get("/inicio", function (req, res) {
    if (!req.session.login) {
        return res.redirect("/login"); // Redirigir si no hay sesión activa
    }
    res.render("inicio", { datos: req.session });
});

// Ruteo del contenido dinámico del dashboard (sin el layout)
module.exports =router;