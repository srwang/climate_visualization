console.log('linked');

//create SVG
var width = $(window).width(),
    height = 800;

var svg = d3.select('#map').append('svg')
    .attr('width', width)
    .attr('height', height);

//render map
var projection = d3.geo.stereographic()
    .scale(200)
    .translate([width / 2, height / 2])
    .rotate([-20, 0])
    .clipAngle(130)
    .clipExtent([[0, 0], [width, height]])
    .precision(.1);

var path = d3.geo.path()
    .projection(projection);

d3.json('map_data/world.json', function (error, world) {
	if (error) return console.error(error);

	var subunits = topojson.feature(world, world.objects.subunits);

	svg.append('path')
    .datum(subunits)
    .attr('d', path);

	svg.selectAll('.subunit')
	    .data(topojson.feature(world, world.objects.subunits).features)
	  .enter().append('path')
	    .attr('class', 
	    	function (d) { 
	    		return 'subunit ' + d.id; 
	    	})
	    .attr('d', path);

	//create labels
	svg.selectAll('.subunit-label')
		.data(topojson.feature(world, world.objects.subunits).features)
	.enter().append('text')
		.attr('class', function(d) { return 'subunit-label ' + d.id; })
		.attr('transform', function(d) { 
			var center = path.centroid(d);
			//adjust for left offset
			return 'translate(' + [center[0] - 20, center[1]] + ')';
		})
		.attr('dy', '.1em')
		.style({'fill':'lightgreen', 'display':'none'})
		.text(function(d) { return d.properties.name; });

	//display labels on hover
	svg.selectAll('.subunit')
		.on('mouseenter', function(){ 
			svg.select('.subunit-label.' + this.classList[1])
				.style('display', 'block')
				.style('fill', 'black')
				.transition(8000);
		})
		.on('mouseleave', function(){
			svg.select('.subunit-label.' + this.classList[1])
				.style('fill', 'lightgreen')
				.style('display', 'none');
		});
});



//api call
// var startYear = 2020,
// 	endYear = 2039;

// d3.json('map_data/country_codes.json', function (error, codes){
// 	if (error) return console.log(error);

// 	for (countryName in codes) {
// 		var countryCode = codes[countryName];

// 		d3.jsonp('http://climatedataapi.worldbank.org/climateweb/rest/v1/country/annualavg/tas/' + startYear + '/' + endYear + '/' + countryCode + '?callback=handler');
// 	}
// });	

// function handler(json) {
// 	if (json) {

// 	}
// 	//cache the json 
// }


//adjust function to add different range of years
//write a second function to grab from cache and attach class based on temperature
	//find by path ID
//write backend CSS- colors based on class


//read docs
//iterate through, grab data, and cache
//link data to SVGs


//create range slider
//make keys
//embed additional images or side-bars, etc. 

//fade






