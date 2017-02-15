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
  //reset table before adding
  resetTable();
  //add elements into table
  fetchBroncoShuttle();
  callback(null, response);


};

module.exports.queryShuttleTime = (event, context, callback) => {
    queryBroncoTime(callback);
};

var docClient = new AWS.DynamoDB.DocumentClient();
var table = "Bronco_Express_Live_Map";


//resets the table
function resetTable() {
    var params = {
        TableName : table
    };

    docClient.scan(params, function(err, data) {
        if (err) {
            console.error("Unable to scan. Error:", JSON.stringify(err, null, 2));
        } else {
            data.Items.forEach(function(item) {
                var param = {
                    TableName: table,
                    Key: {
                        "BusID":item.BusID,
                        "Timestamp":item.Timestamp
                    }
                };
                docClient.delete(param, function(err, data) {
                    if (err) {
                        console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
                    } else {
                        console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
                    }
                });
            });
        }
    });
}

//add shuttle to database
function fetchBroncoShuttle() {
    request('https://rqato4w151.execute-api.us-west-1.amazonaws.com/dev/info', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var items = JSON.parse(body);
            items.forEach(function(item) {
                var params = {
                    TableName:table,
                    Item:{
                        "BusID": item.id.toString(),
                        "Timestamp": Date.now(),
                        "logo": item.logo,
                        "lat": item.lat,
                        "lng": item.lng,
                        "route": item.route
                    }
                };
                docClient.put(params, function(err, data) {
                    if (err) {
                        console.error("Unable to add item. Error JSON!", JSON.stringify(err, null, 2));
                    } else {
                        console.log("Added item:", item.id, JSON.stringify(data, null, 2));
                    }
                });

            });

        }
    })
}

//return json of the most up-to-date shuttle
function queryBroncoTime(callback) {
    var params = {
        TableName : table
    };

    docClient.scan(params, function(err, data) {
        if (err) {
            console.error("Unable to scan. Error:", JSON.stringify(err, null, 2));
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
            var list = []
            data.Items.forEach(function(item) {
                list.push({id: item.BusID, logo: item.logo, lat: item.lat,
                            lng: item.lng, route: item.route});
            });

            if (callback) {
                const responseOk = {
                    statusCode: 200,
                    headers: {
                        "Access-Control-Allow-Origin": "*"
                    },

                    body: JSON.stringify(list),
                };
                callback(null, responseOk);
            }
        }
    });
}