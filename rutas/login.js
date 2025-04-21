//imports 
const express = require("express");
const router = express.Router();
const link= require("../config/link")

//ruteo del login
router.get("/", function(req,res){
    res.render("login",{link});
});
module.exports =router;