var path = require('path');
var express = require("express");
var app = express();
var signserver = require('./signaling-server.js');

app.use('/static', express.static(__dirname + "/"));

app.get('/', function(req, res){
  res.sendFile(__dirname + "/index.html");
});

signserver(app, console.log);
