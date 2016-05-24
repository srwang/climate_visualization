console.log('linked');

//create SVG
var width = $(window).width(),
    height = 800;

var svg = d3.select('#map').append('svg')
    .attr('width', width)
    .attr('height', height);

var startYear = 2020,
	endYear = 2039,
	countryCode = 'grl';

//render map
var projection = d3.geo.stereographic()
    .scale(300)
    .translate([width / 2, height / 2])
    .rotate([-20, 0])
    .clipAngle(130)
    .clipExtent([[0, 0], [width, height]])
    .precision(.1);
	//adjust

var path = d3.geo.path()
    .projection(projection);

d3.json('map_data/world.json', function(error, world) {
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

	svg.selectAll('.subunit-label')
		.data(topojson.feature(world, world.objects.subunits).features)
	.enter().append('text')
		.attr('class', function(d) { return 'subunit-label ' + d.id; })
		.attr('transform', function(d) { return 'translate(' + path.centroid(d) + ')'; })
		.attr('dy', '.1em')
		.style({'color':'green', 'display':'none'})
		.text(function(d) { return d.properties.name; });

	svg.selectAll('.subunit')
		.on('mouseenter', function(){ 
			svg.select('.subunit-label.' + this.classList[1])
				.style('display', 'block');
		})
		.on('mouseleave', function(){
			svg.select('.subunit-label.' + this.classList[1])
				.style('display', 'none');
		})
});

//api call
d3.jsonp('http://climatedataapi.worldbank.org/climateweb/rest/v1/country/annualavg/tas/' + startYear + '/' + endYear + '/' + countryCode + '?callback=handler');

function handler(json) {
	//console.log(json);
}






