var express = require('express')
var app = express()

// Set up AWS DDB connection
var AWS = require('aws-sdk');
AWS.config.update({region: 'us-west-2'});
var docClient = new AWS.DynamoDB.DocumentClient({apiVersion: '2018-02-08'});

var petShopTable = 'pet-shop'

var params = {
  TableName: petShopTable,
};

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/', function (req, res) {
  docClient.scan(params, function(err, data) {
	  if (err) {
	    res.send(error)
	  } else {
	  	res.send(data.Items)
	  }
  });
})

app.listen(4000)