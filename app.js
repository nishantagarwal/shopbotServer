var express = require('express')
var bodyParser = require('body-parser')
const nconf = require('nconf');
const http = require('http');
var request = require('request');

var app = express();
app.use(bodyParser.json());;
let serverHost = "c690df0b.ngrok.io";
if(process.env.PORT){//if webhook and app is runnig on heroku..
  serverHost = "shopbot-server.herokuapp.com";
}

// This responds with "Hello" on the homepage
app.get('/', function (req, res) {
   console.log("Got a GET request for the homepage");
   res.end('Hello from Home Page');
});
