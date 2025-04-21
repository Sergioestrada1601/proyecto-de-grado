var mysql = require('mysql');

var conexion = mysql.createConnection({
    host: 'localhost',
    database: 'compensamiento',
    user: 'root',
    password: ''
});

conexion.connect(function(err){
    if(err){
        throw err;
    }else{
        console.log("conexion exitosa");
    }

});

module.exports = conexion;
