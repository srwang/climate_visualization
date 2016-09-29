var mousePosition0,
	svg,
	projection,
	path,
	feature,
	backgroundCircle;

module.exports = {
	createBg: function() {
		var width = $(window).width(),
		    height = 750;

		//create SVG
		svg = d3.select('#map').append('svg')
		    .attr('width', width)
		    .attr('height', height);

		//set map properties
		projection = d3.geoStereographic()
		    .scale(280)
		    .center([0, 0])
		    .translate([width / 2, height / 2])
		    .rotate([0,0,0])
		    .clipAngle(100);

		path = d3.geoPath()
		    .projection(projection);

		backgroundCircle = svg.append("circle")
		    .attr('cx', width / 2)
		    .attr('cy', height / 2)
		    .attr('r', 335)
		    .attr('id', 'background-circle');

		return svg
	},
	createCountries: function(promise, config) {
		promise.get('map_data/new_world.json')
		.then(function(world){
			
			world = JSON.parse(world);
			var subunits = topojson.feature(world, world.objects.subunits);
			//create countries' paths
			feature = svg.selectAll('.subunit')
			    .data(topojson.feature(world, world.objects.subunits).features)
			  .enter().append('path')
			    .attr('class', 
			    	function (d) { 
			    		return 'subunit ' + d.id.split(' ')[0]; 
			    	})
			    .attr('id', //class is country code (for api call), id is specific region code (to generate label)
			    	function (d) {
			    		return d.id.split(' ')[1] ? d.id.split(' ')[1] : d.id.split(' ')[0];
			    	})
			    .attr('d', path);

			//create labels
			label = svg.selectAll('.subunit-label')
				.data(topojson.feature(world, world.objects.subunits).features)
			.enter().append('text')
				.attr('class', 'subunit-label')
				.attr('id', 
			    	function (d) {
			    		return d.id.split(' ')[1] ? d.id.split(' ')[1] : d.id.split(' ')[0];
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
						.style('display', 'block');
				})
				.on('mouseleave', function(){
					svg.select('.subunit-label#' + this.id)
						.style('display', 'none');
				})
				.on('click', function(){ //maybe separate out this section too
					var id = this.id,
						countryCode = $(this).attr('class').split(' ')[1],
						countryName = $('.subunit-label#' + id).text(),
						range = config.yearRanges[$('#year-selector').val()];

					populateSidebar(promise, config, id, countryCode, countryName, range);
				});
		})
	},
	drag : function(){
		backgroundCircle.on('mousedown', function(){
			mousePosition0 = [d3.event.pageX, d3.event.pageY];
		});

		backgroundCircle.on('mousemove', function(){
			if (mousePosition0) {
				var currentCenter = projection.rotate(),
					mousePosition1 = [d3.event.pageX, d3.event.pageY],
					newCenter = [currentCenter[0] + (mousePosition0[0]-mousePosition1[0]) / 8, currentCenter[1] + (mousePosition1[1]-mousePosition0[1]) / 8];

				//set rotate according to mouse event
			    projection.rotate([-newCenter[0], -newCenter[1], 0]);
				 //add loading icon
				$('body').addClass('loading');

			    //rerender path using new projection
				feature.attr('d', d3.geoPath().projection(projection));
				//rerender labels
				label.attr('transform', function(d) { 
					var center = path.centroid(d);
					if (!isNaN(center[0])){
						return 'translate(' + [center[0] - 20, center[1]] + ')';
					}
				});	

				setTimeout(function(){
					$('body').removeClass('loading');
				}, 500)	
			}
		})

		backgroundCircle.on('mouseup', function(){
			//stop animation on mouseup
			mousePosition0=null;
		});
	}

}

function populateSidebar(promise, config, id, countryCode, countryName, yearRange) {

	promise.get(config.base + '/api/' + countryCode + '/2020to2039')
	.then(function(data){
		data = JSON.parse(data);
		var yearTwentyTemp = data.climateData[0].annualData * (9/5) + 32;
		yearTwentyTemp = Math.round(yearTwentyTemp * 100) / 100;

		if (!yearTwentyTemp) yearTwentyTemp = 'Unknown';

		$('#sidebar').addClass('show-data');
		$('#sidebar').html('');

		setTimeout(function(){//make sure data is return before appending
			$('#sidebar').append('' + 
				'<p id="close-button">x</p>' +
				'<h1>' + countryName + '</h1>' +
				'<p>Temperature in <strong>2020-2039</strong>: ' + yearTwentyTemp + ' &#8457;</p>');
		}, config.sidebarDisplay);

		if (!(yearRange[0] === 2020)) {
			return promise.get(config.base + '/api/' + countryCode + '/' + yearRange[0] + 'to' + yearRange[1])
		}
	})
	.then(function(currentTempData){
		currentTempData = JSON.parse(currentTempData);
		currentTemp = currentTempData.climateData[0].annualData * (9/5) + 32;
		currentTemp = Math.round(currentTemp * 100) / 100;

		if (!currentTemp) currentTemp = 'Unknown'; 

		setTimeout(function(){
			$('#sidebar').append('' +
				'<p>Temperature in ' + yearRange[0] + '-<strong>' + yearRange[1] + ': ' + currentTemp + '</strong> &#8457;</p>');
		}, config.sidebarDisplay);
	});
}
