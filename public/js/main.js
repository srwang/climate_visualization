console.log('linked');

$(document).ready(function(){

//SET UP MAP
var width = $(window).width(),
    height = 600;

var mousePosition0;

//create SVG
var svg = d3.select('#map').append('svg')
    .attr('width', width)
    .attr('height', height);

//set map properties
var projection = d3.geoStereographic()
    .scale(250)
    .center([0, 0])
    .translate([width / 2, height / 2])
    .rotate([0,0,0])
    .clipAngle(100)
    .clipExtent([[0, 0], [width, height]])
    .precision(.1);

var path = d3.geoPath()
    .projection(projection);

var feature;

var backgroundCircle = svg.append("circle")
    .attr('cx', width / 2)
    .attr('cy', height / 2)
    .attr('r', 300);

//RENDER MAP
d3.json('map_data/new_world.json', function (error, world) {
	if (error) return console.log(error);

	var subunits = topojson.feature(world, world.objects.subunits);

	//create countries' paths
	feature = svg.selectAll('.subunit')
	    .data(topojson.feature(world, world.objects.subunits).features)
	  .enter().append('path')
	    .attr('class', 
	    	function (d) { 
	    		return 'subunit ' + d.id.split(' ')[0]; 
	    	})
	    .attr('id', 
	    	function (d) {
	    		if (d.id.split(' ')[1]) { 
	    			return d.id.split(' ')[1];
	    		} else { 
	    			return d.id.split(' ')[0];
	    		}
	    	})
	    .attr('d', path);

	//create labels
	label = svg.selectAll('.subunit-label')
		.data(topojson.feature(world, world.objects.subunits).features)
	.enter().append('text')
		.attr('class', 'subunit-label')
		.attr('id', 
	    	function (d) {
	    		if (d.id.split(' ')[1]) { 
	    			return d.id.split(' ')[1];
	    		} else { 
	    			return d.id.split(' ')[0];
	    		}
	    	})
		.attr('transform', function(d) { 
			var center = path.centroid(d);
			//adjust for left offset
			if (!isNaN(center[0])){
				return 'translate(' + [center[0] - 20, center[1]] + ')';
			}
		})
		.attr('dy', '.1em')
		.style('fill', 'black')
		.style('display', 'none')
		.text(function(d) { return d.properties.name; });

	//display labels on hover
	svg.selectAll('.subunit')
		.on('mouseenter', function(){ 
			svg.select('.subunit-label#' + this.id)
				.transition()
				.delay(200)
				.style('display', 'block');
		})
		.on('mouseleave', function(){
			svg.select('.subunit-label#' + this.id)
				.transition()
				.delay(200)
				.style('display', 'none');
		});

});	

//figure out render speed
//add modals

//DRAGGABLE GLOBE
var mousePosition0;

svg.on('mousedown', function(){
	mousePosition0 = [d3.event.pageX, d3.event.pageY];
});

svg.on('mousemove', function(){
	if (mousePosition0) {
		console.log(d3.event.pageX, d3.event.pageY);

		var currentCenter = projection.rotate(),
			mousePosition1 = [d3.event.pageX, d3.event.pageY],
			newCenter = [currentCenter[0] + (mousePosition0[0]-mousePosition1[0]) / 8, currentCenter[1] + (mousePosition1[1]-mousePosition0[1]) / 8];

	    projection.rotate([-newCenter[0], -newCenter[1], 0]);

		feature.attr('d', d3.geoPath().projection(projection));

		label.attr('transform', function(d) { 
			var center = path.centroid(d);
			if (!isNaN(center[0])){
				return 'translate(' + [center[0] - 20, center[1]] + ')';
			}
		});
	}
});	

svg.on('mouseup', function(){
	mousePosition0=null;
});

//COLORS
//set map to colors corresponding to 2020 temps
changeMapColor([2020, 2039],
	function(yearTwentyTemp, yearTwentyColor, countryCode){
		setSvgFill(countryCode, yearTwentyColor);	
});

//as temp changes over time, will increment or decrement reds to make change more visible
$('#year-selector').change(function(){
	var range = findYearRange();
	$('#selector-label').text(range[0] + ' -- ' + range[1]);

	if (range[0] === 2020) {
		changeMapColor(range, function(yearTwentyTemp, yearTwentyColor, countryCode){
				setSvgFill(countryCode, yearTwentyColor);	
		});
	} else {
		changeMapColor(range, function(currentTemp, countryCode) {
			//make a second call per country, to find 2020 temp and colors
			makeApiCall(countryCode, [2020, 2039], function(yearTwentyTemp, yearTwentyColor, countryCode){

				var tempDiff = currentTemp - yearTwentyTemp,
					diffMult = Math.floor(tempDiff/0.5),
					currentColor = [yearTwentyColor[0]+(15*diffMult), yearTwentyColor[1], yearTwentyColor[2]-(10*diffMult)];

				if(!isNaN(yearTwentyTemp)) {
					setSvgFill(countryCode, currentColor);
				}
			});
		});
	}
});

//color-related functions
function changeMapColor(yearRange, callback){

	d3.json('map_data/country_codes.json', function (error, codes){
		if (error) return console.log(error);
		//make api calls for annual temp projection
		for (countryName in codes) {
			var countryCode = codes[countryName];

			(function(countryCode, yearRange){
				makeApiCall(countryCode, yearRange, callback);
			})(countryCode, yearRange);

		} 
	});	
}

function makeApiCall(countryCode, yearRange, callback) {
	d3.json('http://localhost:3000/api/' + countryCode + '/' + yearRange[0] + 'to' + yearRange[1], function(err, json){
		if (err) console.log(err);

		var temp = json.climateData[0].annualData * (9/5) + 32;

		if (yearRange[0] === 2020) {
			//create base color for 2020
			var tempDiff = temp - 42,
			diffMult = Math.floor(tempDiff / 2),
			standardColor = [101, 145, 177],
			newColor = [standardColor[0] - (2 *(diffMult)), standardColor[1] - (4*(diffMult)), standardColor[2] - (7*(diffMult))];

			callback(temp, newColor, countryCode);
		} else {
			callback(temp, countryCode);
		}

	});
}

function setSvgFill (countryCode, color) {
	setTimeout(function(){
			svg.selectAll('.subunit.' + countryCode)
				.transition()
				.style('fill', function(){ return 'rgb(' + color[0] + ', ' + color[1] + ', ' + color[2] + ')'});
		}, 1500);
}

function findYearRange() {
	var yearRanges = {0: [2020, 2039], 1: [2040, 2059], 2: [2060, 2079], 3: [2080, 2099]},
		rangeKey = $('#year-selector').val(),
		range = yearRanges[rangeKey];

	return range;
}

//make globe

//menu bar
	//explanation, gcm
	//keys 

//show modal on click
	//show country name, 2020 average temp, average annual projected change, and next average temperature

//add background circle image
//add background text

//make page responsive (?)


});







