(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports =  {
	base: 'http://localhost:3000',
	checkMapLoaded: 700,
	colorLoading: 4000,
	svgFill: 500,
	sidebarDisplay: 30,
	yearRanges: [[2020, 2039], [2040, 2059], [2060, 2079], [2080, 2099]]
}


},{}],2:[function(require,module,exports){
module.exports = {
	share: function(url){
		//setting up sdk
		window.fbAsyncInit = function() {
			    FB.init({
			      appId      : '1062966827118776',
			      xfbml      : true,
			      version    : 'v2.6'
			    });
			  };

		(function(d, s, id){
			var js, fjs = d.getElementsByTagName(s)[0];
			if (d.getElementById(id)) {return;}
			js = d.createElement(s); js.id = id;
			js.src = "//connect.facebook.net/en_US/sdk.js";
			fjs.parentNode.insertBefore(js, fjs);
		}(document, 'script', 'facebook-jssdk'));

		//facebook share
		$('#sidebar').on('click', '#share-button', function(){
			FB.ui({
			method: 'share',
			display: 'popup',
			href: url, 
			}, function(response){});
		});
	}
}
},{}],3:[function(require,module,exports){
$('body').addClass('loading');

$(document).ready(function(){

var config = require('./config'),
	fbSDK = require('./facebook_sdk'),
	promise = require('./promise'),
	calcTemp = require('./temp_calc'),
	sideNav = require('./sidenav');

//FB SHARE
fbSDK.share(config.base);

//CACHE SOME API CALLS OFF THE BAT
(function(){
	config.yearRanges.forEach(function(range){
		promise.get('map_data/country_codes.json')
		.then(function(codes){
			codes = JSON.parse(codes);
			for (country in codes) {
				promise.get(config.base + '/api/' + codes[country] + '/' + range[0] + 'to' + range[1]);
			}
		})
	})
})();

//LOADING ICON
function removeLoadingIcon() {
	if ($('path').length === 337) {//all countries drawn
		setTimeout(function(){//give colors time to load
			$('body').removeClass('loading');
		}, config.colorLoading);
	}
}
setInterval(removeLoadingIcon, config.checkMapLoaded);

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
    .clipAngle(100);

var path = d3.geoPath()
    .projection(projection);

var feature;

var backgroundCircle = svg.append("circle")
    .attr('cx', width / 2)
    .attr('cy', height / 2)
    .attr('r', 300)
    .attr('id', 'background-circle');

//RENDER MAP
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

			populateSidebar(id, countryCode, countryName, range);
		});

	function populateSidebar(id, countryCode, countryName, yearRange) {

		promise.get(config.base + '/api/' + countryCode + '/2020to2039')
		.then(function(data){
			data = JSON.parse(data);
			var yearTwentyTemp = data.climateData[0].annualData * (9/5) + 32;
			yearTwentyTemp = Math.round(yearTwentyTemp * 100) / 100;

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

			setTimeout(function(){
				$('#sidebar').append('' +
					'<p>Temperature in ' + yearRange[0] + '-<strong>' + yearRange[1] + ': ' + currentTemp + '</strong> &#8457;</p>');
			}, config.sidebarDisplay);
		});
	}
})

//DRAGGABLE GLOBE
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
	    //rerender path using new projection
		feature.attr('d', d3.geoPath().projection(projection));
		//rerender labels
		label.attr('transform', function(d) { 
			var center = path.centroid(d);
			if (!isNaN(center[0])){
				return 'translate(' + [center[0] - 20, center[1]] + ')';
			}
		});		
	}
})

backgroundCircle.on('mouseup', function(){
	//stop animation on mouseup
	mousePosition0=null;
});

//COLORS
//set map to colors corresponding to 2020 temps
calcTemp.setInitialColor(promise, config, svg);
//as temp changes over time, will increment or decrement reds to make change more visible
calcTemp.setColorWithSlider(promise, config, svg);
//SIDENAV
//click events
sideNav.openFacts();
sideNav.close();

});








},{"./config":1,"./facebook_sdk":2,"./promise":4,"./sidenav":5,"./temp_calc":6}],4:[function(require,module,exports){
module.exports = {
    get : function(url) {
      return new Promise(function(resolve, reject) {
        //  XHR stuff
        var req = new XMLHttpRequest();
        req.open('GET', url);

        req.onload = function() {
          if (req.status == 200) {
            resolve(req.response);
          }
          else {
            reject(Error(req.statusText));
          }
        };

        // Handle network errors
        req.onerror = function() {
          reject(Error("Network Error"));
        };

        req.send();
      });
    }
}


},{}],5:[function(require,module,exports){
module.exports = {
	openFacts: function(){
		$('#sidebar').on('click', '#question-icon', function(){
			$('#sidebar').addClass('show-facts');
			$('#sidebar').html('');
			//populate sidebar with description of app
			setTimeout(function(){
				$('#sidebar').html(''+
					'<p id="close-button">x</p>' +
					'<p>Climate Map pulls data from the <a target="_blank" href="http://www.worldbank.org/en/topic/climatechange">World Bank</a> climate api to make a visualization of projected temperature changes over the current century. The temperatures used are taken from the <a target="_blank" href="https://en.wikipedia.org/wiki/Special_Report_on_Emissions_Scenarios">A2</a> scenario.<p>' + 
					'<p>To make temperature change more evident, a different calculation is used to generate the initial colors than is used to depict the change, which features deepening red tones per 0.5 degree shift.</p>' +
					'<p>For more information:</p>' + 
					'<p><a target="_blank" href="https://www.washingtonpost.com/news/capital-weather-gang/wp/2016/05/10/the-most-compelling-visual-of-global-warming-ever-made/">Hawkins Spiral Visualization</a></p>' + 
					'<p><a target="_blank" href="http://climate.nasa.gov/effects/">NASA</a></p>' +
					'<p><a target="_blank" href="https://www.ncdc.noaa.gov/indicators/">NOAA</a></p>');
			},50);
		});
	},
	close: function() {
		$('#sidebar').on('click', '#close-button', function(){
			$('#sidebar').removeClass();
			$('#sidebar').html('');

			setTimeout(function(){
				$('#sidebar').html('<h5 id="question-icon">?</h5>' +
					'<h5 id="share-button">f</h5>');		
			},50);
		});
	}
}
},{}],6:[function(require,module,exports){
module.exports = {
	setInitialColor: function (promise, config, svg) {
		changeMapColor(promise, config, [2020, 2039], function(yearTwentyTemp, yearTwentyColor, countryCode){
				setSvgFill(svg, config, countryCode, yearTwentyColor);	
		});
	},
	setColorWithSlider: function(promise, config, svg) {
		$('#year-selector').change(function(){
			var range = findYearRange(config);
			$('#selector-label').text(range[0] + ' -- ' + range[1]);

			if (range[0] === 2020) {
				changeMapColor(promise, config, range, function(yearTwentyTemp, yearTwentyColor, countryCode){
					setSvgFill(svg, config, countryCode, yearTwentyColor);	
				});
			} else {
				changeMapColor(promise, config, range, function(currentTemp, countryCode){
					makeApiCall(promise, config, countryCode, [2020, 2039], function(yearTwentyTemp, yearTwentyColor, countryCode){

						var tempDiff = currentTemp - yearTwentyTemp,
							diffMult = Math.floor(tempDiff/0.5),
							currentColor = [yearTwentyColor[0]+(15*diffMult), yearTwentyColor[1], yearTwentyColor[2]-(10*diffMult)];

						if(!isNaN(yearTwentyTemp)) {
							setSvgFill(svg, config, countryCode, currentColor);
						};
					});
				});
			};
		});
	}
}

function changeMapColor(promise, config, yearRange, callback){
	promise.get('map_data/country_codes.json')
	.then(function(codes){
		codes = JSON.parse(codes);
		for (country in codes) {
			(function(countryCode, yearRange){
				makeApiCall(promise, config, countryCode, yearRange, callback);
			})(codes[country], yearRange);
		}
	})
};

function makeApiCall(promise, config, countryCode, yearRange, callback) {
	promise.get(config.base + '/api/' + countryCode + '/' + yearRange[0] + 'to' + yearRange[1])
	.then(function(data){
		data = JSON.parse(data);
		var temp = data.climateData[0].annualData * (9/5) + 32;

		if (yearRange[0] === 2020) {
			//create config.base color for 2020
			var tempDiff = temp - 42,
			diffMult = Math.floor(tempDiff / 2),
			standardColor = [101, 145, 177],
			newColor = [standardColor[0] - (2 *(diffMult)), standardColor[1] - (4*(diffMult)), standardColor[2] - (7*(diffMult))];

			callback(temp, newColor, countryCode);
		} else {
			callback(temp, countryCode);
		}
	});
};

function setSvgFill(svg, config, countryCode, color) {
	setTimeout(function(){
			svg.selectAll('.subunit.' + countryCode)
				.transition()
				.style('fill', function(){ return 'rgb(' + color[0] + ', ' + color[1] + ', ' + color[2] + ')'});
		}, config.svgFill);
};

function findYearRange(config) {
	var rangeKey = $('#year-selector').val();	
	return config.yearRanges[rangeKey];
};


},{}]},{},[3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9jb25maWcuanMiLCJqcy9mYWNlYm9va19zZGsuanMiLCJqcy9tYWluLmpzIiwianMvcHJvbWlzZS5qcyIsImpzL3NpZGVuYXYuanMiLCJqcy90ZW1wX2NhbGMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDak5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJtb2R1bGUuZXhwb3J0cyA9ICB7XG5cdGJhc2U6ICdodHRwOi8vbG9jYWxob3N0OjMwMDAnLFxuXHRjaGVja01hcExvYWRlZDogNzAwLFxuXHRjb2xvckxvYWRpbmc6IDQwMDAsXG5cdHN2Z0ZpbGw6IDUwMCxcblx0c2lkZWJhckRpc3BsYXk6IDMwLFxuXHR5ZWFyUmFuZ2VzOiBbWzIwMjAsIDIwMzldLCBbMjA0MCwgMjA1OV0sIFsyMDYwLCAyMDc5XSwgWzIwODAsIDIwOTldXVxufVxuXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0c2hhcmU6IGZ1bmN0aW9uKHVybCl7XG5cdFx0Ly9zZXR0aW5nIHVwIHNka1xuXHRcdHdpbmRvdy5mYkFzeW5jSW5pdCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0ICAgIEZCLmluaXQoe1xuXHRcdFx0ICAgICAgYXBwSWQgICAgICA6ICcxMDYyOTY2ODI3MTE4Nzc2Jyxcblx0XHRcdCAgICAgIHhmYm1sICAgICAgOiB0cnVlLFxuXHRcdFx0ICAgICAgdmVyc2lvbiAgICA6ICd2Mi42J1xuXHRcdFx0ICAgIH0pO1xuXHRcdFx0ICB9O1xuXG5cdFx0KGZ1bmN0aW9uKGQsIHMsIGlkKXtcblx0XHRcdHZhciBqcywgZmpzID0gZC5nZXRFbGVtZW50c0J5VGFnTmFtZShzKVswXTtcblx0XHRcdGlmIChkLmdldEVsZW1lbnRCeUlkKGlkKSkge3JldHVybjt9XG5cdFx0XHRqcyA9IGQuY3JlYXRlRWxlbWVudChzKTsganMuaWQgPSBpZDtcblx0XHRcdGpzLnNyYyA9IFwiLy9jb25uZWN0LmZhY2Vib29rLm5ldC9lbl9VUy9zZGsuanNcIjtcblx0XHRcdGZqcy5wYXJlbnROb2RlLmluc2VydEJlZm9yZShqcywgZmpzKTtcblx0XHR9KGRvY3VtZW50LCAnc2NyaXB0JywgJ2ZhY2Vib29rLWpzc2RrJykpO1xuXG5cdFx0Ly9mYWNlYm9vayBzaGFyZVxuXHRcdCQoJyNzaWRlYmFyJykub24oJ2NsaWNrJywgJyNzaGFyZS1idXR0b24nLCBmdW5jdGlvbigpe1xuXHRcdFx0RkIudWkoe1xuXHRcdFx0bWV0aG9kOiAnc2hhcmUnLFxuXHRcdFx0ZGlzcGxheTogJ3BvcHVwJyxcblx0XHRcdGhyZWY6IHVybCwgXG5cdFx0XHR9LCBmdW5jdGlvbihyZXNwb25zZSl7fSk7XG5cdFx0fSk7XG5cdH1cbn0iLCIkKCdib2R5JykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKXtcblxudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnJyksXG5cdGZiU0RLID0gcmVxdWlyZSgnLi9mYWNlYm9va19zZGsnKSxcblx0cHJvbWlzZSA9IHJlcXVpcmUoJy4vcHJvbWlzZScpLFxuXHRjYWxjVGVtcCA9IHJlcXVpcmUoJy4vdGVtcF9jYWxjJyksXG5cdHNpZGVOYXYgPSByZXF1aXJlKCcuL3NpZGVuYXYnKTtcblxuLy9GQiBTSEFSRVxuZmJTREsuc2hhcmUoY29uZmlnLmJhc2UpO1xuXG4vL0NBQ0hFIFNPTUUgQVBJIENBTExTIE9GRiBUSEUgQkFUXG4oZnVuY3Rpb24oKXtcblx0Y29uZmlnLnllYXJSYW5nZXMuZm9yRWFjaChmdW5jdGlvbihyYW5nZSl7XG5cdFx0cHJvbWlzZS5nZXQoJ21hcF9kYXRhL2NvdW50cnlfY29kZXMuanNvbicpXG5cdFx0LnRoZW4oZnVuY3Rpb24oY29kZXMpe1xuXHRcdFx0Y29kZXMgPSBKU09OLnBhcnNlKGNvZGVzKTtcblx0XHRcdGZvciAoY291bnRyeSBpbiBjb2Rlcykge1xuXHRcdFx0XHRwcm9taXNlLmdldChjb25maWcuYmFzZSArICcvYXBpLycgKyBjb2Rlc1tjb3VudHJ5XSArICcvJyArIHJhbmdlWzBdICsgJ3RvJyArIHJhbmdlWzFdKTtcblx0XHRcdH1cblx0XHR9KVxuXHR9KVxufSkoKTtcblxuLy9MT0FESU5HIElDT05cbmZ1bmN0aW9uIHJlbW92ZUxvYWRpbmdJY29uKCkge1xuXHRpZiAoJCgncGF0aCcpLmxlbmd0aCA9PT0gMzM3KSB7Ly9hbGwgY291bnRyaWVzIGRyYXduXG5cdFx0c2V0VGltZW91dChmdW5jdGlvbigpey8vZ2l2ZSBjb2xvcnMgdGltZSB0byBsb2FkXG5cdFx0XHQkKCdib2R5JykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHR9LCBjb25maWcuY29sb3JMb2FkaW5nKTtcblx0fVxufVxuc2V0SW50ZXJ2YWwocmVtb3ZlTG9hZGluZ0ljb24sIGNvbmZpZy5jaGVja01hcExvYWRlZCk7XG5cbi8vU0VUIFVQIE1BUFxudmFyIHdpZHRoID0gJCh3aW5kb3cpLndpZHRoKCksXG4gICAgaGVpZ2h0ID0gNjAwO1xuXG52YXIgbW91c2VQb3NpdGlvbjA7XG5cbi8vY3JlYXRlIFNWR1xudmFyIHN2ZyA9IGQzLnNlbGVjdCgnI21hcCcpLmFwcGVuZCgnc3ZnJylcbiAgICAuYXR0cignd2lkdGgnLCB3aWR0aClcbiAgICAuYXR0cignaGVpZ2h0JywgaGVpZ2h0KTtcblxuLy9zZXQgbWFwIHByb3BlcnRpZXNcbnZhciBwcm9qZWN0aW9uID0gZDMuZ2VvU3RlcmVvZ3JhcGhpYygpXG4gICAgLnNjYWxlKDI1MClcbiAgICAuY2VudGVyKFswLCAwXSlcbiAgICAudHJhbnNsYXRlKFt3aWR0aCAvIDIsIGhlaWdodCAvIDJdKVxuICAgIC5yb3RhdGUoWzAsMCwwXSlcbiAgICAuY2xpcEFuZ2xlKDEwMCk7XG5cbnZhciBwYXRoID0gZDMuZ2VvUGF0aCgpXG4gICAgLnByb2plY3Rpb24ocHJvamVjdGlvbik7XG5cbnZhciBmZWF0dXJlO1xuXG52YXIgYmFja2dyb3VuZENpcmNsZSA9IHN2Zy5hcHBlbmQoXCJjaXJjbGVcIilcbiAgICAuYXR0cignY3gnLCB3aWR0aCAvIDIpXG4gICAgLmF0dHIoJ2N5JywgaGVpZ2h0IC8gMilcbiAgICAuYXR0cigncicsIDMwMClcbiAgICAuYXR0cignaWQnLCAnYmFja2dyb3VuZC1jaXJjbGUnKTtcblxuLy9SRU5ERVIgTUFQXG5wcm9taXNlLmdldCgnbWFwX2RhdGEvbmV3X3dvcmxkLmpzb24nKVxuLnRoZW4oZnVuY3Rpb24od29ybGQpe1xuXHRcblx0d29ybGQgPSBKU09OLnBhcnNlKHdvcmxkKTtcblx0dmFyIHN1YnVuaXRzID0gdG9wb2pzb24uZmVhdHVyZSh3b3JsZCwgd29ybGQub2JqZWN0cy5zdWJ1bml0cyk7XG5cdC8vY3JlYXRlIGNvdW50cmllcycgcGF0aHNcblx0ZmVhdHVyZSA9IHN2Zy5zZWxlY3RBbGwoJy5zdWJ1bml0Jylcblx0ICAgIC5kYXRhKHRvcG9qc29uLmZlYXR1cmUod29ybGQsIHdvcmxkLm9iamVjdHMuc3VidW5pdHMpLmZlYXR1cmVzKVxuXHQgIC5lbnRlcigpLmFwcGVuZCgncGF0aCcpXG5cdCAgICAuYXR0cignY2xhc3MnLCBcblx0ICAgIFx0ZnVuY3Rpb24gKGQpIHsgXG5cdCAgICBcdFx0cmV0dXJuICdzdWJ1bml0ICcgKyBkLmlkLnNwbGl0KCcgJylbMF07IFxuXHQgICAgXHR9KVxuXHQgICAgLmF0dHIoJ2lkJywgLy9jbGFzcyBpcyBjb3VudHJ5IGNvZGUgKGZvciBhcGkgY2FsbCksIGlkIGlzIHNwZWNpZmljIHJlZ2lvbiBjb2RlICh0byBnZW5lcmF0ZSBsYWJlbClcblx0ICAgIFx0ZnVuY3Rpb24gKGQpIHtcblx0ICAgIFx0XHRyZXR1cm4gZC5pZC5zcGxpdCgnICcpWzFdID8gZC5pZC5zcGxpdCgnICcpWzFdIDogZC5pZC5zcGxpdCgnICcpWzBdO1xuXHQgICAgXHR9KVxuXHQgICAgLmF0dHIoJ2QnLCBwYXRoKTtcblxuXHQvL2NyZWF0ZSBsYWJlbHNcblx0bGFiZWwgPSBzdmcuc2VsZWN0QWxsKCcuc3VidW5pdC1sYWJlbCcpXG5cdFx0LmRhdGEodG9wb2pzb24uZmVhdHVyZSh3b3JsZCwgd29ybGQub2JqZWN0cy5zdWJ1bml0cykuZmVhdHVyZXMpXG5cdC5lbnRlcigpLmFwcGVuZCgndGV4dCcpXG5cdFx0LmF0dHIoJ2NsYXNzJywgJ3N1YnVuaXQtbGFiZWwnKVxuXHRcdC5hdHRyKCdpZCcsIFxuXHQgICAgXHRmdW5jdGlvbiAoZCkge1xuXHQgICAgXHRcdHJldHVybiBkLmlkLnNwbGl0KCcgJylbMV0gPyBkLmlkLnNwbGl0KCcgJylbMV0gOiBkLmlkLnNwbGl0KCcgJylbMF07XG5cdCAgICBcdH0pXG5cdFx0LmF0dHIoJ3RyYW5zZm9ybScsIGZ1bmN0aW9uKGQpIHsgXG5cdFx0XHR2YXIgY2VudGVyID0gcGF0aC5jZW50cm9pZChkKTtcblx0XHRcdC8vYWRqdXN0IGZvciBsZWZ0IG9mZnNldFxuXHRcdFx0aWYgKCFpc05hTihjZW50ZXJbMF0pKXtcblx0XHRcdFx0cmV0dXJuICd0cmFuc2xhdGUoJyArIFtjZW50ZXJbMF0gLSAyMCwgY2VudGVyWzFdXSArICcpJztcblx0XHRcdH1cblx0XHR9KVxuXHRcdC5hdHRyKCdkeScsICcuMWVtJylcblx0XHQuc3R5bGUoJ2ZpbGwnLCAnYmxhY2snKVxuXHRcdC5zdHlsZSgnZGlzcGxheScsICdub25lJylcblx0XHQudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLnByb3BlcnRpZXMubmFtZTsgfSk7XG5cblx0Ly9kaXNwbGF5IGxhYmVscyBvbiBob3ZlclxuXHRzdmcuc2VsZWN0QWxsKCcuc3VidW5pdCcpXG5cdFx0Lm9uKCdtb3VzZWVudGVyJywgZnVuY3Rpb24oKXsgXG5cdFx0XHRzdmcuc2VsZWN0KCcuc3VidW5pdC1sYWJlbCMnICsgdGhpcy5pZClcblx0XHRcdFx0LnN0eWxlKCdkaXNwbGF5JywgJ2Jsb2NrJyk7XG5cdFx0fSlcblx0XHQub24oJ21vdXNlbGVhdmUnLCBmdW5jdGlvbigpe1xuXHRcdFx0c3ZnLnNlbGVjdCgnLnN1YnVuaXQtbGFiZWwjJyArIHRoaXMuaWQpXG5cdFx0XHRcdC5zdHlsZSgnZGlzcGxheScsICdub25lJyk7XG5cdFx0fSlcblx0XHQub24oJ2NsaWNrJywgZnVuY3Rpb24oKXsgLy9tYXliZSBzZXBhcmF0ZSBvdXQgdGhpcyBzZWN0aW9uIHRvb1xuXHRcdFx0dmFyIGlkID0gdGhpcy5pZCxcblx0XHRcdFx0Y291bnRyeUNvZGUgPSAkKHRoaXMpLmF0dHIoJ2NsYXNzJykuc3BsaXQoJyAnKVsxXSxcblx0XHRcdFx0Y291bnRyeU5hbWUgPSAkKCcuc3VidW5pdC1sYWJlbCMnICsgaWQpLnRleHQoKSxcblx0XHRcdFx0cmFuZ2UgPSBjb25maWcueWVhclJhbmdlc1skKCcjeWVhci1zZWxlY3RvcicpLnZhbCgpXTtcblxuXHRcdFx0cG9wdWxhdGVTaWRlYmFyKGlkLCBjb3VudHJ5Q29kZSwgY291bnRyeU5hbWUsIHJhbmdlKTtcblx0XHR9KTtcblxuXHRmdW5jdGlvbiBwb3B1bGF0ZVNpZGViYXIoaWQsIGNvdW50cnlDb2RlLCBjb3VudHJ5TmFtZSwgeWVhclJhbmdlKSB7XG5cblx0XHRwcm9taXNlLmdldChjb25maWcuYmFzZSArICcvYXBpLycgKyBjb3VudHJ5Q29kZSArICcvMjAyMHRvMjAzOScpXG5cdFx0LnRoZW4oZnVuY3Rpb24oZGF0YSl7XG5cdFx0XHRkYXRhID0gSlNPTi5wYXJzZShkYXRhKTtcblx0XHRcdHZhciB5ZWFyVHdlbnR5VGVtcCA9IGRhdGEuY2xpbWF0ZURhdGFbMF0uYW5udWFsRGF0YSAqICg5LzUpICsgMzI7XG5cdFx0XHR5ZWFyVHdlbnR5VGVtcCA9IE1hdGgucm91bmQoeWVhclR3ZW50eVRlbXAgKiAxMDApIC8gMTAwO1xuXG5cdFx0XHQkKCcjc2lkZWJhcicpLmFkZENsYXNzKCdzaG93LWRhdGEnKTtcblx0XHRcdCQoJyNzaWRlYmFyJykuaHRtbCgnJyk7XG5cblx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXsvL21ha2Ugc3VyZSBkYXRhIGlzIHJldHVybiBiZWZvcmUgYXBwZW5kaW5nXG5cdFx0XHRcdCQoJyNzaWRlYmFyJykuYXBwZW5kKCcnICsgXG5cdFx0XHRcdFx0JzxwIGlkPVwiY2xvc2UtYnV0dG9uXCI+eDwvcD4nICtcblx0XHRcdFx0XHQnPGgxPicgKyBjb3VudHJ5TmFtZSArICc8L2gxPicgK1xuXHRcdFx0XHRcdCc8cD5UZW1wZXJhdHVyZSBpbiA8c3Ryb25nPjIwMjAtMjAzOTwvc3Ryb25nPjogJyArIHllYXJUd2VudHlUZW1wICsgJyAmIzg0NTc7PC9wPicpO1xuXHRcdFx0fSwgY29uZmlnLnNpZGViYXJEaXNwbGF5KTtcblxuXHRcdFx0aWYgKCEoeWVhclJhbmdlWzBdID09PSAyMDIwKSkge1xuXHRcdFx0XHRyZXR1cm4gcHJvbWlzZS5nZXQoY29uZmlnLmJhc2UgKyAnL2FwaS8nICsgY291bnRyeUNvZGUgKyAnLycgKyB5ZWFyUmFuZ2VbMF0gKyAndG8nICsgeWVhclJhbmdlWzFdKVxuXHRcdFx0fVxuXHRcdH0pXG5cdFx0LnRoZW4oZnVuY3Rpb24oY3VycmVudFRlbXBEYXRhKXtcblx0XHRcdGN1cnJlbnRUZW1wRGF0YSA9IEpTT04ucGFyc2UoY3VycmVudFRlbXBEYXRhKTtcblx0XHRcdGN1cnJlbnRUZW1wID0gY3VycmVudFRlbXBEYXRhLmNsaW1hdGVEYXRhWzBdLmFubnVhbERhdGEgKiAoOS81KSArIDMyO1xuXHRcdFx0Y3VycmVudFRlbXAgPSBNYXRoLnJvdW5kKGN1cnJlbnRUZW1wICogMTAwKSAvIDEwMDtcblxuXHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0XHQkKCcjc2lkZWJhcicpLmFwcGVuZCgnJyArXG5cdFx0XHRcdFx0JzxwPlRlbXBlcmF0dXJlIGluICcgKyB5ZWFyUmFuZ2VbMF0gKyAnLTxzdHJvbmc+JyArIHllYXJSYW5nZVsxXSArICc6ICcgKyBjdXJyZW50VGVtcCArICc8L3N0cm9uZz4gJiM4NDU3OzwvcD4nKTtcblx0XHRcdH0sIGNvbmZpZy5zaWRlYmFyRGlzcGxheSk7XG5cdFx0fSk7XG5cdH1cbn0pXG5cbi8vRFJBR0dBQkxFIEdMT0JFXG5iYWNrZ3JvdW5kQ2lyY2xlLm9uKCdtb3VzZWRvd24nLCBmdW5jdGlvbigpe1xuXHRtb3VzZVBvc2l0aW9uMCA9IFtkMy5ldmVudC5wYWdlWCwgZDMuZXZlbnQucGFnZVldO1xufSk7XG5cbmJhY2tncm91bmRDaXJjbGUub24oJ21vdXNlbW92ZScsIGZ1bmN0aW9uKCl7XG5cdGlmIChtb3VzZVBvc2l0aW9uMCkge1xuXHRcdHZhciBjdXJyZW50Q2VudGVyID0gcHJvamVjdGlvbi5yb3RhdGUoKSxcblx0XHRcdG1vdXNlUG9zaXRpb24xID0gW2QzLmV2ZW50LnBhZ2VYLCBkMy5ldmVudC5wYWdlWV0sXG5cdFx0XHRuZXdDZW50ZXIgPSBbY3VycmVudENlbnRlclswXSArIChtb3VzZVBvc2l0aW9uMFswXS1tb3VzZVBvc2l0aW9uMVswXSkgLyA4LCBjdXJyZW50Q2VudGVyWzFdICsgKG1vdXNlUG9zaXRpb24xWzFdLW1vdXNlUG9zaXRpb24wWzFdKSAvIDhdO1xuXG5cdFx0Ly9zZXQgcm90YXRlIGFjY29yZGluZyB0byBtb3VzZSBldmVudFxuXHQgICAgcHJvamVjdGlvbi5yb3RhdGUoWy1uZXdDZW50ZXJbMF0sIC1uZXdDZW50ZXJbMV0sIDBdKTtcblx0ICAgIC8vcmVyZW5kZXIgcGF0aCB1c2luZyBuZXcgcHJvamVjdGlvblxuXHRcdGZlYXR1cmUuYXR0cignZCcsIGQzLmdlb1BhdGgoKS5wcm9qZWN0aW9uKHByb2plY3Rpb24pKTtcblx0XHQvL3JlcmVuZGVyIGxhYmVsc1xuXHRcdGxhYmVsLmF0dHIoJ3RyYW5zZm9ybScsIGZ1bmN0aW9uKGQpIHsgXG5cdFx0XHR2YXIgY2VudGVyID0gcGF0aC5jZW50cm9pZChkKTtcblx0XHRcdGlmICghaXNOYU4oY2VudGVyWzBdKSl7XG5cdFx0XHRcdHJldHVybiAndHJhbnNsYXRlKCcgKyBbY2VudGVyWzBdIC0gMjAsIGNlbnRlclsxXV0gKyAnKSc7XG5cdFx0XHR9XG5cdFx0fSk7XHRcdFxuXHR9XG59KVxuXG5iYWNrZ3JvdW5kQ2lyY2xlLm9uKCdtb3VzZXVwJywgZnVuY3Rpb24oKXtcblx0Ly9zdG9wIGFuaW1hdGlvbiBvbiBtb3VzZXVwXG5cdG1vdXNlUG9zaXRpb24wPW51bGw7XG59KTtcblxuLy9DT0xPUlNcbi8vc2V0IG1hcCB0byBjb2xvcnMgY29ycmVzcG9uZGluZyB0byAyMDIwIHRlbXBzXG5jYWxjVGVtcC5zZXRJbml0aWFsQ29sb3IocHJvbWlzZSwgY29uZmlnLCBzdmcpO1xuLy9hcyB0ZW1wIGNoYW5nZXMgb3ZlciB0aW1lLCB3aWxsIGluY3JlbWVudCBvciBkZWNyZW1lbnQgcmVkcyB0byBtYWtlIGNoYW5nZSBtb3JlIHZpc2libGVcbmNhbGNUZW1wLnNldENvbG9yV2l0aFNsaWRlcihwcm9taXNlLCBjb25maWcsIHN2Zyk7XG4vL1NJREVOQVZcbi8vY2xpY2sgZXZlbnRzXG5zaWRlTmF2Lm9wZW5GYWN0cygpO1xuc2lkZU5hdi5jbG9zZSgpO1xuXG59KTtcblxuXG5cblxuXG5cblxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZ2V0IDogZnVuY3Rpb24odXJsKSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIC8vICBYSFIgc3R1ZmZcbiAgICAgICAgdmFyIHJlcSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICByZXEub3BlbignR0VUJywgdXJsKTtcblxuICAgICAgICByZXEub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKHJlcS5zdGF0dXMgPT0gMjAwKSB7XG4gICAgICAgICAgICByZXNvbHZlKHJlcS5yZXNwb25zZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmVqZWN0KEVycm9yKHJlcS5zdGF0dXNUZXh0KSk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEhhbmRsZSBuZXR3b3JrIGVycm9yc1xuICAgICAgICByZXEub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJlamVjdChFcnJvcihcIk5ldHdvcmsgRXJyb3JcIikpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHJlcS5zZW5kKCk7XG4gICAgICB9KTtcbiAgICB9XG59XG5cbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHRvcGVuRmFjdHM6IGZ1bmN0aW9uKCl7XG5cdFx0JCgnI3NpZGViYXInKS5vbignY2xpY2snLCAnI3F1ZXN0aW9uLWljb24nLCBmdW5jdGlvbigpe1xuXHRcdFx0JCgnI3NpZGViYXInKS5hZGRDbGFzcygnc2hvdy1mYWN0cycpO1xuXHRcdFx0JCgnI3NpZGViYXInKS5odG1sKCcnKTtcblx0XHRcdC8vcG9wdWxhdGUgc2lkZWJhciB3aXRoIGRlc2NyaXB0aW9uIG9mIGFwcFxuXHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0XHQkKCcjc2lkZWJhcicpLmh0bWwoJycrXG5cdFx0XHRcdFx0JzxwIGlkPVwiY2xvc2UtYnV0dG9uXCI+eDwvcD4nICtcblx0XHRcdFx0XHQnPHA+Q2xpbWF0ZSBNYXAgcHVsbHMgZGF0YSBmcm9tIHRoZSA8YSB0YXJnZXQ9XCJfYmxhbmtcIiBocmVmPVwiaHR0cDovL3d3dy53b3JsZGJhbmsub3JnL2VuL3RvcGljL2NsaW1hdGVjaGFuZ2VcIj5Xb3JsZCBCYW5rPC9hPiBjbGltYXRlIGFwaSB0byBtYWtlIGEgdmlzdWFsaXphdGlvbiBvZiBwcm9qZWN0ZWQgdGVtcGVyYXR1cmUgY2hhbmdlcyBvdmVyIHRoZSBjdXJyZW50IGNlbnR1cnkuIFRoZSB0ZW1wZXJhdHVyZXMgdXNlZCBhcmUgdGFrZW4gZnJvbSB0aGUgPGEgdGFyZ2V0PVwiX2JsYW5rXCIgaHJlZj1cImh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1NwZWNpYWxfUmVwb3J0X29uX0VtaXNzaW9uc19TY2VuYXJpb3NcIj5BMjwvYT4gc2NlbmFyaW8uPHA+JyArIFxuXHRcdFx0XHRcdCc8cD5UbyBtYWtlIHRlbXBlcmF0dXJlIGNoYW5nZSBtb3JlIGV2aWRlbnQsIGEgZGlmZmVyZW50IGNhbGN1bGF0aW9uIGlzIHVzZWQgdG8gZ2VuZXJhdGUgdGhlIGluaXRpYWwgY29sb3JzIHRoYW4gaXMgdXNlZCB0byBkZXBpY3QgdGhlIGNoYW5nZSwgd2hpY2ggZmVhdHVyZXMgZGVlcGVuaW5nIHJlZCB0b25lcyBwZXIgMC41IGRlZ3JlZSBzaGlmdC48L3A+JyArXG5cdFx0XHRcdFx0JzxwPkZvciBtb3JlIGluZm9ybWF0aW9uOjwvcD4nICsgXG5cdFx0XHRcdFx0JzxwPjxhIHRhcmdldD1cIl9ibGFua1wiIGhyZWY9XCJodHRwczovL3d3dy53YXNoaW5ndG9ucG9zdC5jb20vbmV3cy9jYXBpdGFsLXdlYXRoZXItZ2FuZy93cC8yMDE2LzA1LzEwL3RoZS1tb3N0LWNvbXBlbGxpbmctdmlzdWFsLW9mLWdsb2JhbC13YXJtaW5nLWV2ZXItbWFkZS9cIj5IYXdraW5zIFNwaXJhbCBWaXN1YWxpemF0aW9uPC9hPjwvcD4nICsgXG5cdFx0XHRcdFx0JzxwPjxhIHRhcmdldD1cIl9ibGFua1wiIGhyZWY9XCJodHRwOi8vY2xpbWF0ZS5uYXNhLmdvdi9lZmZlY3RzL1wiPk5BU0E8L2E+PC9wPicgK1xuXHRcdFx0XHRcdCc8cD48YSB0YXJnZXQ9XCJfYmxhbmtcIiBocmVmPVwiaHR0cHM6Ly93d3cubmNkYy5ub2FhLmdvdi9pbmRpY2F0b3JzL1wiPk5PQUE8L2E+PC9wPicpO1xuXHRcdFx0fSw1MCk7XG5cdFx0fSk7XG5cdH0sXG5cdGNsb3NlOiBmdW5jdGlvbigpIHtcblx0XHQkKCcjc2lkZWJhcicpLm9uKCdjbGljaycsICcjY2xvc2UtYnV0dG9uJywgZnVuY3Rpb24oKXtcblx0XHRcdCQoJyNzaWRlYmFyJykucmVtb3ZlQ2xhc3MoKTtcblx0XHRcdCQoJyNzaWRlYmFyJykuaHRtbCgnJyk7XG5cblx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdFx0JCgnI3NpZGViYXInKS5odG1sKCc8aDUgaWQ9XCJxdWVzdGlvbi1pY29uXCI+PzwvaDU+JyArXG5cdFx0XHRcdFx0JzxoNSBpZD1cInNoYXJlLWJ1dHRvblwiPmY8L2g1PicpO1x0XHRcblx0XHRcdH0sNTApO1xuXHRcdH0pO1xuXHR9XG59IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdHNldEluaXRpYWxDb2xvcjogZnVuY3Rpb24gKHByb21pc2UsIGNvbmZpZywgc3ZnKSB7XG5cdFx0Y2hhbmdlTWFwQ29sb3IocHJvbWlzZSwgY29uZmlnLCBbMjAyMCwgMjAzOV0sIGZ1bmN0aW9uKHllYXJUd2VudHlUZW1wLCB5ZWFyVHdlbnR5Q29sb3IsIGNvdW50cnlDb2RlKXtcblx0XHRcdFx0c2V0U3ZnRmlsbChzdmcsIGNvbmZpZywgY291bnRyeUNvZGUsIHllYXJUd2VudHlDb2xvcik7XHRcblx0XHR9KTtcblx0fSxcblx0c2V0Q29sb3JXaXRoU2xpZGVyOiBmdW5jdGlvbihwcm9taXNlLCBjb25maWcsIHN2Zykge1xuXHRcdCQoJyN5ZWFyLXNlbGVjdG9yJykuY2hhbmdlKGZ1bmN0aW9uKCl7XG5cdFx0XHR2YXIgcmFuZ2UgPSBmaW5kWWVhclJhbmdlKGNvbmZpZyk7XG5cdFx0XHQkKCcjc2VsZWN0b3ItbGFiZWwnKS50ZXh0KHJhbmdlWzBdICsgJyAtLSAnICsgcmFuZ2VbMV0pO1xuXG5cdFx0XHRpZiAocmFuZ2VbMF0gPT09IDIwMjApIHtcblx0XHRcdFx0Y2hhbmdlTWFwQ29sb3IocHJvbWlzZSwgY29uZmlnLCByYW5nZSwgZnVuY3Rpb24oeWVhclR3ZW50eVRlbXAsIHllYXJUd2VudHlDb2xvciwgY291bnRyeUNvZGUpe1xuXHRcdFx0XHRcdHNldFN2Z0ZpbGwoc3ZnLCBjb25maWcsIGNvdW50cnlDb2RlLCB5ZWFyVHdlbnR5Q29sb3IpO1x0XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y2hhbmdlTWFwQ29sb3IocHJvbWlzZSwgY29uZmlnLCByYW5nZSwgZnVuY3Rpb24oY3VycmVudFRlbXAsIGNvdW50cnlDb2RlKXtcblx0XHRcdFx0XHRtYWtlQXBpQ2FsbChwcm9taXNlLCBjb25maWcsIGNvdW50cnlDb2RlLCBbMjAyMCwgMjAzOV0sIGZ1bmN0aW9uKHllYXJUd2VudHlUZW1wLCB5ZWFyVHdlbnR5Q29sb3IsIGNvdW50cnlDb2RlKXtcblxuXHRcdFx0XHRcdFx0dmFyIHRlbXBEaWZmID0gY3VycmVudFRlbXAgLSB5ZWFyVHdlbnR5VGVtcCxcblx0XHRcdFx0XHRcdFx0ZGlmZk11bHQgPSBNYXRoLmZsb29yKHRlbXBEaWZmLzAuNSksXG5cdFx0XHRcdFx0XHRcdGN1cnJlbnRDb2xvciA9IFt5ZWFyVHdlbnR5Q29sb3JbMF0rKDE1KmRpZmZNdWx0KSwgeWVhclR3ZW50eUNvbG9yWzFdLCB5ZWFyVHdlbnR5Q29sb3JbMl0tKDEwKmRpZmZNdWx0KV07XG5cblx0XHRcdFx0XHRcdGlmKCFpc05hTih5ZWFyVHdlbnR5VGVtcCkpIHtcblx0XHRcdFx0XHRcdFx0c2V0U3ZnRmlsbChzdmcsIGNvbmZpZywgY291bnRyeUNvZGUsIGN1cnJlbnRDb2xvcik7XG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdH07XG5cdFx0fSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gY2hhbmdlTWFwQ29sb3IocHJvbWlzZSwgY29uZmlnLCB5ZWFyUmFuZ2UsIGNhbGxiYWNrKXtcblx0cHJvbWlzZS5nZXQoJ21hcF9kYXRhL2NvdW50cnlfY29kZXMuanNvbicpXG5cdC50aGVuKGZ1bmN0aW9uKGNvZGVzKXtcblx0XHRjb2RlcyA9IEpTT04ucGFyc2UoY29kZXMpO1xuXHRcdGZvciAoY291bnRyeSBpbiBjb2Rlcykge1xuXHRcdFx0KGZ1bmN0aW9uKGNvdW50cnlDb2RlLCB5ZWFyUmFuZ2Upe1xuXHRcdFx0XHRtYWtlQXBpQ2FsbChwcm9taXNlLCBjb25maWcsIGNvdW50cnlDb2RlLCB5ZWFyUmFuZ2UsIGNhbGxiYWNrKTtcblx0XHRcdH0pKGNvZGVzW2NvdW50cnldLCB5ZWFyUmFuZ2UpO1xuXHRcdH1cblx0fSlcbn07XG5cbmZ1bmN0aW9uIG1ha2VBcGlDYWxsKHByb21pc2UsIGNvbmZpZywgY291bnRyeUNvZGUsIHllYXJSYW5nZSwgY2FsbGJhY2spIHtcblx0cHJvbWlzZS5nZXQoY29uZmlnLmJhc2UgKyAnL2FwaS8nICsgY291bnRyeUNvZGUgKyAnLycgKyB5ZWFyUmFuZ2VbMF0gKyAndG8nICsgeWVhclJhbmdlWzFdKVxuXHQudGhlbihmdW5jdGlvbihkYXRhKXtcblx0XHRkYXRhID0gSlNPTi5wYXJzZShkYXRhKTtcblx0XHR2YXIgdGVtcCA9IGRhdGEuY2xpbWF0ZURhdGFbMF0uYW5udWFsRGF0YSAqICg5LzUpICsgMzI7XG5cblx0XHRpZiAoeWVhclJhbmdlWzBdID09PSAyMDIwKSB7XG5cdFx0XHQvL2NyZWF0ZSBjb25maWcuYmFzZSBjb2xvciBmb3IgMjAyMFxuXHRcdFx0dmFyIHRlbXBEaWZmID0gdGVtcCAtIDQyLFxuXHRcdFx0ZGlmZk11bHQgPSBNYXRoLmZsb29yKHRlbXBEaWZmIC8gMiksXG5cdFx0XHRzdGFuZGFyZENvbG9yID0gWzEwMSwgMTQ1LCAxNzddLFxuXHRcdFx0bmV3Q29sb3IgPSBbc3RhbmRhcmRDb2xvclswXSAtICgyICooZGlmZk11bHQpKSwgc3RhbmRhcmRDb2xvclsxXSAtICg0KihkaWZmTXVsdCkpLCBzdGFuZGFyZENvbG9yWzJdIC0gKDcqKGRpZmZNdWx0KSldO1xuXG5cdFx0XHRjYWxsYmFjayh0ZW1wLCBuZXdDb2xvciwgY291bnRyeUNvZGUpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjYWxsYmFjayh0ZW1wLCBjb3VudHJ5Q29kZSk7XG5cdFx0fVxuXHR9KTtcbn07XG5cbmZ1bmN0aW9uIHNldFN2Z0ZpbGwoc3ZnLCBjb25maWcsIGNvdW50cnlDb2RlLCBjb2xvcikge1xuXHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRzdmcuc2VsZWN0QWxsKCcuc3VidW5pdC4nICsgY291bnRyeUNvZGUpXG5cdFx0XHRcdC50cmFuc2l0aW9uKClcblx0XHRcdFx0LnN0eWxlKCdmaWxsJywgZnVuY3Rpb24oKXsgcmV0dXJuICdyZ2IoJyArIGNvbG9yWzBdICsgJywgJyArIGNvbG9yWzFdICsgJywgJyArIGNvbG9yWzJdICsgJyknfSk7XG5cdFx0fSwgY29uZmlnLnN2Z0ZpbGwpO1xufTtcblxuZnVuY3Rpb24gZmluZFllYXJSYW5nZShjb25maWcpIHtcblx0dmFyIHJhbmdlS2V5ID0gJCgnI3llYXItc2VsZWN0b3InKS52YWwoKTtcdFxuXHRyZXR1cm4gY29uZmlnLnllYXJSYW5nZXNbcmFuZ2VLZXldO1xufTtcblxuIl19
