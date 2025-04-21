//imports
const express = require("express");
const router = express.Router();
const conexion= require("../config/conexion");
const link= require("../config/link");
const bcryptjs = require("bcryptjs");

//definimos ruta
router.post("/codLog", async function(req,res) {
    const email = req.body.logemail;
    const pass = req.body.logcont;

    const validar = "SELECT *FROM usuarios where correo = ?"
    conexion.query(validar,[email], async function(err,row){
        let mensaje;
        if(err){
            console.log("error en la consulta para validar correo",err);
            return res.status(500).send("Error en el servidor");
        }
        if(row.length < 1){
            mensaje = "El correo ingresado no existe";
            res.render("login",{mensaje,link});
        }else{
            //validar la contraseña
            const user = row[0];
            const match = await bcryptjs.compare(pass,user.contraseña);
            if(!match){
                mensaje ="contraseña incorrecta";
                res.render("login",{mensaje,link});
            }else{
                req.session.login = true;
                req.session.usuarioid = user.usuario_id;
                req.session.nombreusuario = user.nombre_usuario;
                req.session.correo1 = user.correo;
                req.session.contraseña1 = user.contraseña;
                req.session.creadoen = user.creado_en;
                req.session.nombreC = user.nombre_C;
                req.session.fotoPerfil  = user.fotoPerfil || "/images/customer01.jpg";
                console.log(req.session);//comprobar los datos de la session
                res.render("dashboard",{datos: req.session,link});

            }
        }

    });

});
module.exports =router;
