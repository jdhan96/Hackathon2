var request = require('request');
var parseString = require('xml2js').parseString;
var AWS = require('aws-sdk');

AWS.config.update({
    region: "us-west-1"
});


'use strict';

module.exports.hello = (event, context, callback) => {
  const response = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify({
      message: 'Shuttle Routes have been updated!'
    }),
  };
  fetchBroncoShuttle();
  callback(null, response);


};

module.exports.queryShuttleTime = (event, context, callback) => {
    queryBroncoTime(event.pathParameters.name, callback);
};

var docClient = new AWS.DynamoDB.DocumentClient();
var table = "Bronco_Express_Live_Map";

function fetchBroncoShuttle() {
    request('https://rqato4w151.execute-api.us-west-1.amazonaws.com/dev/info', function (error, response, body) {


        if (!error && response.statusCode == 200) {
            var items = JSON.parse(body);
            for(var i = 0; i < items.length; i++) {
                putItem(items[i]);
            }

        }
    })
}

function putItem(hold) {
    var params = {
        TableName:table,
        Item:{
            "BusID": hold.id.toString(),
            "Timestamp": Date.now(),
            "logo": hold.logo,
            "lat": hold.lat,
            "lng": hold.lng,
            "route": hold.route
        }
    };

    console.log("Adding a new item...");
    docClient.put(params, function(err, data) {
        if (err) {
            console.error("Unable to add item. Error JSON!", JSON.stringify(err, null, 2));
        } else {
           console.log("Added item!", JSON.stringify(data, null, 2));
        }
    });
}

function queryBroncoTime(BusID, callback) {
    var params = {
        TableName : table,
        KeyConditionExpression: "#key = :inputName",
        ExpressionAttributeNames:{
            "#key": "BusID"
        },
        ExpressionAttributeValues: {
            ":inputName":BusID
        }
    };

    docClient.query(params, function(err, data) {
        if (err) {
            console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
            if (callback) {
                const responseErr = {
                    statusCode: 500,
                    headers: {
                        "Access-Control-Allow-Origin": "*"
                    },
                    body: JSON.stringify({'err' : err}),
                };
                callback(null, responseErr);
            }
        } else {
            data.Items.forEach(function(item) {
                console.log(item);
            });

            if (callback) {
                const responseOk = {
                    statusCode: 200,
                    headers: {
                        "Access-Control-Allow-Origin": "*"
                    },
                    body: JSON.stringify(data.Items),
                };
                callback(null, responseOk);
            }
        }
    });
}