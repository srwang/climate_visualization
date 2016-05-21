console.log('linked');

//create basic map (3-D globe or flat visuals)
	//flat map of globe (split)
	//flora/fauna to coincide with some major areas - i.e. coral bleaching australia coast
	//have a 
//create a range slider

//map build tool
//kml data (?)

//iterate through the countries (?)

//read about natural earth
//grab all the countries' data (?)
//split globe- create a circle svg or background on which the svgs sit



var startYear = 2020,
	endYear = 2039,
	countryCode = 'grl';

d3.jsonp('http://climatedataapi.worldbank.org/climateweb/rest/v1/country/annualavg/tas/' + startYear + '/' + endYear + '/' + countryCode + '?callback=handler');

function handler(json) {
	console.log(json);
}

//make an api call and store it somewhere- either in session or in database 
//

