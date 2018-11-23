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

app.post('/hrbotServer', function (req, res){
   console.log(req.body.queryResult.intent);
   res.setHeader('Content-Type', 'application/json');
          let msg = "Not able to find specified Product from last searched list of products.Say again like - 'open product second'.";
          let responseObj={
               "fulfillmentText":msg,
               "fulfillmentMessages":[
                  {
                      "text": {
                          "text": [
                              msg
                          ]
                      }
                  }
              ]
          }
          res.json(responseObj);
});
