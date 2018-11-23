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
   console.log(req.body.queryResult);
   let intent = req.body.queryResult.intent['displayName'];
   let contexts = req.body.queryResult.outputContexts ? req.body.queryResult.outputContexts : [];
   let msg= "1234";
   console.log(intent);
   if (intent == "askPhoneNum"){
      let phoneNumber = contexts["phone-number"];
      msg = "ab apna sawaal puch";
   }else{
      if(contexts["phoneNum"]){
         msg = "sahi jaa rha hai";
      }else{
         msg = "bhaag yahaan se";
      }
   }
   setResponse(res,msg,contexts); 
});

function setResponse(res,msg,contexts){
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
         ],
         "outputContexts": contexts
      }
   res.json(responseObj);
}
