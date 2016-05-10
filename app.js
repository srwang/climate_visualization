//test 

var request = require("request");

var startYear = 2020,
	endYear = 2039,
	countryCode = 'grl';

request('http://climatedataapi.worldbank.org/climateweb/rest/v1/country/annualavg/tas/' + startYear + '/' + endYear + '/' + countryCode, function(err, res, body){
	if (err) console.log(err);
	console.log(body)
});