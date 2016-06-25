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

d3.json('map_data/new_world.json', function (error, world) {
	if (error) return console.log(error);

	var subunits = topojson.feature(world, world.objects.subunits);

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


//COLORS!!!

function findYearRange() {
	var yearRanges = {0: [2020, 2039], 1: [2040, 2059], 2: [2060, 2079], 3: [2080, 2099]},
		rangeKey = $('#year-selector').val(),
		range = yearRanges[rangeKey];

	return range;
}

d3.json('map_data/country_codes.json', function (error, codes){
	if (error) return console.log(error);

	for (countryName in codes) {
		var countryCode = codes[countryName],
			yearRange = findYearRange();

		(function(countryCode, yearRange){
			d3.json('http://localhost:3000/api/' + countryCode + '/' + yearRange[0] + 'to' + yearRange[1], function(err, json){
				if (err) console.log(err);
				
				var temp = json.climateData[0].annualData * (9/5) + 32,
					tempDiff = temp - 42,
					diffMult = Math.floor(tempDiff / 2),
					baseColor = [81, 126, 187],
					newColor = [baseColor[0] - (2 *(diffMult)), baseColor[1] - (4*(diffMult)), baseColor[2] - (7*(diffMult))];

				//console.log(diffMult, newColor);

				svg.selectAll('.' + countryCode)
					.style('fill', function(){ return 'rgb(' + newColor[0] + ', ' + newColor[1] + ', ' + newColor[2] + ')'});
			});
		})(countryCode, yearRange);

	} //fade effect
});	

function changeMapColor(){
	console.log('changing');

	//add reds
}


$('#year-selector').change(function(){
	var range = findYearRange();
	$('#selector-label').text(range[0] + ' -- ' + range[1]);

	//give it initial load
	changeMapColor();
});

//equalize the json files
	//re-scrape country codes? ;__;
	//check caching


//two maps:
	//show average change over different time periods
	//show the actual avg temp over diff time periods 


//have possible values
//on click, you can reset the colors of the map (and have a fade effect)
	//click button is highlighted and others will dim
	//2020-2039 is selected first by default


//create max and min
//get the color to change depending on the segment
//have a label above each segment

//'about' side-bar - keys, explanation, gcm






