(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports =  {
	base: 'https://climate-vis.herokuapp.com',
	checkMapLoaded: 700, //interval to check
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
	map = require('./map'),
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

//MAP
var svg = map.createBg();
map.createCountries(promise, config);
map.drag();

//COLORS
calcTemp.setInitialColor(promise, config, svg);
calcTemp.setColorWithSlider(promise, config, svg);

//SIDENAV EVENTS
sideNav.openFacts();
sideNav.close();

});








},{"./config":1,"./facebook_sdk":2,"./map":4,"./promise":5,"./sidenav":6,"./temp_calc":7}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
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


},{}],6:[function(require,module,exports){
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
},{}],7:[function(require,module,exports){
module.exports = {
	setInitialColor: function (promise, config, svg) {
		changeMapColor(promise, config, [2020, 2039], function(yearTwentyTemp, yearTwentyColor, countryCode){
				setSvgFill(svg, config, countryCode, yearTwentyColor);	
		});
	},
	setColorWithSlider: function(promise, config, svg) {
		//change saturation of reds in map as temps increment or decrement w/ time
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9jb25maWcuanMiLCJqcy9mYWNlYm9va19zZGsuanMiLCJqcy9tYWluLmpzIiwianMvbWFwLmpzIiwianMvcHJvbWlzZS5qcyIsImpzL3NpZGVuYXYuanMiLCJqcy90ZW1wX2NhbGMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibW9kdWxlLmV4cG9ydHMgPSAge1xuXHRiYXNlOiAnaHR0cHM6Ly9jbGltYXRlLXZpcy5oZXJva3VhcHAuY29tJyxcblx0Y2hlY2tNYXBMb2FkZWQ6IDcwMCwgLy9pbnRlcnZhbCB0byBjaGVja1xuXHRjb2xvckxvYWRpbmc6IDQwMDAsXG5cdHN2Z0ZpbGw6IDUwMCxcblx0c2lkZWJhckRpc3BsYXk6IDMwLFxuXHR5ZWFyUmFuZ2VzOiBbWzIwMjAsIDIwMzldLCBbMjA0MCwgMjA1OV0sIFsyMDYwLCAyMDc5XSwgWzIwODAsIDIwOTldXVxufVxuXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0c2hhcmU6IGZ1bmN0aW9uKHVybCl7XG5cdFx0Ly9zZXR0aW5nIHVwIHNka1xuXHRcdHdpbmRvdy5mYkFzeW5jSW5pdCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0ICAgIEZCLmluaXQoe1xuXHRcdFx0ICAgICAgYXBwSWQgICAgICA6ICcxMDYyOTY2ODI3MTE4Nzc2Jyxcblx0XHRcdCAgICAgIHhmYm1sICAgICAgOiB0cnVlLFxuXHRcdFx0ICAgICAgdmVyc2lvbiAgICA6ICd2Mi42J1xuXHRcdFx0ICAgIH0pO1xuXHRcdFx0ICB9O1xuXG5cdFx0KGZ1bmN0aW9uKGQsIHMsIGlkKXtcblx0XHRcdHZhciBqcywgZmpzID0gZC5nZXRFbGVtZW50c0J5VGFnTmFtZShzKVswXTtcblx0XHRcdGlmIChkLmdldEVsZW1lbnRCeUlkKGlkKSkge3JldHVybjt9XG5cdFx0XHRqcyA9IGQuY3JlYXRlRWxlbWVudChzKTsganMuaWQgPSBpZDtcblx0XHRcdGpzLnNyYyA9IFwiLy9jb25uZWN0LmZhY2Vib29rLm5ldC9lbl9VUy9zZGsuanNcIjtcblx0XHRcdGZqcy5wYXJlbnROb2RlLmluc2VydEJlZm9yZShqcywgZmpzKTtcblx0XHR9KGRvY3VtZW50LCAnc2NyaXB0JywgJ2ZhY2Vib29rLWpzc2RrJykpO1xuXG5cdFx0Ly9mYWNlYm9vayBzaGFyZVxuXHRcdCQoJyNzaWRlYmFyJykub24oJ2NsaWNrJywgJyNzaGFyZS1idXR0b24nLCBmdW5jdGlvbigpe1xuXHRcdFx0RkIudWkoe1xuXHRcdFx0bWV0aG9kOiAnc2hhcmUnLFxuXHRcdFx0ZGlzcGxheTogJ3BvcHVwJyxcblx0XHRcdGhyZWY6IHVybCwgXG5cdFx0XHR9LCBmdW5jdGlvbihyZXNwb25zZSl7fSk7XG5cdFx0fSk7XG5cdH1cbn0iLCIkKCdib2R5JykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKXtcblxudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnJyksXG5cdGZiU0RLID0gcmVxdWlyZSgnLi9mYWNlYm9va19zZGsnKSxcblx0cHJvbWlzZSA9IHJlcXVpcmUoJy4vcHJvbWlzZScpLFxuXHRtYXAgPSByZXF1aXJlKCcuL21hcCcpLFxuXHRjYWxjVGVtcCA9IHJlcXVpcmUoJy4vdGVtcF9jYWxjJyksXG5cdHNpZGVOYXYgPSByZXF1aXJlKCcuL3NpZGVuYXYnKTtcblxuLy9GQiBTSEFSRVxuZmJTREsuc2hhcmUoY29uZmlnLmJhc2UpO1xuXG4vL0NBQ0hFIFNPTUUgQVBJIENBTExTIE9GRiBUSEUgQkFUXG4oZnVuY3Rpb24oKXtcblx0Y29uZmlnLnllYXJSYW5nZXMuZm9yRWFjaChmdW5jdGlvbihyYW5nZSl7XG5cdFx0cHJvbWlzZS5nZXQoJ21hcF9kYXRhL2NvdW50cnlfY29kZXMuanNvbicpXG5cdFx0LnRoZW4oZnVuY3Rpb24oY29kZXMpe1xuXHRcdFx0Y29kZXMgPSBKU09OLnBhcnNlKGNvZGVzKTtcblx0XHRcdGZvciAoY291bnRyeSBpbiBjb2Rlcykge1xuXHRcdFx0XHRwcm9taXNlLmdldChjb25maWcuYmFzZSArICcvYXBpLycgKyBjb2Rlc1tjb3VudHJ5XSArICcvJyArIHJhbmdlWzBdICsgJ3RvJyArIHJhbmdlWzFdKTtcblx0XHRcdH1cblx0XHR9KVxuXHR9KVxufSkoKTtcblxuLy9MT0FESU5HIElDT05cbmZ1bmN0aW9uIHJlbW92ZUxvYWRpbmdJY29uKCkge1xuXHRpZiAoJCgncGF0aCcpLmxlbmd0aCA9PT0gMzM3KSB7Ly9hbGwgY291bnRyaWVzIGRyYXduXG5cdFx0c2V0VGltZW91dChmdW5jdGlvbigpey8vZ2l2ZSBjb2xvcnMgdGltZSB0byBsb2FkXG5cdFx0XHQkKCdib2R5JykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHR9LCBjb25maWcuY29sb3JMb2FkaW5nKTtcblx0fVxufVxuc2V0SW50ZXJ2YWwocmVtb3ZlTG9hZGluZ0ljb24sIGNvbmZpZy5jaGVja01hcExvYWRlZCk7XG5cbi8vTUFQXG52YXIgc3ZnID0gbWFwLmNyZWF0ZUJnKCk7XG5tYXAuY3JlYXRlQ291bnRyaWVzKHByb21pc2UsIGNvbmZpZyk7XG5tYXAuZHJhZygpO1xuXG4vL0NPTE9SU1xuY2FsY1RlbXAuc2V0SW5pdGlhbENvbG9yKHByb21pc2UsIGNvbmZpZywgc3ZnKTtcbmNhbGNUZW1wLnNldENvbG9yV2l0aFNsaWRlcihwcm9taXNlLCBjb25maWcsIHN2Zyk7XG5cbi8vU0lERU5BViBFVkVOVFNcbnNpZGVOYXYub3BlbkZhY3RzKCk7XG5zaWRlTmF2LmNsb3NlKCk7XG5cbn0pO1xuXG5cblxuXG5cblxuXG4iLCJ2YXIgbW91c2VQb3NpdGlvbjAsXG5cdHN2Zyxcblx0cHJvamVjdGlvbixcblx0cGF0aCxcblx0ZmVhdHVyZSxcblx0YmFja2dyb3VuZENpcmNsZTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdGNyZWF0ZUJnOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgd2lkdGggPSAkKHdpbmRvdykud2lkdGgoKSxcblx0XHQgICAgaGVpZ2h0ID0gNzUwO1xuXG5cdFx0Ly9jcmVhdGUgU1ZHXG5cdFx0c3ZnID0gZDMuc2VsZWN0KCcjbWFwJykuYXBwZW5kKCdzdmcnKVxuXHRcdCAgICAuYXR0cignd2lkdGgnLCB3aWR0aClcblx0XHQgICAgLmF0dHIoJ2hlaWdodCcsIGhlaWdodCk7XG5cblx0XHQvL3NldCBtYXAgcHJvcGVydGllc1xuXHRcdHByb2plY3Rpb24gPSBkMy5nZW9TdGVyZW9ncmFwaGljKClcblx0XHQgICAgLnNjYWxlKDI4MClcblx0XHQgICAgLmNlbnRlcihbMCwgMF0pXG5cdFx0ICAgIC50cmFuc2xhdGUoW3dpZHRoIC8gMiwgaGVpZ2h0IC8gMl0pXG5cdFx0ICAgIC5yb3RhdGUoWzAsMCwwXSlcblx0XHQgICAgLmNsaXBBbmdsZSgxMDApO1xuXG5cdFx0cGF0aCA9IGQzLmdlb1BhdGgoKVxuXHRcdCAgICAucHJvamVjdGlvbihwcm9qZWN0aW9uKTtcblxuXHRcdGJhY2tncm91bmRDaXJjbGUgPSBzdmcuYXBwZW5kKFwiY2lyY2xlXCIpXG5cdFx0ICAgIC5hdHRyKCdjeCcsIHdpZHRoIC8gMilcblx0XHQgICAgLmF0dHIoJ2N5JywgaGVpZ2h0IC8gMilcblx0XHQgICAgLmF0dHIoJ3InLCAzMzUpXG5cdFx0ICAgIC5hdHRyKCdpZCcsICdiYWNrZ3JvdW5kLWNpcmNsZScpO1xuXG5cdFx0cmV0dXJuIHN2Z1xuXHR9LFxuXHRjcmVhdGVDb3VudHJpZXM6IGZ1bmN0aW9uKHByb21pc2UsIGNvbmZpZykge1xuXHRcdHByb21pc2UuZ2V0KCdtYXBfZGF0YS9uZXdfd29ybGQuanNvbicpXG5cdFx0LnRoZW4oZnVuY3Rpb24od29ybGQpe1xuXHRcdFx0XG5cdFx0XHR3b3JsZCA9IEpTT04ucGFyc2Uod29ybGQpO1xuXHRcdFx0dmFyIHN1YnVuaXRzID0gdG9wb2pzb24uZmVhdHVyZSh3b3JsZCwgd29ybGQub2JqZWN0cy5zdWJ1bml0cyk7XG5cdFx0XHQvL2NyZWF0ZSBjb3VudHJpZXMnIHBhdGhzXG5cdFx0XHRmZWF0dXJlID0gc3ZnLnNlbGVjdEFsbCgnLnN1YnVuaXQnKVxuXHRcdFx0ICAgIC5kYXRhKHRvcG9qc29uLmZlYXR1cmUod29ybGQsIHdvcmxkLm9iamVjdHMuc3VidW5pdHMpLmZlYXR1cmVzKVxuXHRcdFx0ICAuZW50ZXIoKS5hcHBlbmQoJ3BhdGgnKVxuXHRcdFx0ICAgIC5hdHRyKCdjbGFzcycsIFxuXHRcdFx0ICAgIFx0ZnVuY3Rpb24gKGQpIHsgXG5cdFx0XHQgICAgXHRcdHJldHVybiAnc3VidW5pdCAnICsgZC5pZC5zcGxpdCgnICcpWzBdOyBcblx0XHRcdCAgICBcdH0pXG5cdFx0XHQgICAgLmF0dHIoJ2lkJywgLy9jbGFzcyBpcyBjb3VudHJ5IGNvZGUgKGZvciBhcGkgY2FsbCksIGlkIGlzIHNwZWNpZmljIHJlZ2lvbiBjb2RlICh0byBnZW5lcmF0ZSBsYWJlbClcblx0XHRcdCAgICBcdGZ1bmN0aW9uIChkKSB7XG5cdFx0XHQgICAgXHRcdHJldHVybiBkLmlkLnNwbGl0KCcgJylbMV0gPyBkLmlkLnNwbGl0KCcgJylbMV0gOiBkLmlkLnNwbGl0KCcgJylbMF07XG5cdFx0XHQgICAgXHR9KVxuXHRcdFx0ICAgIC5hdHRyKCdkJywgcGF0aCk7XG5cblx0XHRcdC8vY3JlYXRlIGxhYmVsc1xuXHRcdFx0bGFiZWwgPSBzdmcuc2VsZWN0QWxsKCcuc3VidW5pdC1sYWJlbCcpXG5cdFx0XHRcdC5kYXRhKHRvcG9qc29uLmZlYXR1cmUod29ybGQsIHdvcmxkLm9iamVjdHMuc3VidW5pdHMpLmZlYXR1cmVzKVxuXHRcdFx0LmVudGVyKCkuYXBwZW5kKCd0ZXh0Jylcblx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ3N1YnVuaXQtbGFiZWwnKVxuXHRcdFx0XHQuYXR0cignaWQnLCBcblx0XHRcdCAgICBcdGZ1bmN0aW9uIChkKSB7XG5cdFx0XHQgICAgXHRcdHJldHVybiBkLmlkLnNwbGl0KCcgJylbMV0gPyBkLmlkLnNwbGl0KCcgJylbMV0gOiBkLmlkLnNwbGl0KCcgJylbMF07XG5cdFx0XHQgICAgXHR9KVxuXHRcdFx0XHQuYXR0cigndHJhbnNmb3JtJywgZnVuY3Rpb24oZCkgeyBcblx0XHRcdFx0XHR2YXIgY2VudGVyID0gcGF0aC5jZW50cm9pZChkKTtcblx0XHRcdFx0XHQvL2FkanVzdCBmb3IgbGVmdCBvZmZzZXRcblx0XHRcdFx0XHRpZiAoIWlzTmFOKGNlbnRlclswXSkpe1xuXHRcdFx0XHRcdFx0cmV0dXJuICd0cmFuc2xhdGUoJyArIFtjZW50ZXJbMF0gLSAyMCwgY2VudGVyWzFdXSArICcpJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5hdHRyKCdkeScsICcuMWVtJylcblx0XHRcdFx0LnN0eWxlKCdmaWxsJywgJ2JsYWNrJylcblx0XHRcdFx0LnN0eWxlKCdkaXNwbGF5JywgJ25vbmUnKVxuXHRcdFx0XHQudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLnByb3BlcnRpZXMubmFtZTsgfSk7XG5cblx0XHRcdC8vZGlzcGxheSBsYWJlbHMgb24gaG92ZXJcblx0XHRcdHN2Zy5zZWxlY3RBbGwoJy5zdWJ1bml0Jylcblx0XHRcdFx0Lm9uKCdtb3VzZWVudGVyJywgZnVuY3Rpb24oKXsgXG5cdFx0XHRcdFx0c3ZnLnNlbGVjdCgnLnN1YnVuaXQtbGFiZWwjJyArIHRoaXMuaWQpXG5cdFx0XHRcdFx0XHQuc3R5bGUoJ2Rpc3BsYXknLCAnYmxvY2snKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0Lm9uKCdtb3VzZWxlYXZlJywgZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRzdmcuc2VsZWN0KCcuc3VidW5pdC1sYWJlbCMnICsgdGhpcy5pZClcblx0XHRcdFx0XHRcdC5zdHlsZSgnZGlzcGxheScsICdub25lJyk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5vbignY2xpY2snLCBmdW5jdGlvbigpeyAvL21heWJlIHNlcGFyYXRlIG91dCB0aGlzIHNlY3Rpb24gdG9vXG5cdFx0XHRcdFx0dmFyIGlkID0gdGhpcy5pZCxcblx0XHRcdFx0XHRcdGNvdW50cnlDb2RlID0gJCh0aGlzKS5hdHRyKCdjbGFzcycpLnNwbGl0KCcgJylbMV0sXG5cdFx0XHRcdFx0XHRjb3VudHJ5TmFtZSA9ICQoJy5zdWJ1bml0LWxhYmVsIycgKyBpZCkudGV4dCgpLFxuXHRcdFx0XHRcdFx0cmFuZ2UgPSBjb25maWcueWVhclJhbmdlc1skKCcjeWVhci1zZWxlY3RvcicpLnZhbCgpXTtcblxuXHRcdFx0XHRcdHBvcHVsYXRlU2lkZWJhcihwcm9taXNlLCBjb25maWcsIGlkLCBjb3VudHJ5Q29kZSwgY291bnRyeU5hbWUsIHJhbmdlKTtcblx0XHRcdFx0fSk7XG5cdFx0fSlcblx0fSxcblx0ZHJhZyA6IGZ1bmN0aW9uKCl7XG5cdFx0YmFja2dyb3VuZENpcmNsZS5vbignbW91c2Vkb3duJywgZnVuY3Rpb24oKXtcblx0XHRcdG1vdXNlUG9zaXRpb24wID0gW2QzLmV2ZW50LnBhZ2VYLCBkMy5ldmVudC5wYWdlWV07XG5cdFx0fSk7XG5cblx0XHRiYWNrZ3JvdW5kQ2lyY2xlLm9uKCdtb3VzZW1vdmUnLCBmdW5jdGlvbigpe1xuXHRcdFx0aWYgKG1vdXNlUG9zaXRpb24wKSB7XG5cdFx0XHRcdHZhciBjdXJyZW50Q2VudGVyID0gcHJvamVjdGlvbi5yb3RhdGUoKSxcblx0XHRcdFx0XHRtb3VzZVBvc2l0aW9uMSA9IFtkMy5ldmVudC5wYWdlWCwgZDMuZXZlbnQucGFnZVldLFxuXHRcdFx0XHRcdG5ld0NlbnRlciA9IFtjdXJyZW50Q2VudGVyWzBdICsgKG1vdXNlUG9zaXRpb24wWzBdLW1vdXNlUG9zaXRpb24xWzBdKSAvIDgsIGN1cnJlbnRDZW50ZXJbMV0gKyAobW91c2VQb3NpdGlvbjFbMV0tbW91c2VQb3NpdGlvbjBbMV0pIC8gOF07XG5cblx0XHRcdFx0Ly9zZXQgcm90YXRlIGFjY29yZGluZyB0byBtb3VzZSBldmVudFxuXHRcdFx0ICAgIHByb2plY3Rpb24ucm90YXRlKFstbmV3Q2VudGVyWzBdLCAtbmV3Q2VudGVyWzFdLCAwXSk7XG5cdFx0XHQgICAgLy9yZXJlbmRlciBwYXRoIHVzaW5nIG5ldyBwcm9qZWN0aW9uXG5cdFx0XHRcdGZlYXR1cmUuYXR0cignZCcsIGQzLmdlb1BhdGgoKS5wcm9qZWN0aW9uKHByb2plY3Rpb24pKTtcblx0XHRcdFx0Ly9yZXJlbmRlciBsYWJlbHNcblx0XHRcdFx0bGFiZWwuYXR0cigndHJhbnNmb3JtJywgZnVuY3Rpb24oZCkgeyBcblx0XHRcdFx0XHR2YXIgY2VudGVyID0gcGF0aC5jZW50cm9pZChkKTtcblx0XHRcdFx0XHRpZiAoIWlzTmFOKGNlbnRlclswXSkpe1xuXHRcdFx0XHRcdFx0cmV0dXJuICd0cmFuc2xhdGUoJyArIFtjZW50ZXJbMF0gLSAyMCwgY2VudGVyWzFdXSArICcpJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1x0XG5cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0YmFja2dyb3VuZENpcmNsZS5vbignbW91c2V1cCcsIGZ1bmN0aW9uKCl7XG5cdFx0XHQvL3N0b3AgYW5pbWF0aW9uIG9uIG1vdXNldXBcblx0XHRcdG1vdXNlUG9zaXRpb24wPW51bGw7XG5cdFx0fSk7XG5cdH1cblxufVxuXG5mdW5jdGlvbiBwb3B1bGF0ZVNpZGViYXIocHJvbWlzZSwgY29uZmlnLCBpZCwgY291bnRyeUNvZGUsIGNvdW50cnlOYW1lLCB5ZWFyUmFuZ2UpIHtcblxuXHRwcm9taXNlLmdldChjb25maWcuYmFzZSArICcvYXBpLycgKyBjb3VudHJ5Q29kZSArICcvMjAyMHRvMjAzOScpXG5cdC50aGVuKGZ1bmN0aW9uKGRhdGEpe1xuXHRcdGRhdGEgPSBKU09OLnBhcnNlKGRhdGEpO1xuXHRcdHZhciB5ZWFyVHdlbnR5VGVtcCA9IGRhdGEuY2xpbWF0ZURhdGFbMF0uYW5udWFsRGF0YSAqICg5LzUpICsgMzI7XG5cdFx0eWVhclR3ZW50eVRlbXAgPSBNYXRoLnJvdW5kKHllYXJUd2VudHlUZW1wICogMTAwKSAvIDEwMDtcblxuXHRcdGlmICgheWVhclR3ZW50eVRlbXApIHllYXJUd2VudHlUZW1wID0gJ1Vua25vd24nO1xuXG5cdFx0JCgnI3NpZGViYXInKS5hZGRDbGFzcygnc2hvdy1kYXRhJyk7XG5cdFx0JCgnI3NpZGViYXInKS5odG1sKCcnKTtcblxuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXsvL21ha2Ugc3VyZSBkYXRhIGlzIHJldHVybiBiZWZvcmUgYXBwZW5kaW5nXG5cdFx0XHQkKCcjc2lkZWJhcicpLmFwcGVuZCgnJyArIFxuXHRcdFx0XHQnPHAgaWQ9XCJjbG9zZS1idXR0b25cIj54PC9wPicgK1xuXHRcdFx0XHQnPGgxPicgKyBjb3VudHJ5TmFtZSArICc8L2gxPicgK1xuXHRcdFx0XHQnPHA+VGVtcGVyYXR1cmUgaW4gPHN0cm9uZz4yMDIwLTIwMzk8L3N0cm9uZz46ICcgKyB5ZWFyVHdlbnR5VGVtcCArICcgJiM4NDU3OzwvcD4nKTtcblx0XHR9LCBjb25maWcuc2lkZWJhckRpc3BsYXkpO1xuXG5cdFx0aWYgKCEoeWVhclJhbmdlWzBdID09PSAyMDIwKSkge1xuXHRcdFx0cmV0dXJuIHByb21pc2UuZ2V0KGNvbmZpZy5iYXNlICsgJy9hcGkvJyArIGNvdW50cnlDb2RlICsgJy8nICsgeWVhclJhbmdlWzBdICsgJ3RvJyArIHllYXJSYW5nZVsxXSlcblx0XHR9XG5cdH0pXG5cdC50aGVuKGZ1bmN0aW9uKGN1cnJlbnRUZW1wRGF0YSl7XG5cdFx0Y3VycmVudFRlbXBEYXRhID0gSlNPTi5wYXJzZShjdXJyZW50VGVtcERhdGEpO1xuXHRcdGN1cnJlbnRUZW1wID0gY3VycmVudFRlbXBEYXRhLmNsaW1hdGVEYXRhWzBdLmFubnVhbERhdGEgKiAoOS81KSArIDMyO1xuXHRcdGN1cnJlbnRUZW1wID0gTWF0aC5yb3VuZChjdXJyZW50VGVtcCAqIDEwMCkgLyAxMDA7XG5cblx0XHRpZiAoIWN1cnJlbnRUZW1wKSBjdXJyZW50VGVtcCA9ICdVbmtub3duJzsgXG5cblx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHQkKCcjc2lkZWJhcicpLmFwcGVuZCgnJyArXG5cdFx0XHRcdCc8cD5UZW1wZXJhdHVyZSBpbiAnICsgeWVhclJhbmdlWzBdICsgJy08c3Ryb25nPicgKyB5ZWFyUmFuZ2VbMV0gKyAnOiAnICsgY3VycmVudFRlbXAgKyAnPC9zdHJvbmc+ICYjODQ1Nzs8L3A+Jyk7XG5cdFx0fSwgY29uZmlnLnNpZGViYXJEaXNwbGF5KTtcblx0fSk7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBnZXQgOiBmdW5jdGlvbih1cmwpIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgLy8gIFhIUiBzdHVmZlxuICAgICAgICB2YXIgcmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIHJlcS5vcGVuKCdHRVQnLCB1cmwpO1xuXG4gICAgICAgIHJlcS5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAocmVxLnN0YXR1cyA9PSAyMDApIHtcbiAgICAgICAgICAgIHJlc29sdmUocmVxLnJlc3BvbnNlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZWplY3QoRXJyb3IocmVxLnN0YXR1c1RleHQpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSGFuZGxlIG5ldHdvcmsgZXJyb3JzXG4gICAgICAgIHJlcS5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmVqZWN0KEVycm9yKFwiTmV0d29yayBFcnJvclwiKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmVxLnNlbmQoKTtcbiAgICAgIH0pO1xuICAgIH1cbn1cblxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdG9wZW5GYWN0czogZnVuY3Rpb24oKXtcblx0XHQkKCcjc2lkZWJhcicpLm9uKCdjbGljaycsICcjcXVlc3Rpb24taWNvbicsIGZ1bmN0aW9uKCl7XG5cdFx0XHQkKCcjc2lkZWJhcicpLmFkZENsYXNzKCdzaG93LWZhY3RzJyk7XG5cdFx0XHQkKCcjc2lkZWJhcicpLmh0bWwoJycpO1xuXHRcdFx0Ly9wb3B1bGF0ZSBzaWRlYmFyIHdpdGggZGVzY3JpcHRpb24gb2YgYXBwXG5cdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdCQoJyNzaWRlYmFyJykuaHRtbCgnJytcblx0XHRcdFx0XHQnPHAgaWQ9XCJjbG9zZS1idXR0b25cIj54PC9wPicgK1xuXHRcdFx0XHRcdCc8cD5DbGltYXRlIE1hcCBwdWxscyBkYXRhIGZyb20gdGhlIDxhIHRhcmdldD1cIl9ibGFua1wiIGhyZWY9XCJodHRwOi8vd3d3LndvcmxkYmFuay5vcmcvZW4vdG9waWMvY2xpbWF0ZWNoYW5nZVwiPldvcmxkIEJhbms8L2E+IGNsaW1hdGUgYXBpIHRvIG1ha2UgYSB2aXN1YWxpemF0aW9uIG9mIHByb2plY3RlZCB0ZW1wZXJhdHVyZSBjaGFuZ2VzIG92ZXIgdGhlIGN1cnJlbnQgY2VudHVyeS4gVGhlIHRlbXBlcmF0dXJlcyB1c2VkIGFyZSB0YWtlbiBmcm9tIHRoZSA8YSB0YXJnZXQ9XCJfYmxhbmtcIiBocmVmPVwiaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvU3BlY2lhbF9SZXBvcnRfb25fRW1pc3Npb25zX1NjZW5hcmlvc1wiPkEyPC9hPiBzY2VuYXJpby48cD4nICsgXG5cdFx0XHRcdFx0JzxwPlRvIG1ha2UgdGVtcGVyYXR1cmUgY2hhbmdlIG1vcmUgZXZpZGVudCwgYSBkaWZmZXJlbnQgY2FsY3VsYXRpb24gaXMgdXNlZCB0byBnZW5lcmF0ZSB0aGUgaW5pdGlhbCBjb2xvcnMgdGhhbiBpcyB1c2VkIHRvIGRlcGljdCB0aGUgY2hhbmdlLCB3aGljaCBmZWF0dXJlcyBkZWVwZW5pbmcgcmVkIHRvbmVzIHBlciAwLjUgZGVncmVlIHNoaWZ0LjwvcD4nICtcblx0XHRcdFx0XHQnPHA+Rm9yIG1vcmUgaW5mb3JtYXRpb246PC9wPicgKyBcblx0XHRcdFx0XHQnPHA+PGEgdGFyZ2V0PVwiX2JsYW5rXCIgaHJlZj1cImh0dHBzOi8vd3d3Lndhc2hpbmd0b25wb3N0LmNvbS9uZXdzL2NhcGl0YWwtd2VhdGhlci1nYW5nL3dwLzIwMTYvMDUvMTAvdGhlLW1vc3QtY29tcGVsbGluZy12aXN1YWwtb2YtZ2xvYmFsLXdhcm1pbmctZXZlci1tYWRlL1wiPkhhd2tpbnMgU3BpcmFsIFZpc3VhbGl6YXRpb248L2E+PC9wPicgKyBcblx0XHRcdFx0XHQnPHA+PGEgdGFyZ2V0PVwiX2JsYW5rXCIgaHJlZj1cImh0dHA6Ly9jbGltYXRlLm5hc2EuZ292L2VmZmVjdHMvXCI+TkFTQTwvYT48L3A+JyArXG5cdFx0XHRcdFx0JzxwPjxhIHRhcmdldD1cIl9ibGFua1wiIGhyZWY9XCJodHRwczovL3d3dy5uY2RjLm5vYWEuZ292L2luZGljYXRvcnMvXCI+Tk9BQTwvYT48L3A+Jyk7XG5cdFx0XHR9LDUwKTtcblx0XHR9KTtcblx0fSxcblx0Y2xvc2U6IGZ1bmN0aW9uKCkge1xuXHRcdCQoJyNzaWRlYmFyJykub24oJ2NsaWNrJywgJyNjbG9zZS1idXR0b24nLCBmdW5jdGlvbigpe1xuXHRcdFx0JCgnI3NpZGViYXInKS5yZW1vdmVDbGFzcygpO1xuXHRcdFx0JCgnI3NpZGViYXInKS5odG1sKCcnKTtcblxuXHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0XHQkKCcjc2lkZWJhcicpLmh0bWwoJzxoNSBpZD1cInF1ZXN0aW9uLWljb25cIj4/PC9oNT4nICtcblx0XHRcdFx0XHQnPGg1IGlkPVwic2hhcmUtYnV0dG9uXCI+ZjwvaDU+Jyk7XHRcdFxuXHRcdFx0fSw1MCk7XG5cdFx0fSk7XG5cdH1cbn0iLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0c2V0SW5pdGlhbENvbG9yOiBmdW5jdGlvbiAocHJvbWlzZSwgY29uZmlnLCBzdmcpIHtcblx0XHRjaGFuZ2VNYXBDb2xvcihwcm9taXNlLCBjb25maWcsIFsyMDIwLCAyMDM5XSwgZnVuY3Rpb24oeWVhclR3ZW50eVRlbXAsIHllYXJUd2VudHlDb2xvciwgY291bnRyeUNvZGUpe1xuXHRcdFx0XHRzZXRTdmdGaWxsKHN2ZywgY29uZmlnLCBjb3VudHJ5Q29kZSwgeWVhclR3ZW50eUNvbG9yKTtcdFxuXHRcdH0pO1xuXHR9LFxuXHRzZXRDb2xvcldpdGhTbGlkZXI6IGZ1bmN0aW9uKHByb21pc2UsIGNvbmZpZywgc3ZnKSB7XG5cdFx0Ly9jaGFuZ2Ugc2F0dXJhdGlvbiBvZiByZWRzIGluIG1hcCBhcyB0ZW1wcyBpbmNyZW1lbnQgb3IgZGVjcmVtZW50IHcvIHRpbWVcblx0XHQkKCcjeWVhci1zZWxlY3RvcicpLmNoYW5nZShmdW5jdGlvbigpe1xuXHRcdFx0dmFyIHJhbmdlID0gZmluZFllYXJSYW5nZShjb25maWcpO1xuXHRcdFx0JCgnI3NlbGVjdG9yLWxhYmVsJykudGV4dChyYW5nZVswXSArICcgLS0gJyArIHJhbmdlWzFdKTtcblxuXHRcdFx0aWYgKHJhbmdlWzBdID09PSAyMDIwKSB7XG5cdFx0XHRcdGNoYW5nZU1hcENvbG9yKHByb21pc2UsIGNvbmZpZywgcmFuZ2UsIGZ1bmN0aW9uKHllYXJUd2VudHlUZW1wLCB5ZWFyVHdlbnR5Q29sb3IsIGNvdW50cnlDb2RlKXtcblx0XHRcdFx0XHRzZXRTdmdGaWxsKHN2ZywgY29uZmlnLCBjb3VudHJ5Q29kZSwgeWVhclR3ZW50eUNvbG9yKTtcdFxuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNoYW5nZU1hcENvbG9yKHByb21pc2UsIGNvbmZpZywgcmFuZ2UsIGZ1bmN0aW9uKGN1cnJlbnRUZW1wLCBjb3VudHJ5Q29kZSl7XG5cdFx0XHRcdFx0bWFrZUFwaUNhbGwocHJvbWlzZSwgY29uZmlnLCBjb3VudHJ5Q29kZSwgWzIwMjAsIDIwMzldLCBmdW5jdGlvbih5ZWFyVHdlbnR5VGVtcCwgeWVhclR3ZW50eUNvbG9yLCBjb3VudHJ5Q29kZSl7XG5cblx0XHRcdFx0XHRcdHZhciB0ZW1wRGlmZiA9IGN1cnJlbnRUZW1wIC0geWVhclR3ZW50eVRlbXAsXG5cdFx0XHRcdFx0XHRcdGRpZmZNdWx0ID0gTWF0aC5mbG9vcih0ZW1wRGlmZi8wLjUpLFxuXHRcdFx0XHRcdFx0XHRjdXJyZW50Q29sb3IgPSBbeWVhclR3ZW50eUNvbG9yWzBdKygxNSpkaWZmTXVsdCksIHllYXJUd2VudHlDb2xvclsxXSwgeWVhclR3ZW50eUNvbG9yWzJdLSgxMCpkaWZmTXVsdCldO1xuXG5cdFx0XHRcdFx0XHRpZighaXNOYU4oeWVhclR3ZW50eVRlbXApKSB7XG5cdFx0XHRcdFx0XHRcdHNldFN2Z0ZpbGwoc3ZnLCBjb25maWcsIGNvdW50cnlDb2RlLCBjdXJyZW50Q29sb3IpO1xuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9O1xuXHRcdH0pO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGNoYW5nZU1hcENvbG9yKHByb21pc2UsIGNvbmZpZywgeWVhclJhbmdlLCBjYWxsYmFjayl7XG5cdHByb21pc2UuZ2V0KCdtYXBfZGF0YS9jb3VudHJ5X2NvZGVzLmpzb24nKVxuXHQudGhlbihmdW5jdGlvbihjb2Rlcyl7XG5cdFx0Y29kZXMgPSBKU09OLnBhcnNlKGNvZGVzKTtcblx0XHRmb3IgKGNvdW50cnkgaW4gY29kZXMpIHtcblx0XHRcdChmdW5jdGlvbihjb3VudHJ5Q29kZSwgeWVhclJhbmdlKXtcblx0XHRcdFx0bWFrZUFwaUNhbGwocHJvbWlzZSwgY29uZmlnLCBjb3VudHJ5Q29kZSwgeWVhclJhbmdlLCBjYWxsYmFjayk7XG5cdFx0XHR9KShjb2Rlc1tjb3VudHJ5XSwgeWVhclJhbmdlKTtcblx0XHR9XG5cdH0pXG59O1xuXG5mdW5jdGlvbiBtYWtlQXBpQ2FsbChwcm9taXNlLCBjb25maWcsIGNvdW50cnlDb2RlLCB5ZWFyUmFuZ2UsIGNhbGxiYWNrKSB7XG5cdHByb21pc2UuZ2V0KGNvbmZpZy5iYXNlICsgJy9hcGkvJyArIGNvdW50cnlDb2RlICsgJy8nICsgeWVhclJhbmdlWzBdICsgJ3RvJyArIHllYXJSYW5nZVsxXSlcblx0LnRoZW4oZnVuY3Rpb24oZGF0YSl7XG5cdFx0ZGF0YSA9IEpTT04ucGFyc2UoZGF0YSk7XG5cdFx0dmFyIHRlbXAgPSBkYXRhLmNsaW1hdGVEYXRhWzBdLmFubnVhbERhdGEgKiAoOS81KSArIDMyO1xuXG5cdFx0aWYgKHllYXJSYW5nZVswXSA9PT0gMjAyMCkge1xuXHRcdFx0Ly9jcmVhdGUgY29uZmlnLmJhc2UgY29sb3IgZm9yIDIwMjBcblx0XHRcdHZhciB0ZW1wRGlmZiA9IHRlbXAgLSA0Mixcblx0XHRcdGRpZmZNdWx0ID0gTWF0aC5mbG9vcih0ZW1wRGlmZiAvIDIpLFxuXHRcdFx0c3RhbmRhcmRDb2xvciA9IFsxMDEsIDE0NSwgMTc3XSxcblx0XHRcdG5ld0NvbG9yID0gW3N0YW5kYXJkQ29sb3JbMF0gLSAoMiAqKGRpZmZNdWx0KSksIHN0YW5kYXJkQ29sb3JbMV0gLSAoNCooZGlmZk11bHQpKSwgc3RhbmRhcmRDb2xvclsyXSAtICg3KihkaWZmTXVsdCkpXTtcblxuXHRcdFx0Y2FsbGJhY2sodGVtcCwgbmV3Q29sb3IsIGNvdW50cnlDb2RlKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y2FsbGJhY2sodGVtcCwgY291bnRyeUNvZGUpO1xuXHRcdH1cblx0fSk7XG59O1xuXG5mdW5jdGlvbiBzZXRTdmdGaWxsKHN2ZywgY29uZmlnLCBjb3VudHJ5Q29kZSwgY29sb3IpIHtcblx0c2V0VGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0c3ZnLnNlbGVjdEFsbCgnLnN1YnVuaXQuJyArIGNvdW50cnlDb2RlKVxuXHRcdFx0XHQudHJhbnNpdGlvbigpXG5cdFx0XHRcdC5zdHlsZSgnZmlsbCcsIGZ1bmN0aW9uKCl7IHJldHVybiAncmdiKCcgKyBjb2xvclswXSArICcsICcgKyBjb2xvclsxXSArICcsICcgKyBjb2xvclsyXSArICcpJ30pO1xuXHRcdH0sIGNvbmZpZy5zdmdGaWxsKTtcbn07XG5cbmZ1bmN0aW9uIGZpbmRZZWFyUmFuZ2UoY29uZmlnKSB7XG5cdHZhciByYW5nZUtleSA9ICQoJyN5ZWFyLXNlbGVjdG9yJykudmFsKCk7XHRcblx0cmV0dXJuIGNvbmZpZy55ZWFyUmFuZ2VzW3JhbmdlS2V5XTtcbn07XG5cbiJdfQ==
