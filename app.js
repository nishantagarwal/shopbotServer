var express = require('express')
var bodyParser = require('body-parser')
const nconf = require('nconf');
const http = require('http');
var request = require('request');

var app = express();
app.use(bodyParser.json());

// This responds with "Hello" on the homepage
app.get('/', function (req, res) {
   console.log("Got a GET request for the homepage");
   res.end('Hello from Home Page');
});


var server = app.listen(process.env.PORT || 3000, function() {
console.log('API server listening on port: 3000 or ', process.env.PORT)
})
