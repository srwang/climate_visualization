console.log('linked');


//create a range slider
//create basic map (3-D globe or flat visuals)
//figure out visualization (layering colors? changing the interface?)

var startYear = 2020,
	endYear = 2039,
	countryCode = 'grl';

d3.jsonp('http://climatedataapi.worldbank.org/climateweb/rest/v1/country/annualavg/tas/' + startYear + '/' + endYear + '/' + countryCode + '?callback=handler');

function handler(json) {
	console.log(json);
}