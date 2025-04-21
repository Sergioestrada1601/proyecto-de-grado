//import librerias
const express = require("express");
const session = require("express-session");
const app = express();

//config
app.set("view engine","ejs");
app.use(express.json());
app.use(express.urlencoded({extended:true}));

//sesiones
app.use(session({
    secret: "compensamiento",
    resave: false,
    saveUninitialized:false
}));


//rutas
app.use(require("./rutas/login"));
app.use('/public',express.static("public"));
app.use(require("./rutas/regUs"));
app.use(require('./rutas/codLog'));
app.use(require('./rutas/dashboard'));
app.use(require("./rutas/cursos"));
app.use(require("./rutas/evaluacionRoute"));
app.use(require("./rutas/configuracion"));
app.use(require("./rutas/estudiante"));
app.use(require('./rutas/codcerrar'));
app.use(require('./rutas/inicio'));
app.use(require("./rutas/resultadosRoute"));


const PORT = process.env.PORT || 3000;
//inicio servidor
app.listen(PORT, function(){
    if(PORT==3000){
        console.log("servidor creado http://localhost:3000");
    }else{
        console.log(PORT);
    }

    
})


/*const PORT = process.env.PORT || 3001;
// Inicio del servidor
app.listen(PORT, '0.0.0.0', function() {
    if (PORT == 3001) {
        console.log("Servidor creado en http://localhost:3001");
    } else {
        console.log(`Servidor corriendo en el puerto ${PORT}`);
    }
});

*/
