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

//make an api call and store it somewhere- either in session or in database 
//

//create SVG
var width = 960,
    height = 1160;

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

var startYear = 2020,
	endYear = 2039,
	countryCode = 'grl';

//grab json and render map
d3.json('map_data/world.json', function(error, world) {
	if (error) return console.error(error);
	console.log(world);

	svg.append("path")
		.datum(topojson.feature(world, world.objects.subunits))
		.attr("d", d3.geo.path().projection(d3.geo.mercator()));
});



//api call
d3.jsonp('http://climatedataapi.worldbank.org/climateweb/rest/v1/country/annualavg/tas/' + startYear + '/' + endYear + '/' + countryCode + '?callback=handler');

function handler(json) {
	console.log(json);
}






