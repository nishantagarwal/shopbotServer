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
        let phone_number = req.body.queryResult.parameters["phone_number"];
        console.log("phoneNumber", phone_number);
        getCandidate(phone_number).then((output) => {
            msg = "The number you have given does not exist in our system. Please provide correct number.";
            if (output) {
                msg = "Thank you for providing your number. How can I help you ?";
                contextOut.push({
                    "name": "projects/${PROJECT_ID}/agent/sessions/${SESSION_ID}/contexts/phone_number",
                    "lifespanCount": 10,
                    "parameters": {
                        "phone_number": phone_number,
                        "phone_number.original": phone_number
                    }
                });
            }
            return res.json(setResponse(res, msg, contextOut));
        }).catch((error) => {
            msg = "Unable to validate your number. Please provide your number again.";
            return res.json(setResponse(res, msg, contextOut));
        });
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
            console.log(contextsObject["phone_number"]);
            phone_number = contextsObject.phone_number.parameters.phone_number
            getCandidate(phone_number).then((output) => {
                msg = "";
                if (!output) {
                    msg = "We are unable to fetch required information.";
                } else {
                    switch (intent) {
                        case "interviewRounds":
                            msg = "There will be " + output["INTERVIEW_ROUNDS"] + "rounds";
                            break;
                        case "interviewTypes":
                            msg = "There types of interview rounds are - " + output["INTERVIEW_TYPES"];
                            break;
                        case "interviewResult":
                            msg = "There types of interview rounds are - " + output["INTERVIEW_RESULT"];
                            break;
                        case "officeAddress":
                            msg = output["OFFICE_ADDRESS"];
                            break;
                        case "requiredDocs":
                            msg = output["REQUIRED_DOCS"];
                            break;
                        case "docSubmissionTime":
                            msg = output["SUBMISSION_TIME"];
                            break;
                    }
                }
                return res.json(setResponse(res, msg, contextOut));
            }).catch((error) => {
                msg = "Unable to validate your number. Please provide your number again.";
                return res.json(setResponse(res, msg, contextOut));
            });
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

function getCandidate(phoneNum) {
    reqUrl = rest_url + "/phone?phone=" + phoneNum;

    return new Promise((resolve, reject) => {
        console.log(reqUrl);
        request({
            url: reqUrl,
            method: "GET"
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                let response = JSON.parse(body);
                if (response.length == 0) {
                    resolve(null);
                } else {
                    record = response[0];
                    console.log("REST Response:");
                    console.log(response);
                    resolve(record);
                }
            } else {
                console.error("REST error -> ", error);
                reject(error)
            }
        });
    });
}
