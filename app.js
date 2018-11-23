var express = require('express')
var bodyParser = require('body-parser')
const nconf = require('nconf');
const http = require('http');
var request = require('request');
const pg = require('pg');
const client = new pg.Client('postgres://cnhxuafc:gK3OWnFKJe1vd3eBTqWwp4PhtLjZyhEI@pellefant.db.elephantsql.com:5432/cnhxuafc');
client.connect();
const faq_url = "https://faq-solr.herokuapp.com/search?query=";
const rest_url = "https://kamariya.herokuapp.com/candidate";

var app = express();
app.use(bodyParser.json());

// This responds with "Hello" on the homepage
app.get('/', function (req, res) {
    console.log("Got a GET request for the homepage");
    res.end('Hello from Home Page');
});

var server = app.listen(process.env.PORT || 3000, function () {
    console.log('API server listening on port: 3000 or ', process.env.PORT)
})

app.post('/hrbotServer', function (req, res) {
    console.log(req.body.queryResult);
    let intent = req.body.queryResult.intent['displayName'];
    let contexts = req.body.queryResult.outputContexts ? req.body.queryResult.outputContexts : [];
    console.log("contexts");
    console.log(contexts);
    let msg = "default msg",
        contextsObject = {};
    contexts.map(context => {
        let contextName = context.name,
            name = contextName.split("/")[contextName.split("/").length - 1]
        return contextsObject[name] = context;
    })
    console.log(intent);
    let contextOut = contexts;
    if (intent == "askPhoneNum") {
        let phoneNumber = contextsObject["phone_number"];
        msg = "ab apna sawaal puch";
        contextOut.push({
            "name": "projects/${PROJECT_ID}/agent/sessions/${SESSION_ID}/contexts/phone_number",
            "lifespanCount": 10,
            "parameters": {
                "phone_number": phoneNumber,
                "phone_number.original": phoneNumber
            }
        });
        res.json(setResponse(res, msg, contextOut));
    } else if (intent == "Default Fallback Intent") {
        query = req.body.queryResult.queryText;
        console.log("Calling FAQ URL for text - " + query);
        callFAQ(query).then((output) => {
            msg = output ? output.substr(0, 15) : "Could not understand you";
            console.log("in then:");
            console.log(msg);
            return res.json(setResponse(res, msg, contextOut));

        }).catch((error) => {
            msg = "Could not get any answer";
            return res.json(setResponse(res, msg, contextOut));
        });
    } else {
        if (contextsObject["phone_number"]) {
            phone_number = contextsObject["phone_number"]
            if (intent == "interviewRounds") {
                field = "INTERVIEW_ROUNDS";
                getCandidateField(query).then((output) => {
                    msg = output ? "There will be total of " + output + " rounds" : "Could not understand you";
                    console.log(msg);
                    return res.json(setResponse(res, msg, contextOut));
                }).catch((error) => {
                    msg = "Could not get any answer";
                    return res.json(setResponse(res, msg, contextOut));
                });
            } else {
                msg = "bhaag yahaan se";
                res.json(setResponse(res, msg, contextOut));
            }
        }

    }
});

app.get('/candidates', function (req, res) {
    console.log("Got a GET request for the candidates");
    client.query('SELECT * FROM "CANDIDATE";', (err, response) => {
        if (err) {
            console.log(err.stack);
        } else {
            console.log(response.rows);
            res.json(response.rows);
        }
    })
});

app.get('/candidate/phone', function (req, res) {
    console.log("Got a GET request for a candidate using phone number");
    query_phone = req.query.phone;
    client.query('SELECT * FROM "CANDIDATE" WHERE "PHONE_NUMBER" = ' + query_phone + ';', (err, response) => {
        if (err) {
            console.log(err.stack);
        } else {
            console.log(response.rows);
            res.json(response.rows);
        }
    })
});

function setResponse(res, msg, contexts) {
    let responseObj = {
        "fulfillmentText": msg,
        "fulfillmentMessages": [{
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

function callFAQ(query) {
    return new Promise((resolve, reject) => {
        reqUrl = faq_url + encodeURI(query);
        console.log(reqUrl);
        request({
            url: reqUrl,
            method: "GET"
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                let response = body;
                console.log("FAQ Response:");
                console.log(response);
                resolve(response);
            } else {
                console.error("FAQ error -> ", error);
                reject(error)
            }
        });
    });
}

function getCandidateField(phoneNum, field) {
    reqUrl = rest_url + "/phone?phone=" + phoneNum;

    return new Promise((resolve, reject) => {
        reqUrl = faq_url + encodeURI(query);
        console.log(reqUrl);
        request({
            url: reqUrl,
            method: "GET"
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                let response = JSON.stringify(body);
                if (response.length == 0) {
                    resolve(record.field);
                } else {
                    record = response[0];
                    console.log("REST Response:");
                    console.log(response);
                    resolve(record.field);
                }
            } else {
                console.error("REST error -> ", error);
                reject(error)
            }
        });
    });
}
