console.log('linked');


//SET UP MAP
var width = $(window).width(),
    height = 600;

var mousePosition0;

//create SVG
var svg = d3.select('#map').append('svg')
    .attr('width', width)
    .attr('height', height)
    // .on('mousedown', function(){
	   //  	mousePosition0 = [d3.event.pageX, d3.event.pageY];
	   //  });

//set map properties
var projection = d3.geoOrthographic()
    .scale(300)
    .center([0, 0])
    .translate([width / 2, height / 2])
    .rotate([0,0,0])
    .clipAngle(100)
    .clipExtent([[0, 0], [width, height]])
    .precision(.1);

var path = d3.geoPath()
    .projection(projection);

var feature;

//RENDER MAP
d3.json('map_data/new_world.json', function (error, world) {
	if (error) return console.log(error);

	var subunits = topojson.feature(world, world.objects.subunits);

    //create countries
	svg.append('path')
    .datum(subunits)
    .attr('d', path);

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
		.style('fill', 'black')
		.style('display', 'none')
		.text(function(d) { return d.properties.name; });

	//display labels on hover
	// svg.selectAll('.subunit')
	// 	.on('mouseenter', function(){ 
	// 		svg.select('.subunit-label#' + this.id)
	// 			.transition()
	// 			.delay(200)
	// 			.style('display', 'block');
	// 	})
	// 	.on('mouseleave', function(){
	// 		svg.select('.subunit-label#' + this.id)
	// 			.transition()
	// 			.delay(200)
	// 			.style('display', 'none');
	// 	});

});	



//fix rotation problem - 3 hours
//put in modals with climate info - 1.5 hr

//read projection info online
//study 


//click and drag
	
//begin animation on mousedown
//change position on mousemove
//stop animation on mouseup

//don't return totally new position, but rather, different angle(??)
svg.on('mouseup', function(){


		// if (mousePosition0) {
		// 	var currentCenter = projection.rotate(),
		// 		mousePosition1 = [d3.event.pageX, d3.event.pageY],
		// 		newCenter = [currentCenter[0] + (mousePosition0[0]-mousePosition1[0]) / 8, currentCenter[1] + (mousePosition1[1]-mousePosition0[1]) / 8];
		// }

		console.log(feature.attr('d'));

	    projection.rotate([-d3.event.pageX, -d3.event.pageY, 0]);

		feature.attr('d', d3.geoPath().projection(projection));

		console.log(feature.attr('d'));

		//calcColors();
	});	



// svg.selectAll('.subunit')
// 	.transition()
// 	.on('start', 'mouseup')
// 	.tween('rotate', function(){
// 		var center = [d3.event.pageX, d3.event.pageY],
// 			r = d3.interpolate(projection.rotate(), [-center[0], -center[1]]);
// 		return function(t) {
// 			projection.rotate(r(t));
// 		}
// 	});

//   (function transition() {
//     d3.transition()
//         .duration(1250)
//         .each("start", function() {
//           title.text(countries[i = (i + 1) % n].name);
//         })
//         .tween("rotate", function() {
//           var p = d3.geo.centroid(countries[i]),
//               r = d3.interpolate(projection.rotate(), [-p[0], -p[1]]);
//           return function(t) {
//             projection.rotate(r(t));
//             c.clearRect(0, 0, width, height);
//             c.fillStyle = "#ccc", c.beginPath(), path(land), c.fill();
//             c.fillStyle = "#f00", c.beginPath(), path(countries[i]), c.fill();
//             c.strokeStyle = "#fff", c.lineWidth = .5, c.beginPath(), path(borders), c.stroke();
//             c.strokeStyle = "#000", c.lineWidth = 2, c.beginPath(), path(globe), c.stroke();
//           };
//         })
//       .transition()
//         .each("end", transition);
//   })();
// }


//COLORS
//set map to colors corresponding to 2020 temps
// changeMapColor([2020, 2039],
// 	function(yearTwentyTemp, yearTwentyColor, countryCode){
// 		setSvgFill(countryCode, yearTwentyColor);	
// });

// //as temp changes over time, will increment or decrement reds to make change more visible
// $('#year-selector').change(function(){
// 	var range = findYearRange();
// 	$('#selector-label').text(range[0] + ' -- ' + range[1]);

// 	if (range[0] === 2020) {
// 		changeMapColor(range, function(yearTwentyTemp, yearTwentyColor, countryCode){
// 				setSvgFill(countryCode, yearTwentyColor);	
// 		});
// 	} else {
// 		changeMapColor(range, function(currentTemp, countryCode) {
// 			//make a second call per country, to find 2020 temp and colors
// 			makeApiCall(countryCode, [2020, 2039], function(yearTwentyTemp, yearTwentyColor, countryCode){

// 				var tempDiff = currentTemp - yearTwentyTemp,
// 					diffMult = Math.floor(tempDiff/0.5),
// 					currentColor = [yearTwentyColor[0]+(15*diffMult), yearTwentyColor[1], yearTwentyColor[2]-(10*diffMult)];

// 				if(!isNaN(yearTwentyTemp)) {
// 					setSvgFill(countryCode, currentColor);
// 				}
// 			});
// 		});
// 	}
// });

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
		}, 1300);
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






