//imports 
const express = require("express");
const router = express.Router();
const conexion= require("../config/conexion");
const link= require("../config/link")

//ruteo del dashboard
router.get("/dashboard", function(req,res){
    if(!req.session.login){
        res.render("login",{link});
    }else{
        res.render("dashboard",{datos: req.session,link});
        
    }
});
// Ruteo del contenido dinámico del dashboard (sin el layout)
module.exports =router;