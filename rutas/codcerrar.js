//imports
const express = require("express");
const router = express.Router();
const conexion= require("../config/conexion");
const link= require("../config/link");
const bcryptjs = require("bcryptjs");

//cerrar sesion
router.post("/codcerrar",function(req,res){
    req.session.destroy((err) => {
        if (err) {
            console.log("Error al cerrar sesión", err);
            return res.status(500).send("Error en el servidor al cerrar sesión");
        }else{
            console.log(req.session);
            mensaje ="hola";
            res.render("login",{mensaje,link}); // Redirige al login después de cerrar la sesión
        }
        
    });
});

module.exports = router
