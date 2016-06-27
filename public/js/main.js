console.log('linked');


//SET UP MAP
var width = $(window).width(),
    height = 800;

//create SVG
var svg = d3.select('#map').append('svg')
    .attr('width', width)
    .attr('height', height);

//set map properties
var projection = d3.geo.stereographic()
    .scale(200)
    .translate([width / 2, height / 2])
    .rotate([-20, 0])
    .clipAngle(130)
    .clipExtent([[0, 0], [width, height]])
    .precision(.1);

var path = d3.geo.path()
    .projection(projection);

//RENDER MAP
d3.json('map_data/new_world.json', function (error, world) {
	if (error) return console.log(error);

	var subunits = topojson.feature(world, world.objects.subunits);

    //create countries
	svg.append('path')
    .datum(subunits)
    .attr('d', path);

	svg.selectAll('.subunit')
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
	svg.selectAll('.subunit-label')
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
			return 'translate(' + [center[0] - 20, center[1]] + ')';
		})
		.attr('dy', '.1em')
		.style({'fill':'black', 'display':'none'})
		.text(function(d) { return d.properties.name; });

	//display labels on hover
	svg.selectAll('.subunit')
		.on('mouseenter', function(){ 
			svg.select('.subunit-label#' + this.id)
				.style('display', 'block');
		})
		.on('mouseleave', function(){
			svg.select('.subunit-label#' + this.id)
				.style('display', 'none');
		});
});

//make sure upon refresh range-slider changes back to default!!!


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
					currentColor = [yearTwentyColor[0]+(20*diffMult), yearTwentyColor[1], yearTwentyColor[2]-(10*diffMult)];

				if(!isNaN(yearTwentyTemp)) {
					console.log(tempDiff);
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

		} //fade effect
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
			standardColor = [81, 126, 187],
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
				.style('fill', function(){ return 'rgb(' + color[0] + ', ' + color[1] + ', ' + color[2] + ')'});
		}, 1000);
}

function findYearRange() {
	var yearRanges = {0: [2020, 2039], 1: [2040, 2059], 2: [2060, 2079], 3: [2080, 2099]},
		rangeKey = $('#year-selector').val(),
		range = yearRanges[rangeKey];

	return range;
}

//have possible values
//on click, you can reset the colors of the map (and have a fade effect)
	//click button is highlighted and others will dim
	//2020-2039 is selected first by default

//'about' side-bar - keys, explanation, gcm






