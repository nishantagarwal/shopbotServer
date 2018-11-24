var express = require('express')
var bodyParser = require('body-parser')
const nconf = require('nconf');
const http = require('http');
var request = require('request');
const pg = require('pg');
const client = new pg.Client('postgres://cnhxuafc:gK3OWnFKJe1vd3eBTqWwp4PhtLjZyhEI@pellefant.db.elephantsql.com:5432/cnhxuafc');
client.connect();
const faq_url = "https://faq-solr.herokuapp.com/search?query=";
const rest_url = "https://tbdhrbot.herokuapp.com/candidate";

var doc_types = { "aadhaar": ["a1", "a2"], "pan": ["p1", "p2"], "driving": ["d1", "d2"] }

var app = express();
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));

// This responds with "Hello" on the homepage
app.get('/hello', function (req, res) {
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
            msg = output ? output.substr(0, 15) : "";
            console.log("Fallback - ", msg);
            return res.json(setResponse(res, msg, contextOut));
        }).catch((error) => {
            msg = "";
            console.log("Fallback Catch - ", msg);
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
                            msg = "There will be " + output["INTERVIEW_ROUNDS"] + " rounds";
                            break;
                        case "interviewTypes":
                            msg = "Types of interview are " + output["INTERVIEW_TYPES"];
                            break;
                        case "interviewResult":
                            msg = "There result of interview is " + output["INTERVIEW_RESULT"];
                            break;
                        case "officeAddress":
                            msg = output["OFFICE_ADDRESS"];
                            break;
                        case "docSubmissionTime":
                            msg = "You can submit by " + output["SUBMISSION_TIME"];
                            break;
                        case "requiredDocs":
                            user_docs = output["SUBMITTED_DOCS"] ? output["SUBMITTED_DOCS"] : "";
                            user_docs_list = user_docs.split(",");
                            missing_list = "";
                            for (var key in doc_types) {
                                if (user_docs_list.indexOf(key) < 0) {
                                    missing_list += "," + key;
                                }
                            }
                            if (missing_list.length != 0) {
                                msg = "Required documents are - " + missing_list.substr(1);
                            } else {
                                msg = "No more documents required";
                            }
                            break;
                        case "alternativeDocs":
                            alternate_list = "";
                            doc_name = req.body.queryResult.parameters["doc_name"];
                            for (var item in doc_types[doc_name]) {
                                alternate_list += "," + doc_types[doc_name][item];
                            }
                            if (alternate_list.length != 0) {
                                msg = "Alternative documents are - " + alternate_list.substr(1);
                            } else {
                                msg = doc_name + " is compulsory";
                            }
                            break;
                        default:
                            msg = "Sorry we do not have this information.";
                            break;
                    }
                }
                return res.json(setResponse(res, msg, contextOut));
            }).catch((error) => {
                msg = "Unable to validate your number. Please provide your number again.";
                return res.json(setResponse(res, msg, contextOut));
            });
        } else {
            msg = "Please provide your number.";
            return res.json(setResponse(res, msg, contextOut));
        }
    }
});

app.get('/candidates', function (req, res) {
    console.log("Got a GET request for the candidates");
    query = 'SELECT * FROM "CANDIDATE";';
    client.query(query, (err, response) => {
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
    query = 'SELECT * FROM "CANDIDATE" WHERE "PHONE_NUMBER" = ' + query_phone + ';';
    client.query(query, (err, response) => {
        if (err) {
            console.log(err.stack);
        } else {
            console.log(response.rows);
            res.json(response.rows);
        }
    })
});

app.post('/candidates/trigger', function (req, res) {
    console.log("Got a POST request for trigger");
    triggered_candidates = req.body;
    for (index in triggered_candidates) {
        query = 'INSERT INTO "CANDIDATE_HR" VALUES (' + triggered_candidates[index] + ', 123)'
        client.query(query, (err, response) => {
            if (err) {
                console.log(err.stack);
            } else {
                console.log(response);
            }
        })
    }
    res.json({});
});

app.get('/candidates/triggered', function (req, res) {
    console.log("Got a GET request for a triggered candidates");
    query = 'SELECT * FROM "CANDIDATE_HR";';
    client.query(query, (err, response) => {
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
