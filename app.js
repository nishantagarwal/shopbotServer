var express = require('express')
var bodyParser = require('body-parser')
const nconf = require('nconf');
const http = require('http');
var request = require('request');
const { Client } = require('pg');

const client = new Client({
  user: 'cnhxuafc',
  host: 'pellefant.db.elephantsql.com',
  database: 'cnhxuafc',
  password: 'gK3OWnFKJe1vd3eBTqWwp4PhtLjZyhEI',
  port: 5432,
})

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
   console.log("contexts");
   console.log(contexts);
   let msg= "default msg", contextsObject = {};
   contexts.map(context => {
    let contextName = context.name,
      name = contextName.split("/")[contextName.split("/").length - 1]
    return contextsObject[name] = context;
  })
   console.log(intent);
   let contextOut = contexts;
   if (intent == "askPhoneNum"){
      let phoneNumber = contextsObject["phone_number"];
      msg = "ab apna sawaal puch";
      contextOut.push({
              "name": "projects/${PROJECT_ID}/agent/sessions/${SESSION_ID}/contexts/phone_number",
              "lifespanCount": 10,
              "parameters": {
                "phone_number": phoneNumber,
                "phone_number.original": phoneNumber
              }
            })
   }else{
      if(contextsObject["phone_number"]){
         msg = "sahi jaa rha hai";
      }else{
         msg = "bhaag yahaan se";
      }
   }
   console.log(msg);
   res.json(setResponse(res,msg,contextOut)); 
});

app.get('/candidates', function (req, res) {
   console.log("Got a GET request for the candidates");
   const text = 'SELECT "NAME" FROM "CANDIDATE"'
   client.query(text, (err, response) => {
     if (err) {
       console.log(err.stack)
     } else {
       get_res = console.log(response)
       res.end(get_res);
     }
   })
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
   return responseObj;
}
