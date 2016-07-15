var express = require('express');
var app = express();
var request = require('request');
var bodyParser = require('body-parser');
var urlencodedBodyParser = bodyParser.urlencoded({extended: false});
var ejs = require('ejs');
var responseTime = require('response-time')
var axios = require('axios');


//heroku redis
if (process.env.REDIST_URL) {
    var redis = require('redis').createClient(process.env.REDIS_URL);
} else {
    var redis = require("redis");
}

app.use(urlencodedBodyParser);
app.set('view_engine', 'ejs');
app.use(express.static('public'));
app.use(responseTime());

//main page
app.get('/', function (req, res){
	res.redirect('map');
});

app.get('/map', function (req, res){
	res.render('main.html.ejs');
});

//redis routes
var client = redis.createClient();

client.on('error', function (err) {
    console.log("Error " + err);
});

client.on('connect', function() {
    console.log('Connected to Redis');
});

function getCountryJson(startYear, endYear, code) {
	var apiEndpoint = 'http://climatedataapi.worldbank.org/climateweb/rest/v1/country/annualavg/tas/' + startYear + '/' + endYear + '/' + code;
	return axios.get(apiEndpoint);
}

app.get('/api/:code/:yearRange', function (req, res){

  	var countryCode = req.params.code,
  		startYear = req.params.yearRange.split('to')[0],
  		endYear = req.params.yearRange.split('to')[1];

	//get data from cache or get from api and store in cache
	client.get(countryCode + '-' + startYear, function(error, result) {
	  	if (result) {
	  		res.send({'climateData': JSON.parse(result), 'source': 'redis cache'});
	  	} else {
	  		getCountryJson(startYear, endYear, countryCode)
	  			.then(function(response){
	  				client.setex(countryCode + '-' + startYear, 1800, JSON.stringify(response.data));
	  				res.send({'climateData': response.data, 'source': 'World Bank API'});
	  			}).catch(function(response) {
	  				if (response.status === 400) {
	  					res.send('This country could not be found!');
	  				} else {
	  					res.send(response);
	  				}
	  			});
	  	}
	});
});

//server
app.listen(process.env.PORT || 3000);