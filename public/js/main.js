console.log('linked');

$(document).ready(function(){

//LOADING ICON
$('body').addClass('loading');
setInterval(function(){ 
	//check all country paths loaded
	if ($('path').length === 337) {
		$('body').removeClass('loading');
	}
}, 1000);

// .on('progress', function(error) { 
// 		console.log('making ajax call'); 
// 		$('body').addClass('loading');
// 	})
// 	.on('load', function(xhr) { 
// 		$('body').removeClass('loading');
// 	});

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
    .attr('r', 300)
    .attr('id', 'background-circle');

//RENDER MAP
d3.json('map_data/new_world.json', function(error, world) {
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
		})
		.on('click', function(){
			console.log('clicked');

			$('#sidebar').css({'width':'20%', 'transition-duration':'0.05s', 'padding':'20px 30px'});

			var id = this.id,
				countryCode = $(this).attr('class').split(' ')[1],
				countryName = $('.subunit-label#' + id).text(),
				yearRange = findYearRange();

			console.log(yearRange);

			d3.json('http://localhost:3000/api/' + countryCode + '/2020to2039', function(err, json){
				var yearTwentyTemp = json.climateData[0].annualData * (9/5) + 32;
				yearTwentyTemp = Math.round(yearTwentyTemp * 100) / 100;

				$('#sidebar').css({'width':'20%', 'transition-duration':'0.05s', 'padding':'20px 30px'});

				$('#sidebar').html('');
				$('#sidebar').append('' + 
					'<p id="close-button">x</p>' +
					'<h1>' + countryName + '</h1>' +
					'<p>Temperature in <strong>2020-2039</strong>: ' + yearTwentyTemp + ' &#8457;</p>');

				if (!(yearRange[0] === 2020)) {

					console.log('entering if')
					d3.json('http://localhost:3000/api/' + countryCode + '/' + yearRange[0] + 'to' + yearRange[1], function(err, json){
						var currentTemp = json.climateData[0].annualData * (9/5) + 32;
						currentTemp = Math.round(currentTemp * 100) / 100;

						$('#sidebar').append('' +
							'<p>Temperature in ' + yearRange[0] + '-<strong>' + yearRange[1] + ': ' + currentTemp + '</strong> &#8457;</p>');
					});

				}
			});
		});
});

//DRAGGABLE GLOBE
var mousePosition0;

backgroundCircle.on('mousedown', function(){
	mousePosition0 = [d3.event.pageX, d3.event.pageY];
});

backgroundCircle.on('mousemove', function(){
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

backgroundCircle.on('mouseup', function(){
	mousePosition0=null;

	console.log('up: ', mousePosition0);
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
		}, 1200);
}

function findYearRange() {
	var yearRanges = {0: [2020, 2039], 1: [2040, 2059], 2: [2060, 2079], 3: [2080, 2099]},
		rangeKey = $('#year-selector').val(),
		range = yearRanges[rangeKey];

	return range;
}

//SIDENAV
$('#sidebar').on('click', '#question-icon', function(){
	$('#sidebar').css({'width':'20%', 'transition-duration':'0.05s', 'padding':'20px 30px'});

	$('#sidebar').html('');

	setTimeout(function(){
		$('#sidebar').html(''+
			'<p id="close-button">x</p>' +
			'<p>Climate Map pulls data from the <a target="_blank" href="http://www.worldbank.org/en/topic/climatechange">World Bank</a> climate api to make a visualization of projected temperature changes over the current century. The temperatures used are taken from the <a target="_blank" href="https://en.wikipedia.org/wiki/Special_Report_on_Emissions_Scenarios">A2</a> scenario.<p>' + 
			'<p>To make temperature change more evident, a different calculation is used to generate the initial colors than is used to depict the change, which features deepening red tones per 0.5 degree shift.</p>' +
			// '<p>The effects of global warming are ___ even more quickly than predicted. Rapidly rising temperatures have recently contributed to:</p>' +
			// 	'<li>Bleaching of </li>' + 
			'<p>For more information:</p>' + 
			'<p><a target="_blank" href="https://www.washingtonpost.com/news/capital-weather-gang/wp/2016/05/10/the-most-compelling-visual-of-global-warming-ever-made/">Hawkins Spiral Visualization</a></p>' + 
			'<p><a target="_blank" href="http://climate.nasa.gov/effects/">NASA</a></p>' +
			'<p><a target="_blank" href="https://www.ncdc.noaa.gov/indicators/">NOAA</a></p>');
	},50);
});

$('#sidebar').on('click', '#close-button', function(){
	$('#sidebar').css({'width':'60px', 'transition-duration':'0.05s', 'padding':'0px 10px'});

	$('#sidebar').html('');

	setTimeout(function(){
		$('#sidebar').html('<h5 id="question-icon">?</h5>');		
	},50);
});


//finalize sidebar text
//render speed

//add background text
//facebook "share" plugin

//make page responsive (?)


});







