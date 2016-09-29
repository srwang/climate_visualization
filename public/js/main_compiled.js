(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports =  {
	base: 'http://localhost:3000',
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9jb25maWcuanMiLCJqcy9mYWNlYm9va19zZGsuanMiLCJqcy9tYWluLmpzIiwianMvbWFwLmpzIiwianMvcHJvbWlzZS5qcyIsImpzL3NpZGVuYXYuanMiLCJqcy90ZW1wX2NhbGMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibW9kdWxlLmV4cG9ydHMgPSAge1xuXHRiYXNlOiAnaHR0cDovL2xvY2FsaG9zdDozMDAwJyxcblx0Y2hlY2tNYXBMb2FkZWQ6IDcwMCwgLy9pbnRlcnZhbCB0byBjaGVja1xuXHRjb2xvckxvYWRpbmc6IDQwMDAsXG5cdHN2Z0ZpbGw6IDUwMCxcblx0c2lkZWJhckRpc3BsYXk6IDMwLFxuXHR5ZWFyUmFuZ2VzOiBbWzIwMjAsIDIwMzldLCBbMjA0MCwgMjA1OV0sIFsyMDYwLCAyMDc5XSwgWzIwODAsIDIwOTldXVxufVxuXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0c2hhcmU6IGZ1bmN0aW9uKHVybCl7XG5cdFx0Ly9zZXR0aW5nIHVwIHNka1xuXHRcdHdpbmRvdy5mYkFzeW5jSW5pdCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0ICAgIEZCLmluaXQoe1xuXHRcdFx0ICAgICAgYXBwSWQgICAgICA6ICcxMDYyOTY2ODI3MTE4Nzc2Jyxcblx0XHRcdCAgICAgIHhmYm1sICAgICAgOiB0cnVlLFxuXHRcdFx0ICAgICAgdmVyc2lvbiAgICA6ICd2Mi42J1xuXHRcdFx0ICAgIH0pO1xuXHRcdFx0ICB9O1xuXG5cdFx0KGZ1bmN0aW9uKGQsIHMsIGlkKXtcblx0XHRcdHZhciBqcywgZmpzID0gZC5nZXRFbGVtZW50c0J5VGFnTmFtZShzKVswXTtcblx0XHRcdGlmIChkLmdldEVsZW1lbnRCeUlkKGlkKSkge3JldHVybjt9XG5cdFx0XHRqcyA9IGQuY3JlYXRlRWxlbWVudChzKTsganMuaWQgPSBpZDtcblx0XHRcdGpzLnNyYyA9IFwiLy9jb25uZWN0LmZhY2Vib29rLm5ldC9lbl9VUy9zZGsuanNcIjtcblx0XHRcdGZqcy5wYXJlbnROb2RlLmluc2VydEJlZm9yZShqcywgZmpzKTtcblx0XHR9KGRvY3VtZW50LCAnc2NyaXB0JywgJ2ZhY2Vib29rLWpzc2RrJykpO1xuXG5cdFx0Ly9mYWNlYm9vayBzaGFyZVxuXHRcdCQoJyNzaWRlYmFyJykub24oJ2NsaWNrJywgJyNzaGFyZS1idXR0b24nLCBmdW5jdGlvbigpe1xuXHRcdFx0RkIudWkoe1xuXHRcdFx0bWV0aG9kOiAnc2hhcmUnLFxuXHRcdFx0ZGlzcGxheTogJ3BvcHVwJyxcblx0XHRcdGhyZWY6IHVybCwgXG5cdFx0XHR9LCBmdW5jdGlvbihyZXNwb25zZSl7fSk7XG5cdFx0fSk7XG5cdH1cbn0iLCIkKCdib2R5JykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKXtcblxudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnJyksXG5cdGZiU0RLID0gcmVxdWlyZSgnLi9mYWNlYm9va19zZGsnKSxcblx0cHJvbWlzZSA9IHJlcXVpcmUoJy4vcHJvbWlzZScpLFxuXHRtYXAgPSByZXF1aXJlKCcuL21hcCcpLFxuXHRjYWxjVGVtcCA9IHJlcXVpcmUoJy4vdGVtcF9jYWxjJyksXG5cdHNpZGVOYXYgPSByZXF1aXJlKCcuL3NpZGVuYXYnKTtcblxuLy9GQiBTSEFSRVxuZmJTREsuc2hhcmUoY29uZmlnLmJhc2UpO1xuXG4vL0NBQ0hFIFNPTUUgQVBJIENBTExTIE9GRiBUSEUgQkFUXG4oZnVuY3Rpb24oKXtcblx0Y29uZmlnLnllYXJSYW5nZXMuZm9yRWFjaChmdW5jdGlvbihyYW5nZSl7XG5cdFx0cHJvbWlzZS5nZXQoJ21hcF9kYXRhL2NvdW50cnlfY29kZXMuanNvbicpXG5cdFx0LnRoZW4oZnVuY3Rpb24oY29kZXMpe1xuXHRcdFx0Y29kZXMgPSBKU09OLnBhcnNlKGNvZGVzKTtcblx0XHRcdGZvciAoY291bnRyeSBpbiBjb2Rlcykge1xuXHRcdFx0XHRwcm9taXNlLmdldChjb25maWcuYmFzZSArICcvYXBpLycgKyBjb2Rlc1tjb3VudHJ5XSArICcvJyArIHJhbmdlWzBdICsgJ3RvJyArIHJhbmdlWzFdKTtcblx0XHRcdH1cblx0XHR9KVxuXHR9KVxufSkoKTtcblxuLy9MT0FESU5HIElDT05cbmZ1bmN0aW9uIHJlbW92ZUxvYWRpbmdJY29uKCkge1xuXHRpZiAoJCgncGF0aCcpLmxlbmd0aCA9PT0gMzM3KSB7Ly9hbGwgY291bnRyaWVzIGRyYXduXG5cdFx0c2V0VGltZW91dChmdW5jdGlvbigpey8vZ2l2ZSBjb2xvcnMgdGltZSB0byBsb2FkXG5cdFx0XHQkKCdib2R5JykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHR9LCBjb25maWcuY29sb3JMb2FkaW5nKTtcblx0fVxufVxuc2V0SW50ZXJ2YWwocmVtb3ZlTG9hZGluZ0ljb24sIGNvbmZpZy5jaGVja01hcExvYWRlZCk7XG5cbi8vTUFQXG52YXIgc3ZnID0gbWFwLmNyZWF0ZUJnKCk7XG5tYXAuY3JlYXRlQ291bnRyaWVzKHByb21pc2UsIGNvbmZpZyk7XG5tYXAuZHJhZygpO1xuXG4vL0NPTE9SU1xuY2FsY1RlbXAuc2V0SW5pdGlhbENvbG9yKHByb21pc2UsIGNvbmZpZywgc3ZnKTtcbmNhbGNUZW1wLnNldENvbG9yV2l0aFNsaWRlcihwcm9taXNlLCBjb25maWcsIHN2Zyk7XG5cbi8vU0lERU5BViBFVkVOVFNcbnNpZGVOYXYub3BlbkZhY3RzKCk7XG5zaWRlTmF2LmNsb3NlKCk7XG5cbn0pO1xuXG5cblxuXG5cblxuXG4iLCJ2YXIgbW91c2VQb3NpdGlvbjAsXG5cdHN2Zyxcblx0cHJvamVjdGlvbixcblx0cGF0aCxcblx0ZmVhdHVyZSxcblx0YmFja2dyb3VuZENpcmNsZTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdGNyZWF0ZUJnOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgd2lkdGggPSAkKHdpbmRvdykud2lkdGgoKSxcblx0XHQgICAgaGVpZ2h0ID0gNzUwO1xuXG5cdFx0Ly9jcmVhdGUgU1ZHXG5cdFx0c3ZnID0gZDMuc2VsZWN0KCcjbWFwJykuYXBwZW5kKCdzdmcnKVxuXHRcdCAgICAuYXR0cignd2lkdGgnLCB3aWR0aClcblx0XHQgICAgLmF0dHIoJ2hlaWdodCcsIGhlaWdodCk7XG5cblx0XHQvL3NldCBtYXAgcHJvcGVydGllc1xuXHRcdHByb2plY3Rpb24gPSBkMy5nZW9TdGVyZW9ncmFwaGljKClcblx0XHQgICAgLnNjYWxlKDI4MClcblx0XHQgICAgLmNlbnRlcihbMCwgMF0pXG5cdFx0ICAgIC50cmFuc2xhdGUoW3dpZHRoIC8gMiwgaGVpZ2h0IC8gMl0pXG5cdFx0ICAgIC5yb3RhdGUoWzAsMCwwXSlcblx0XHQgICAgLmNsaXBBbmdsZSgxMDApO1xuXG5cdFx0cGF0aCA9IGQzLmdlb1BhdGgoKVxuXHRcdCAgICAucHJvamVjdGlvbihwcm9qZWN0aW9uKTtcblxuXHRcdGJhY2tncm91bmRDaXJjbGUgPSBzdmcuYXBwZW5kKFwiY2lyY2xlXCIpXG5cdFx0ICAgIC5hdHRyKCdjeCcsIHdpZHRoIC8gMilcblx0XHQgICAgLmF0dHIoJ2N5JywgaGVpZ2h0IC8gMilcblx0XHQgICAgLmF0dHIoJ3InLCAzMzUpXG5cdFx0ICAgIC5hdHRyKCdpZCcsICdiYWNrZ3JvdW5kLWNpcmNsZScpO1xuXG5cdFx0cmV0dXJuIHN2Z1xuXHR9LFxuXHRjcmVhdGVDb3VudHJpZXM6IGZ1bmN0aW9uKHByb21pc2UsIGNvbmZpZykge1xuXHRcdHByb21pc2UuZ2V0KCdtYXBfZGF0YS9uZXdfd29ybGQuanNvbicpXG5cdFx0LnRoZW4oZnVuY3Rpb24od29ybGQpe1xuXHRcdFx0XG5cdFx0XHR3b3JsZCA9IEpTT04ucGFyc2Uod29ybGQpO1xuXHRcdFx0dmFyIHN1YnVuaXRzID0gdG9wb2pzb24uZmVhdHVyZSh3b3JsZCwgd29ybGQub2JqZWN0cy5zdWJ1bml0cyk7XG5cdFx0XHQvL2NyZWF0ZSBjb3VudHJpZXMnIHBhdGhzXG5cdFx0XHRmZWF0dXJlID0gc3ZnLnNlbGVjdEFsbCgnLnN1YnVuaXQnKVxuXHRcdFx0ICAgIC5kYXRhKHRvcG9qc29uLmZlYXR1cmUod29ybGQsIHdvcmxkLm9iamVjdHMuc3VidW5pdHMpLmZlYXR1cmVzKVxuXHRcdFx0ICAuZW50ZXIoKS5hcHBlbmQoJ3BhdGgnKVxuXHRcdFx0ICAgIC5hdHRyKCdjbGFzcycsIFxuXHRcdFx0ICAgIFx0ZnVuY3Rpb24gKGQpIHsgXG5cdFx0XHQgICAgXHRcdHJldHVybiAnc3VidW5pdCAnICsgZC5pZC5zcGxpdCgnICcpWzBdOyBcblx0XHRcdCAgICBcdH0pXG5cdFx0XHQgICAgLmF0dHIoJ2lkJywgLy9jbGFzcyBpcyBjb3VudHJ5IGNvZGUgKGZvciBhcGkgY2FsbCksIGlkIGlzIHNwZWNpZmljIHJlZ2lvbiBjb2RlICh0byBnZW5lcmF0ZSBsYWJlbClcblx0XHRcdCAgICBcdGZ1bmN0aW9uIChkKSB7XG5cdFx0XHQgICAgXHRcdHJldHVybiBkLmlkLnNwbGl0KCcgJylbMV0gPyBkLmlkLnNwbGl0KCcgJylbMV0gOiBkLmlkLnNwbGl0KCcgJylbMF07XG5cdFx0XHQgICAgXHR9KVxuXHRcdFx0ICAgIC5hdHRyKCdkJywgcGF0aCk7XG5cblx0XHRcdC8vY3JlYXRlIGxhYmVsc1xuXHRcdFx0bGFiZWwgPSBzdmcuc2VsZWN0QWxsKCcuc3VidW5pdC1sYWJlbCcpXG5cdFx0XHRcdC5kYXRhKHRvcG9qc29uLmZlYXR1cmUod29ybGQsIHdvcmxkLm9iamVjdHMuc3VidW5pdHMpLmZlYXR1cmVzKVxuXHRcdFx0LmVudGVyKCkuYXBwZW5kKCd0ZXh0Jylcblx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ3N1YnVuaXQtbGFiZWwnKVxuXHRcdFx0XHQuYXR0cignaWQnLCBcblx0XHRcdCAgICBcdGZ1bmN0aW9uIChkKSB7XG5cdFx0XHQgICAgXHRcdHJldHVybiBkLmlkLnNwbGl0KCcgJylbMV0gPyBkLmlkLnNwbGl0KCcgJylbMV0gOiBkLmlkLnNwbGl0KCcgJylbMF07XG5cdFx0XHQgICAgXHR9KVxuXHRcdFx0XHQuYXR0cigndHJhbnNmb3JtJywgZnVuY3Rpb24oZCkgeyBcblx0XHRcdFx0XHR2YXIgY2VudGVyID0gcGF0aC5jZW50cm9pZChkKTtcblx0XHRcdFx0XHQvL2FkanVzdCBmb3IgbGVmdCBvZmZzZXRcblx0XHRcdFx0XHRpZiAoIWlzTmFOKGNlbnRlclswXSkpe1xuXHRcdFx0XHRcdFx0cmV0dXJuICd0cmFuc2xhdGUoJyArIFtjZW50ZXJbMF0gLSAyMCwgY2VudGVyWzFdXSArICcpJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5hdHRyKCdkeScsICcuMWVtJylcblx0XHRcdFx0LnN0eWxlKCdmaWxsJywgJ2JsYWNrJylcblx0XHRcdFx0LnN0eWxlKCdkaXNwbGF5JywgJ25vbmUnKVxuXHRcdFx0XHQudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLnByb3BlcnRpZXMubmFtZTsgfSk7XG5cblx0XHRcdC8vZGlzcGxheSBsYWJlbHMgb24gaG92ZXJcblx0XHRcdHN2Zy5zZWxlY3RBbGwoJy5zdWJ1bml0Jylcblx0XHRcdFx0Lm9uKCdtb3VzZWVudGVyJywgZnVuY3Rpb24oKXsgXG5cdFx0XHRcdFx0c3ZnLnNlbGVjdCgnLnN1YnVuaXQtbGFiZWwjJyArIHRoaXMuaWQpXG5cdFx0XHRcdFx0XHQuc3R5bGUoJ2Rpc3BsYXknLCAnYmxvY2snKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0Lm9uKCdtb3VzZWxlYXZlJywgZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRzdmcuc2VsZWN0KCcuc3VidW5pdC1sYWJlbCMnICsgdGhpcy5pZClcblx0XHRcdFx0XHRcdC5zdHlsZSgnZGlzcGxheScsICdub25lJyk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5vbignY2xpY2snLCBmdW5jdGlvbigpeyAvL21heWJlIHNlcGFyYXRlIG91dCB0aGlzIHNlY3Rpb24gdG9vXG5cdFx0XHRcdFx0dmFyIGlkID0gdGhpcy5pZCxcblx0XHRcdFx0XHRcdGNvdW50cnlDb2RlID0gJCh0aGlzKS5hdHRyKCdjbGFzcycpLnNwbGl0KCcgJylbMV0sXG5cdFx0XHRcdFx0XHRjb3VudHJ5TmFtZSA9ICQoJy5zdWJ1bml0LWxhYmVsIycgKyBpZCkudGV4dCgpLFxuXHRcdFx0XHRcdFx0cmFuZ2UgPSBjb25maWcueWVhclJhbmdlc1skKCcjeWVhci1zZWxlY3RvcicpLnZhbCgpXTtcblxuXHRcdFx0XHRcdHBvcHVsYXRlU2lkZWJhcihwcm9taXNlLCBjb25maWcsIGlkLCBjb3VudHJ5Q29kZSwgY291bnRyeU5hbWUsIHJhbmdlKTtcblx0XHRcdFx0fSk7XG5cdFx0fSlcblx0fSxcblx0ZHJhZyA6IGZ1bmN0aW9uKCl7XG5cdFx0YmFja2dyb3VuZENpcmNsZS5vbignbW91c2Vkb3duJywgZnVuY3Rpb24oKXtcblx0XHRcdG1vdXNlUG9zaXRpb24wID0gW2QzLmV2ZW50LnBhZ2VYLCBkMy5ldmVudC5wYWdlWV07XG5cdFx0fSk7XG5cblx0XHRiYWNrZ3JvdW5kQ2lyY2xlLm9uKCdtb3VzZW1vdmUnLCBmdW5jdGlvbigpe1xuXHRcdFx0aWYgKG1vdXNlUG9zaXRpb24wKSB7XG5cdFx0XHRcdHZhciBjdXJyZW50Q2VudGVyID0gcHJvamVjdGlvbi5yb3RhdGUoKSxcblx0XHRcdFx0XHRtb3VzZVBvc2l0aW9uMSA9IFtkMy5ldmVudC5wYWdlWCwgZDMuZXZlbnQucGFnZVldLFxuXHRcdFx0XHRcdG5ld0NlbnRlciA9IFtjdXJyZW50Q2VudGVyWzBdICsgKG1vdXNlUG9zaXRpb24wWzBdLW1vdXNlUG9zaXRpb24xWzBdKSAvIDgsIGN1cnJlbnRDZW50ZXJbMV0gKyAobW91c2VQb3NpdGlvbjFbMV0tbW91c2VQb3NpdGlvbjBbMV0pIC8gOF07XG5cblx0XHRcdFx0Ly9zZXQgcm90YXRlIGFjY29yZGluZyB0byBtb3VzZSBldmVudFxuXHRcdFx0ICAgIHByb2plY3Rpb24ucm90YXRlKFstbmV3Q2VudGVyWzBdLCAtbmV3Q2VudGVyWzFdLCAwXSk7XG5cdFx0XHRcdCAvL2FkZCBsb2FkaW5nIGljb25cblx0XHRcdFx0JCgnYm9keScpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cblx0XHRcdCAgICAvL3JlcmVuZGVyIHBhdGggdXNpbmcgbmV3IHByb2plY3Rpb25cblx0XHRcdFx0ZmVhdHVyZS5hdHRyKCdkJywgZDMuZ2VvUGF0aCgpLnByb2plY3Rpb24ocHJvamVjdGlvbikpO1xuXHRcdFx0XHQvL3JlcmVuZGVyIGxhYmVsc1xuXHRcdFx0XHRsYWJlbC5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbihkKSB7IFxuXHRcdFx0XHRcdHZhciBjZW50ZXIgPSBwYXRoLmNlbnRyb2lkKGQpO1xuXHRcdFx0XHRcdGlmICghaXNOYU4oY2VudGVyWzBdKSl7XG5cdFx0XHRcdFx0XHRyZXR1cm4gJ3RyYW5zbGF0ZSgnICsgW2NlbnRlclswXSAtIDIwLCBjZW50ZXJbMV1dICsgJyknO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XHRcblxuXHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0JCgnYm9keScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdH0sIDUwMClcdFxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRiYWNrZ3JvdW5kQ2lyY2xlLm9uKCdtb3VzZXVwJywgZnVuY3Rpb24oKXtcblx0XHRcdC8vc3RvcCBhbmltYXRpb24gb24gbW91c2V1cFxuXHRcdFx0bW91c2VQb3NpdGlvbjA9bnVsbDtcblx0XHR9KTtcblx0fVxuXG59XG5cbmZ1bmN0aW9uIHBvcHVsYXRlU2lkZWJhcihwcm9taXNlLCBjb25maWcsIGlkLCBjb3VudHJ5Q29kZSwgY291bnRyeU5hbWUsIHllYXJSYW5nZSkge1xuXG5cdHByb21pc2UuZ2V0KGNvbmZpZy5iYXNlICsgJy9hcGkvJyArIGNvdW50cnlDb2RlICsgJy8yMDIwdG8yMDM5Jylcblx0LnRoZW4oZnVuY3Rpb24oZGF0YSl7XG5cdFx0ZGF0YSA9IEpTT04ucGFyc2UoZGF0YSk7XG5cdFx0dmFyIHllYXJUd2VudHlUZW1wID0gZGF0YS5jbGltYXRlRGF0YVswXS5hbm51YWxEYXRhICogKDkvNSkgKyAzMjtcblx0XHR5ZWFyVHdlbnR5VGVtcCA9IE1hdGgucm91bmQoeWVhclR3ZW50eVRlbXAgKiAxMDApIC8gMTAwO1xuXG5cdFx0aWYgKCF5ZWFyVHdlbnR5VGVtcCkgeWVhclR3ZW50eVRlbXAgPSAnVW5rbm93bic7XG5cblx0XHQkKCcjc2lkZWJhcicpLmFkZENsYXNzKCdzaG93LWRhdGEnKTtcblx0XHQkKCcjc2lkZWJhcicpLmh0bWwoJycpO1xuXG5cdFx0c2V0VGltZW91dChmdW5jdGlvbigpey8vbWFrZSBzdXJlIGRhdGEgaXMgcmV0dXJuIGJlZm9yZSBhcHBlbmRpbmdcblx0XHRcdCQoJyNzaWRlYmFyJykuYXBwZW5kKCcnICsgXG5cdFx0XHRcdCc8cCBpZD1cImNsb3NlLWJ1dHRvblwiPng8L3A+JyArXG5cdFx0XHRcdCc8aDE+JyArIGNvdW50cnlOYW1lICsgJzwvaDE+JyArXG5cdFx0XHRcdCc8cD5UZW1wZXJhdHVyZSBpbiA8c3Ryb25nPjIwMjAtMjAzOTwvc3Ryb25nPjogJyArIHllYXJUd2VudHlUZW1wICsgJyAmIzg0NTc7PC9wPicpO1xuXHRcdH0sIGNvbmZpZy5zaWRlYmFyRGlzcGxheSk7XG5cblx0XHRpZiAoISh5ZWFyUmFuZ2VbMF0gPT09IDIwMjApKSB7XG5cdFx0XHRyZXR1cm4gcHJvbWlzZS5nZXQoY29uZmlnLmJhc2UgKyAnL2FwaS8nICsgY291bnRyeUNvZGUgKyAnLycgKyB5ZWFyUmFuZ2VbMF0gKyAndG8nICsgeWVhclJhbmdlWzFdKVxuXHRcdH1cblx0fSlcblx0LnRoZW4oZnVuY3Rpb24oY3VycmVudFRlbXBEYXRhKXtcblx0XHRjdXJyZW50VGVtcERhdGEgPSBKU09OLnBhcnNlKGN1cnJlbnRUZW1wRGF0YSk7XG5cdFx0Y3VycmVudFRlbXAgPSBjdXJyZW50VGVtcERhdGEuY2xpbWF0ZURhdGFbMF0uYW5udWFsRGF0YSAqICg5LzUpICsgMzI7XG5cdFx0Y3VycmVudFRlbXAgPSBNYXRoLnJvdW5kKGN1cnJlbnRUZW1wICogMTAwKSAvIDEwMDtcblxuXHRcdGlmICghY3VycmVudFRlbXApIGN1cnJlbnRUZW1wID0gJ1Vua25vd24nOyBcblxuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdCQoJyNzaWRlYmFyJykuYXBwZW5kKCcnICtcblx0XHRcdFx0JzxwPlRlbXBlcmF0dXJlIGluICcgKyB5ZWFyUmFuZ2VbMF0gKyAnLTxzdHJvbmc+JyArIHllYXJSYW5nZVsxXSArICc6ICcgKyBjdXJyZW50VGVtcCArICc8L3N0cm9uZz4gJiM4NDU3OzwvcD4nKTtcblx0XHR9LCBjb25maWcuc2lkZWJhckRpc3BsYXkpO1xuXHR9KTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGdldCA6IGZ1bmN0aW9uKHVybCkge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAvLyAgWEhSIHN0dWZmXG4gICAgICAgIHZhciByZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgcmVxLm9wZW4oJ0dFVCcsIHVybCk7XG5cbiAgICAgICAgcmVxLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChyZXEuc3RhdHVzID09IDIwMCkge1xuICAgICAgICAgICAgcmVzb2x2ZShyZXEucmVzcG9uc2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJlamVjdChFcnJvcihyZXEuc3RhdHVzVGV4dCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBIYW5kbGUgbmV0d29yayBlcnJvcnNcbiAgICAgICAgcmVxLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZWplY3QoRXJyb3IoXCJOZXR3b3JrIEVycm9yXCIpKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXEuc2VuZCgpO1xuICAgICAgfSk7XG4gICAgfVxufVxuXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0b3BlbkZhY3RzOiBmdW5jdGlvbigpe1xuXHRcdCQoJyNzaWRlYmFyJykub24oJ2NsaWNrJywgJyNxdWVzdGlvbi1pY29uJywgZnVuY3Rpb24oKXtcblx0XHRcdCQoJyNzaWRlYmFyJykuYWRkQ2xhc3MoJ3Nob3ctZmFjdHMnKTtcblx0XHRcdCQoJyNzaWRlYmFyJykuaHRtbCgnJyk7XG5cdFx0XHQvL3BvcHVsYXRlIHNpZGViYXIgd2l0aCBkZXNjcmlwdGlvbiBvZiBhcHBcblx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdFx0JCgnI3NpZGViYXInKS5odG1sKCcnK1xuXHRcdFx0XHRcdCc8cCBpZD1cImNsb3NlLWJ1dHRvblwiPng8L3A+JyArXG5cdFx0XHRcdFx0JzxwPkNsaW1hdGUgTWFwIHB1bGxzIGRhdGEgZnJvbSB0aGUgPGEgdGFyZ2V0PVwiX2JsYW5rXCIgaHJlZj1cImh0dHA6Ly93d3cud29ybGRiYW5rLm9yZy9lbi90b3BpYy9jbGltYXRlY2hhbmdlXCI+V29ybGQgQmFuazwvYT4gY2xpbWF0ZSBhcGkgdG8gbWFrZSBhIHZpc3VhbGl6YXRpb24gb2YgcHJvamVjdGVkIHRlbXBlcmF0dXJlIGNoYW5nZXMgb3ZlciB0aGUgY3VycmVudCBjZW50dXJ5LiBUaGUgdGVtcGVyYXR1cmVzIHVzZWQgYXJlIHRha2VuIGZyb20gdGhlIDxhIHRhcmdldD1cIl9ibGFua1wiIGhyZWY9XCJodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9TcGVjaWFsX1JlcG9ydF9vbl9FbWlzc2lvbnNfU2NlbmFyaW9zXCI+QTI8L2E+IHNjZW5hcmlvLjxwPicgKyBcblx0XHRcdFx0XHQnPHA+VG8gbWFrZSB0ZW1wZXJhdHVyZSBjaGFuZ2UgbW9yZSBldmlkZW50LCBhIGRpZmZlcmVudCBjYWxjdWxhdGlvbiBpcyB1c2VkIHRvIGdlbmVyYXRlIHRoZSBpbml0aWFsIGNvbG9ycyB0aGFuIGlzIHVzZWQgdG8gZGVwaWN0IHRoZSBjaGFuZ2UsIHdoaWNoIGZlYXR1cmVzIGRlZXBlbmluZyByZWQgdG9uZXMgcGVyIDAuNSBkZWdyZWUgc2hpZnQuPC9wPicgK1xuXHRcdFx0XHRcdCc8cD5Gb3IgbW9yZSBpbmZvcm1hdGlvbjo8L3A+JyArIFxuXHRcdFx0XHRcdCc8cD48YSB0YXJnZXQ9XCJfYmxhbmtcIiBocmVmPVwiaHR0cHM6Ly93d3cud2FzaGluZ3RvbnBvc3QuY29tL25ld3MvY2FwaXRhbC13ZWF0aGVyLWdhbmcvd3AvMjAxNi8wNS8xMC90aGUtbW9zdC1jb21wZWxsaW5nLXZpc3VhbC1vZi1nbG9iYWwtd2FybWluZy1ldmVyLW1hZGUvXCI+SGF3a2lucyBTcGlyYWwgVmlzdWFsaXphdGlvbjwvYT48L3A+JyArIFxuXHRcdFx0XHRcdCc8cD48YSB0YXJnZXQ9XCJfYmxhbmtcIiBocmVmPVwiaHR0cDovL2NsaW1hdGUubmFzYS5nb3YvZWZmZWN0cy9cIj5OQVNBPC9hPjwvcD4nICtcblx0XHRcdFx0XHQnPHA+PGEgdGFyZ2V0PVwiX2JsYW5rXCIgaHJlZj1cImh0dHBzOi8vd3d3Lm5jZGMubm9hYS5nb3YvaW5kaWNhdG9ycy9cIj5OT0FBPC9hPjwvcD4nKTtcblx0XHRcdH0sNTApO1xuXHRcdH0pO1xuXHR9LFxuXHRjbG9zZTogZnVuY3Rpb24oKSB7XG5cdFx0JCgnI3NpZGViYXInKS5vbignY2xpY2snLCAnI2Nsb3NlLWJ1dHRvbicsIGZ1bmN0aW9uKCl7XG5cdFx0XHQkKCcjc2lkZWJhcicpLnJlbW92ZUNsYXNzKCk7XG5cdFx0XHQkKCcjc2lkZWJhcicpLmh0bWwoJycpO1xuXG5cdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdCQoJyNzaWRlYmFyJykuaHRtbCgnPGg1IGlkPVwicXVlc3Rpb24taWNvblwiPj88L2g1PicgK1xuXHRcdFx0XHRcdCc8aDUgaWQ9XCJzaGFyZS1idXR0b25cIj5mPC9oNT4nKTtcdFx0XG5cdFx0XHR9LDUwKTtcblx0XHR9KTtcblx0fVxufSIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHRzZXRJbml0aWFsQ29sb3I6IGZ1bmN0aW9uIChwcm9taXNlLCBjb25maWcsIHN2Zykge1xuXHRcdGNoYW5nZU1hcENvbG9yKHByb21pc2UsIGNvbmZpZywgWzIwMjAsIDIwMzldLCBmdW5jdGlvbih5ZWFyVHdlbnR5VGVtcCwgeWVhclR3ZW50eUNvbG9yLCBjb3VudHJ5Q29kZSl7XG5cdFx0XHRcdHNldFN2Z0ZpbGwoc3ZnLCBjb25maWcsIGNvdW50cnlDb2RlLCB5ZWFyVHdlbnR5Q29sb3IpO1x0XG5cdFx0fSk7XG5cdH0sXG5cdHNldENvbG9yV2l0aFNsaWRlcjogZnVuY3Rpb24ocHJvbWlzZSwgY29uZmlnLCBzdmcpIHtcblx0XHQvL2NoYW5nZSBzYXR1cmF0aW9uIG9mIHJlZHMgaW4gbWFwIGFzIHRlbXBzIGluY3JlbWVudCBvciBkZWNyZW1lbnQgdy8gdGltZVxuXHRcdCQoJyN5ZWFyLXNlbGVjdG9yJykuY2hhbmdlKGZ1bmN0aW9uKCl7XG5cdFx0XHR2YXIgcmFuZ2UgPSBmaW5kWWVhclJhbmdlKGNvbmZpZyk7XG5cdFx0XHQkKCcjc2VsZWN0b3ItbGFiZWwnKS50ZXh0KHJhbmdlWzBdICsgJyAtLSAnICsgcmFuZ2VbMV0pO1xuXG5cdFx0XHRpZiAocmFuZ2VbMF0gPT09IDIwMjApIHtcblx0XHRcdFx0Y2hhbmdlTWFwQ29sb3IocHJvbWlzZSwgY29uZmlnLCByYW5nZSwgZnVuY3Rpb24oeWVhclR3ZW50eVRlbXAsIHllYXJUd2VudHlDb2xvciwgY291bnRyeUNvZGUpe1xuXHRcdFx0XHRcdHNldFN2Z0ZpbGwoc3ZnLCBjb25maWcsIGNvdW50cnlDb2RlLCB5ZWFyVHdlbnR5Q29sb3IpO1x0XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y2hhbmdlTWFwQ29sb3IocHJvbWlzZSwgY29uZmlnLCByYW5nZSwgZnVuY3Rpb24oY3VycmVudFRlbXAsIGNvdW50cnlDb2RlKXtcblx0XHRcdFx0XHRtYWtlQXBpQ2FsbChwcm9taXNlLCBjb25maWcsIGNvdW50cnlDb2RlLCBbMjAyMCwgMjAzOV0sIGZ1bmN0aW9uKHllYXJUd2VudHlUZW1wLCB5ZWFyVHdlbnR5Q29sb3IsIGNvdW50cnlDb2RlKXtcblxuXHRcdFx0XHRcdFx0dmFyIHRlbXBEaWZmID0gY3VycmVudFRlbXAgLSB5ZWFyVHdlbnR5VGVtcCxcblx0XHRcdFx0XHRcdFx0ZGlmZk11bHQgPSBNYXRoLmZsb29yKHRlbXBEaWZmLzAuNSksXG5cdFx0XHRcdFx0XHRcdGN1cnJlbnRDb2xvciA9IFt5ZWFyVHdlbnR5Q29sb3JbMF0rKDE1KmRpZmZNdWx0KSwgeWVhclR3ZW50eUNvbG9yWzFdLCB5ZWFyVHdlbnR5Q29sb3JbMl0tKDEwKmRpZmZNdWx0KV07XG5cblx0XHRcdFx0XHRcdGlmKCFpc05hTih5ZWFyVHdlbnR5VGVtcCkpIHtcblx0XHRcdFx0XHRcdFx0c2V0U3ZnRmlsbChzdmcsIGNvbmZpZywgY291bnRyeUNvZGUsIGN1cnJlbnRDb2xvcik7XG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdH07XG5cdFx0fSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gY2hhbmdlTWFwQ29sb3IocHJvbWlzZSwgY29uZmlnLCB5ZWFyUmFuZ2UsIGNhbGxiYWNrKXtcblx0cHJvbWlzZS5nZXQoJ21hcF9kYXRhL2NvdW50cnlfY29kZXMuanNvbicpXG5cdC50aGVuKGZ1bmN0aW9uKGNvZGVzKXtcblx0XHRjb2RlcyA9IEpTT04ucGFyc2UoY29kZXMpO1xuXHRcdGZvciAoY291bnRyeSBpbiBjb2Rlcykge1xuXHRcdFx0KGZ1bmN0aW9uKGNvdW50cnlDb2RlLCB5ZWFyUmFuZ2Upe1xuXHRcdFx0XHRtYWtlQXBpQ2FsbChwcm9taXNlLCBjb25maWcsIGNvdW50cnlDb2RlLCB5ZWFyUmFuZ2UsIGNhbGxiYWNrKTtcblx0XHRcdH0pKGNvZGVzW2NvdW50cnldLCB5ZWFyUmFuZ2UpO1xuXHRcdH1cblx0fSlcbn07XG5cbmZ1bmN0aW9uIG1ha2VBcGlDYWxsKHByb21pc2UsIGNvbmZpZywgY291bnRyeUNvZGUsIHllYXJSYW5nZSwgY2FsbGJhY2spIHtcblx0cHJvbWlzZS5nZXQoY29uZmlnLmJhc2UgKyAnL2FwaS8nICsgY291bnRyeUNvZGUgKyAnLycgKyB5ZWFyUmFuZ2VbMF0gKyAndG8nICsgeWVhclJhbmdlWzFdKVxuXHQudGhlbihmdW5jdGlvbihkYXRhKXtcblx0XHRkYXRhID0gSlNPTi5wYXJzZShkYXRhKTtcblx0XHR2YXIgdGVtcCA9IGRhdGEuY2xpbWF0ZURhdGFbMF0uYW5udWFsRGF0YSAqICg5LzUpICsgMzI7XG5cblx0XHRpZiAoeWVhclJhbmdlWzBdID09PSAyMDIwKSB7XG5cdFx0XHQvL2NyZWF0ZSBjb25maWcuYmFzZSBjb2xvciBmb3IgMjAyMFxuXHRcdFx0dmFyIHRlbXBEaWZmID0gdGVtcCAtIDQyLFxuXHRcdFx0ZGlmZk11bHQgPSBNYXRoLmZsb29yKHRlbXBEaWZmIC8gMiksXG5cdFx0XHRzdGFuZGFyZENvbG9yID0gWzEwMSwgMTQ1LCAxNzddLFxuXHRcdFx0bmV3Q29sb3IgPSBbc3RhbmRhcmRDb2xvclswXSAtICgyICooZGlmZk11bHQpKSwgc3RhbmRhcmRDb2xvclsxXSAtICg0KihkaWZmTXVsdCkpLCBzdGFuZGFyZENvbG9yWzJdIC0gKDcqKGRpZmZNdWx0KSldO1xuXG5cdFx0XHRjYWxsYmFjayh0ZW1wLCBuZXdDb2xvciwgY291bnRyeUNvZGUpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjYWxsYmFjayh0ZW1wLCBjb3VudHJ5Q29kZSk7XG5cdFx0fVxuXHR9KTtcbn07XG5cbmZ1bmN0aW9uIHNldFN2Z0ZpbGwoc3ZnLCBjb25maWcsIGNvdW50cnlDb2RlLCBjb2xvcikge1xuXHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRzdmcuc2VsZWN0QWxsKCcuc3VidW5pdC4nICsgY291bnRyeUNvZGUpXG5cdFx0XHRcdC50cmFuc2l0aW9uKClcblx0XHRcdFx0LnN0eWxlKCdmaWxsJywgZnVuY3Rpb24oKXsgcmV0dXJuICdyZ2IoJyArIGNvbG9yWzBdICsgJywgJyArIGNvbG9yWzFdICsgJywgJyArIGNvbG9yWzJdICsgJyknfSk7XG5cdFx0fSwgY29uZmlnLnN2Z0ZpbGwpO1xufTtcblxuZnVuY3Rpb24gZmluZFllYXJSYW5nZShjb25maWcpIHtcblx0dmFyIHJhbmdlS2V5ID0gJCgnI3llYXItc2VsZWN0b3InKS52YWwoKTtcdFxuXHRyZXR1cm4gY29uZmlnLnllYXJSYW5nZXNbcmFuZ2VLZXldO1xufTtcblxuIl19
