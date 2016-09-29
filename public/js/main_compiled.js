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
// (function(){
// 	config.yearRanges.forEach(function(range){
// 		promise.get(config.base + '/map_data/country_codes.json')
// 		.then(function(codes){
// 			for (country in codes) {
// 				promise.get(config.base + '/api/' + codes[country] + '/' + range[0] + 'to' + range[1]);
// 			}
// 		})
// 	})
// })();

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
//calcTemp.setInitialColor(promise, config, svg);
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
		promise.get(config.base + '/map_data/new_world.json')
		.then(function(world){
			
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
		if (currentTempData) {
			currentTemp = currentTempData.climateData[0].annualData * (9/5) + 32;
			currentTemp = Math.round(currentTemp * 100) / 100;

			if (!currentTemp) currentTemp = 'Unknown'; 

			setTimeout(function(){
				$('#sidebar').append('' +
					'<p>Temperature in ' + yearRange[0] + '-<strong>' + yearRange[1] + ': ' + currentTemp + '</strong> &#8457;</p>');
			}, config.sidebarDisplay);
		}
	});
}

},{}],5:[function(require,module,exports){
module.exports = {
    get : function(url) {
      return new Promise(function(resolve, reject) {
        d3.json(url, function(error, res){
          if (error) reject(error);
          resolve(res);
        })
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
	promise.get(config.base + '/map_data/country_codes.json')
	.then(function(codes){
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
		var temp = data.climateData[0].annualData * (9/5) + 32;

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9jb25maWcuanMiLCJqcy9mYWNlYm9va19zZGsuanMiLCJqcy9tYWluLmpzIiwianMvbWFwLmpzIiwianMvcHJvbWlzZS5qcyIsImpzL3NpZGVuYXYuanMiLCJqcy90ZW1wX2NhbGMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0gIHtcblx0YmFzZTogJ2h0dHBzOi8vY2xpbWF0ZS12aXMuaGVyb2t1YXBwLmNvbScsXG5cdGNoZWNrTWFwTG9hZGVkOiA3MDAsIC8vaW50ZXJ2YWwgdG8gY2hlY2tcblx0Y29sb3JMb2FkaW5nOiA0MDAwLFxuXHRzdmdGaWxsOiA1MDAsXG5cdHNpZGViYXJEaXNwbGF5OiAzMCxcblx0eWVhclJhbmdlczogW1syMDIwLCAyMDM5XSwgWzIwNDAsIDIwNTldLCBbMjA2MCwgMjA3OV0sIFsyMDgwLCAyMDk5XV1cbn1cblxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdHNoYXJlOiBmdW5jdGlvbih1cmwpe1xuXHRcdC8vc2V0dGluZyB1cCBzZGtcblx0XHR3aW5kb3cuZmJBc3luY0luaXQgPSBmdW5jdGlvbigpIHtcblx0XHRcdCAgICBGQi5pbml0KHtcblx0XHRcdCAgICAgIGFwcElkICAgICAgOiAnMTA2Mjk2NjgyNzExODc3NicsXG5cdFx0XHQgICAgICB4ZmJtbCAgICAgIDogdHJ1ZSxcblx0XHRcdCAgICAgIHZlcnNpb24gICAgOiAndjIuNidcblx0XHRcdCAgICB9KTtcblx0XHRcdCAgfTtcblxuXHRcdChmdW5jdGlvbihkLCBzLCBpZCl7XG5cdFx0XHR2YXIganMsIGZqcyA9IGQuZ2V0RWxlbWVudHNCeVRhZ05hbWUocylbMF07XG5cdFx0XHRpZiAoZC5nZXRFbGVtZW50QnlJZChpZCkpIHtyZXR1cm47fVxuXHRcdFx0anMgPSBkLmNyZWF0ZUVsZW1lbnQocyk7IGpzLmlkID0gaWQ7XG5cdFx0XHRqcy5zcmMgPSBcIi8vY29ubmVjdC5mYWNlYm9vay5uZXQvZW5fVVMvc2RrLmpzXCI7XG5cdFx0XHRmanMucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoanMsIGZqcyk7XG5cdFx0fShkb2N1bWVudCwgJ3NjcmlwdCcsICdmYWNlYm9vay1qc3NkaycpKTtcblxuXHRcdC8vZmFjZWJvb2sgc2hhcmVcblx0XHQkKCcjc2lkZWJhcicpLm9uKCdjbGljaycsICcjc2hhcmUtYnV0dG9uJywgZnVuY3Rpb24oKXtcblx0XHRcdEZCLnVpKHtcblx0XHRcdG1ldGhvZDogJ3NoYXJlJyxcblx0XHRcdGRpc3BsYXk6ICdwb3B1cCcsXG5cdFx0XHRocmVmOiB1cmwsIFxuXHRcdFx0fSwgZnVuY3Rpb24ocmVzcG9uc2Upe30pO1xuXHRcdH0pO1xuXHR9XG59IiwiJCgnYm9keScpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKCl7XG5cbnZhciBjb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZycpLFxuXHRmYlNESyA9IHJlcXVpcmUoJy4vZmFjZWJvb2tfc2RrJyksXG5cdHByb21pc2UgPSByZXF1aXJlKCcuL3Byb21pc2UnKSxcblx0bWFwID0gcmVxdWlyZSgnLi9tYXAnKSxcblx0Y2FsY1RlbXAgPSByZXF1aXJlKCcuL3RlbXBfY2FsYycpLFxuXHRzaWRlTmF2ID0gcmVxdWlyZSgnLi9zaWRlbmF2Jyk7XG5cbi8vRkIgU0hBUkVcbmZiU0RLLnNoYXJlKGNvbmZpZy5iYXNlKTtcblxuLy9DQUNIRSBTT01FIEFQSSBDQUxMUyBPRkYgVEhFIEJBVFxuLy8gKGZ1bmN0aW9uKCl7XG4vLyBcdGNvbmZpZy55ZWFyUmFuZ2VzLmZvckVhY2goZnVuY3Rpb24ocmFuZ2Upe1xuLy8gXHRcdHByb21pc2UuZ2V0KGNvbmZpZy5iYXNlICsgJy9tYXBfZGF0YS9jb3VudHJ5X2NvZGVzLmpzb24nKVxuLy8gXHRcdC50aGVuKGZ1bmN0aW9uKGNvZGVzKXtcbi8vIFx0XHRcdGZvciAoY291bnRyeSBpbiBjb2Rlcykge1xuLy8gXHRcdFx0XHRwcm9taXNlLmdldChjb25maWcuYmFzZSArICcvYXBpLycgKyBjb2Rlc1tjb3VudHJ5XSArICcvJyArIHJhbmdlWzBdICsgJ3RvJyArIHJhbmdlWzFdKTtcbi8vIFx0XHRcdH1cbi8vIFx0XHR9KVxuLy8gXHR9KVxuLy8gfSkoKTtcblxuLy9MT0FESU5HIElDT05cbmZ1bmN0aW9uIHJlbW92ZUxvYWRpbmdJY29uKCkge1xuXHRpZiAoJCgncGF0aCcpLmxlbmd0aCA9PT0gMzM3KSB7Ly9hbGwgY291bnRyaWVzIGRyYXduXG5cdFx0c2V0VGltZW91dChmdW5jdGlvbigpey8vZ2l2ZSBjb2xvcnMgdGltZSB0byBsb2FkXG5cdFx0XHQkKCdib2R5JykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHR9LCBjb25maWcuY29sb3JMb2FkaW5nKTtcblx0fVxufVxuc2V0SW50ZXJ2YWwocmVtb3ZlTG9hZGluZ0ljb24sIGNvbmZpZy5jaGVja01hcExvYWRlZCk7XG5cbi8vTUFQXG52YXIgc3ZnID0gbWFwLmNyZWF0ZUJnKCk7XG5tYXAuY3JlYXRlQ291bnRyaWVzKHByb21pc2UsIGNvbmZpZyk7XG5tYXAuZHJhZygpO1xuXG4vL0NPTE9SU1xuLy9jYWxjVGVtcC5zZXRJbml0aWFsQ29sb3IocHJvbWlzZSwgY29uZmlnLCBzdmcpO1xuY2FsY1RlbXAuc2V0Q29sb3JXaXRoU2xpZGVyKHByb21pc2UsIGNvbmZpZywgc3ZnKTtcblxuLy9TSURFTkFWIEVWRU5UU1xuc2lkZU5hdi5vcGVuRmFjdHMoKTtcbnNpZGVOYXYuY2xvc2UoKTtcblxufSk7XG5cblxuXG5cblxuXG5cbiIsInZhciBtb3VzZVBvc2l0aW9uMCxcblx0c3ZnLFxuXHRwcm9qZWN0aW9uLFxuXHRwYXRoLFxuXHRmZWF0dXJlLFxuXHRiYWNrZ3JvdW5kQ2lyY2xlO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0Y3JlYXRlQmc6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciB3aWR0aCA9ICQod2luZG93KS53aWR0aCgpLFxuXHRcdCAgICBoZWlnaHQgPSA3NTA7XG5cblx0XHQvL2NyZWF0ZSBTVkdcblx0XHRzdmcgPSBkMy5zZWxlY3QoJyNtYXAnKS5hcHBlbmQoJ3N2ZycpXG5cdFx0ICAgIC5hdHRyKCd3aWR0aCcsIHdpZHRoKVxuXHRcdCAgICAuYXR0cignaGVpZ2h0JywgaGVpZ2h0KTtcblxuXHRcdC8vc2V0IG1hcCBwcm9wZXJ0aWVzXG5cdFx0cHJvamVjdGlvbiA9IGQzLmdlb1N0ZXJlb2dyYXBoaWMoKVxuXHRcdCAgICAuc2NhbGUoMjgwKVxuXHRcdCAgICAuY2VudGVyKFswLCAwXSlcblx0XHQgICAgLnRyYW5zbGF0ZShbd2lkdGggLyAyLCBoZWlnaHQgLyAyXSlcblx0XHQgICAgLnJvdGF0ZShbMCwwLDBdKVxuXHRcdCAgICAuY2xpcEFuZ2xlKDEwMCk7XG5cblx0XHRwYXRoID0gZDMuZ2VvUGF0aCgpXG5cdFx0ICAgIC5wcm9qZWN0aW9uKHByb2plY3Rpb24pO1xuXG5cdFx0YmFja2dyb3VuZENpcmNsZSA9IHN2Zy5hcHBlbmQoXCJjaXJjbGVcIilcblx0XHQgICAgLmF0dHIoJ2N4Jywgd2lkdGggLyAyKVxuXHRcdCAgICAuYXR0cignY3knLCBoZWlnaHQgLyAyKVxuXHRcdCAgICAuYXR0cigncicsIDMzNSlcblx0XHQgICAgLmF0dHIoJ2lkJywgJ2JhY2tncm91bmQtY2lyY2xlJyk7XG5cblx0XHRyZXR1cm4gc3ZnXG5cdH0sXG5cdGNyZWF0ZUNvdW50cmllczogZnVuY3Rpb24ocHJvbWlzZSwgY29uZmlnKSB7XG5cdFx0cHJvbWlzZS5nZXQoY29uZmlnLmJhc2UgKyAnL21hcF9kYXRhL25ld193b3JsZC5qc29uJylcblx0XHQudGhlbihmdW5jdGlvbih3b3JsZCl7XG5cdFx0XHRcblx0XHRcdHZhciBzdWJ1bml0cyA9IHRvcG9qc29uLmZlYXR1cmUod29ybGQsIHdvcmxkLm9iamVjdHMuc3VidW5pdHMpO1xuXHRcdFx0Ly9jcmVhdGUgY291bnRyaWVzJyBwYXRoc1xuXHRcdFx0ZmVhdHVyZSA9IHN2Zy5zZWxlY3RBbGwoJy5zdWJ1bml0Jylcblx0XHRcdCAgICAuZGF0YSh0b3BvanNvbi5mZWF0dXJlKHdvcmxkLCB3b3JsZC5vYmplY3RzLnN1YnVuaXRzKS5mZWF0dXJlcylcblx0XHRcdCAgLmVudGVyKCkuYXBwZW5kKCdwYXRoJylcblx0XHRcdCAgICAuYXR0cignY2xhc3MnLCBcblx0XHRcdCAgICBcdGZ1bmN0aW9uIChkKSB7IFxuXHRcdFx0ICAgIFx0XHRyZXR1cm4gJ3N1YnVuaXQgJyArIGQuaWQuc3BsaXQoJyAnKVswXTsgXG5cdFx0XHQgICAgXHR9KVxuXHRcdFx0ICAgIC5hdHRyKCdpZCcsIC8vY2xhc3MgaXMgY291bnRyeSBjb2RlIChmb3IgYXBpIGNhbGwpLCBpZCBpcyBzcGVjaWZpYyByZWdpb24gY29kZSAodG8gZ2VuZXJhdGUgbGFiZWwpXG5cdFx0XHQgICAgXHRmdW5jdGlvbiAoZCkge1xuXHRcdFx0ICAgIFx0XHRyZXR1cm4gZC5pZC5zcGxpdCgnICcpWzFdID8gZC5pZC5zcGxpdCgnICcpWzFdIDogZC5pZC5zcGxpdCgnICcpWzBdO1xuXHRcdFx0ICAgIFx0fSlcblx0XHRcdCAgICAuYXR0cignZCcsIHBhdGgpO1xuXG5cdFx0XHQvL2NyZWF0ZSBsYWJlbHNcblx0XHRcdGxhYmVsID0gc3ZnLnNlbGVjdEFsbCgnLnN1YnVuaXQtbGFiZWwnKVxuXHRcdFx0XHQuZGF0YSh0b3BvanNvbi5mZWF0dXJlKHdvcmxkLCB3b3JsZC5vYmplY3RzLnN1YnVuaXRzKS5mZWF0dXJlcylcblx0XHRcdC5lbnRlcigpLmFwcGVuZCgndGV4dCcpXG5cdFx0XHRcdC5hdHRyKCdjbGFzcycsICdzdWJ1bml0LWxhYmVsJylcblx0XHRcdFx0LmF0dHIoJ2lkJywgXG5cdFx0XHQgICAgXHRmdW5jdGlvbiAoZCkge1xuXHRcdFx0ICAgIFx0XHRyZXR1cm4gZC5pZC5zcGxpdCgnICcpWzFdID8gZC5pZC5zcGxpdCgnICcpWzFdIDogZC5pZC5zcGxpdCgnICcpWzBdO1xuXHRcdFx0ICAgIFx0fSlcblx0XHRcdFx0LmF0dHIoJ3RyYW5zZm9ybScsIGZ1bmN0aW9uKGQpIHsgXG5cdFx0XHRcdFx0dmFyIGNlbnRlciA9IHBhdGguY2VudHJvaWQoZCk7XG5cdFx0XHRcdFx0Ly9hZGp1c3QgZm9yIGxlZnQgb2Zmc2V0XG5cdFx0XHRcdFx0aWYgKCFpc05hTihjZW50ZXJbMF0pKXtcblx0XHRcdFx0XHRcdHJldHVybiAndHJhbnNsYXRlKCcgKyBbY2VudGVyWzBdIC0gMjAsIGNlbnRlclsxXV0gKyAnKSc7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KVxuXHRcdFx0XHQuYXR0cignZHknLCAnLjFlbScpXG5cdFx0XHRcdC5zdHlsZSgnZmlsbCcsICdibGFjaycpXG5cdFx0XHRcdC5zdHlsZSgnZGlzcGxheScsICdub25lJylcblx0XHRcdFx0LnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5wcm9wZXJ0aWVzLm5hbWU7IH0pO1xuXG5cdFx0XHQvL2Rpc3BsYXkgbGFiZWxzIG9uIGhvdmVyXG5cdFx0XHRzdmcuc2VsZWN0QWxsKCcuc3VidW5pdCcpXG5cdFx0XHRcdC5vbignbW91c2VlbnRlcicsIGZ1bmN0aW9uKCl7IFxuXHRcdFx0XHRcdHN2Zy5zZWxlY3QoJy5zdWJ1bml0LWxhYmVsIycgKyB0aGlzLmlkKVxuXHRcdFx0XHRcdFx0LnN0eWxlKCdkaXNwbGF5JywgJ2Jsb2NrJyk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5vbignbW91c2VsZWF2ZScsIGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0c3ZnLnNlbGVjdCgnLnN1YnVuaXQtbGFiZWwjJyArIHRoaXMuaWQpXG5cdFx0XHRcdFx0XHQuc3R5bGUoJ2Rpc3BsYXknLCAnbm9uZScpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQub24oJ2NsaWNrJywgZnVuY3Rpb24oKXsgLy9tYXliZSBzZXBhcmF0ZSBvdXQgdGhpcyBzZWN0aW9uIHRvb1xuXHRcdFx0XHRcdHZhciBpZCA9IHRoaXMuaWQsXG5cdFx0XHRcdFx0XHRjb3VudHJ5Q29kZSA9ICQodGhpcykuYXR0cignY2xhc3MnKS5zcGxpdCgnICcpWzFdLFxuXHRcdFx0XHRcdFx0Y291bnRyeU5hbWUgPSAkKCcuc3VidW5pdC1sYWJlbCMnICsgaWQpLnRleHQoKSxcblx0XHRcdFx0XHRcdHJhbmdlID0gY29uZmlnLnllYXJSYW5nZXNbJCgnI3llYXItc2VsZWN0b3InKS52YWwoKV07XG5cblx0XHRcdFx0XHRwb3B1bGF0ZVNpZGViYXIocHJvbWlzZSwgY29uZmlnLCBpZCwgY291bnRyeUNvZGUsIGNvdW50cnlOYW1lLCByYW5nZSk7XG5cdFx0XHRcdH0pO1xuXHRcdH0pXG5cdH0sXG5cdGRyYWcgOiBmdW5jdGlvbigpe1xuXHRcdGJhY2tncm91bmRDaXJjbGUub24oJ21vdXNlZG93bicsIGZ1bmN0aW9uKCl7XG5cdFx0XHRtb3VzZVBvc2l0aW9uMCA9IFtkMy5ldmVudC5wYWdlWCwgZDMuZXZlbnQucGFnZVldO1xuXHRcdH0pO1xuXG5cdFx0YmFja2dyb3VuZENpcmNsZS5vbignbW91c2Vtb3ZlJywgZnVuY3Rpb24oKXtcblx0XHRcdGlmIChtb3VzZVBvc2l0aW9uMCkge1xuXHRcdFx0XHR2YXIgY3VycmVudENlbnRlciA9IHByb2plY3Rpb24ucm90YXRlKCksXG5cdFx0XHRcdFx0bW91c2VQb3NpdGlvbjEgPSBbZDMuZXZlbnQucGFnZVgsIGQzLmV2ZW50LnBhZ2VZXSxcblx0XHRcdFx0XHRuZXdDZW50ZXIgPSBbY3VycmVudENlbnRlclswXSArIChtb3VzZVBvc2l0aW9uMFswXS1tb3VzZVBvc2l0aW9uMVswXSkgLyA4LCBjdXJyZW50Q2VudGVyWzFdICsgKG1vdXNlUG9zaXRpb24xWzFdLW1vdXNlUG9zaXRpb24wWzFdKSAvIDhdO1xuXG5cdFx0XHRcdC8vc2V0IHJvdGF0ZSBhY2NvcmRpbmcgdG8gbW91c2UgZXZlbnRcblx0XHRcdCAgICBwcm9qZWN0aW9uLnJvdGF0ZShbLW5ld0NlbnRlclswXSwgLW5ld0NlbnRlclsxXSwgMF0pO1xuXHRcdFx0ICAgIC8vcmVyZW5kZXIgcGF0aCB1c2luZyBuZXcgcHJvamVjdGlvblxuXHRcdFx0XHRmZWF0dXJlLmF0dHIoJ2QnLCBkMy5nZW9QYXRoKCkucHJvamVjdGlvbihwcm9qZWN0aW9uKSk7XG5cdFx0XHRcdC8vcmVyZW5kZXIgbGFiZWxzXG5cdFx0XHRcdGxhYmVsLmF0dHIoJ3RyYW5zZm9ybScsIGZ1bmN0aW9uKGQpIHsgXG5cdFx0XHRcdFx0dmFyIGNlbnRlciA9IHBhdGguY2VudHJvaWQoZCk7XG5cdFx0XHRcdFx0aWYgKCFpc05hTihjZW50ZXJbMF0pKXtcblx0XHRcdFx0XHRcdHJldHVybiAndHJhbnNsYXRlKCcgKyBbY2VudGVyWzBdIC0gMjAsIGNlbnRlclsxXV0gKyAnKSc7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcdFxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGJhY2tncm91bmRDaXJjbGUub24oJ21vdXNldXAnLCBmdW5jdGlvbigpe1xuXHRcdFx0Ly9zdG9wIGFuaW1hdGlvbiBvbiBtb3VzZXVwXG5cdFx0XHRtb3VzZVBvc2l0aW9uMD1udWxsO1xuXHRcdH0pO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHBvcHVsYXRlU2lkZWJhcihwcm9taXNlLCBjb25maWcsIGlkLCBjb3VudHJ5Q29kZSwgY291bnRyeU5hbWUsIHllYXJSYW5nZSkge1xuXG5cdHByb21pc2UuZ2V0KGNvbmZpZy5iYXNlICsgJy9hcGkvJyArIGNvdW50cnlDb2RlICsgJy8yMDIwdG8yMDM5Jylcblx0LnRoZW4oZnVuY3Rpb24oZGF0YSl7XG5cdFx0dmFyIHllYXJUd2VudHlUZW1wID0gZGF0YS5jbGltYXRlRGF0YVswXS5hbm51YWxEYXRhICogKDkvNSkgKyAzMjtcblx0XHR5ZWFyVHdlbnR5VGVtcCA9IE1hdGgucm91bmQoeWVhclR3ZW50eVRlbXAgKiAxMDApIC8gMTAwO1xuXG5cdFx0aWYgKCF5ZWFyVHdlbnR5VGVtcCkgeWVhclR3ZW50eVRlbXAgPSAnVW5rbm93bic7XG5cblx0XHQkKCcjc2lkZWJhcicpLmFkZENsYXNzKCdzaG93LWRhdGEnKTtcblx0XHQkKCcjc2lkZWJhcicpLmh0bWwoJycpO1xuXG5cdFx0c2V0VGltZW91dChmdW5jdGlvbigpey8vbWFrZSBzdXJlIGRhdGEgaXMgcmV0dXJuIGJlZm9yZSBhcHBlbmRpbmdcblx0XHRcdCQoJyNzaWRlYmFyJykuYXBwZW5kKCcnICsgXG5cdFx0XHRcdCc8cCBpZD1cImNsb3NlLWJ1dHRvblwiPng8L3A+JyArXG5cdFx0XHRcdCc8aDE+JyArIGNvdW50cnlOYW1lICsgJzwvaDE+JyArXG5cdFx0XHRcdCc8cD5UZW1wZXJhdHVyZSBpbiA8c3Ryb25nPjIwMjAtMjAzOTwvc3Ryb25nPjogJyArIHllYXJUd2VudHlUZW1wICsgJyAmIzg0NTc7PC9wPicpO1xuXHRcdH0sIGNvbmZpZy5zaWRlYmFyRGlzcGxheSk7XG5cblx0XHRpZiAoISh5ZWFyUmFuZ2VbMF0gPT09IDIwMjApKSB7XG5cdFx0XHRyZXR1cm4gcHJvbWlzZS5nZXQoY29uZmlnLmJhc2UgKyAnL2FwaS8nICsgY291bnRyeUNvZGUgKyAnLycgKyB5ZWFyUmFuZ2VbMF0gKyAndG8nICsgeWVhclJhbmdlWzFdKVxuXHRcdH1cblx0fSlcblx0LnRoZW4oZnVuY3Rpb24oY3VycmVudFRlbXBEYXRhKXtcblx0XHRpZiAoY3VycmVudFRlbXBEYXRhKSB7XG5cdFx0XHRjdXJyZW50VGVtcCA9IGN1cnJlbnRUZW1wRGF0YS5jbGltYXRlRGF0YVswXS5hbm51YWxEYXRhICogKDkvNSkgKyAzMjtcblx0XHRcdGN1cnJlbnRUZW1wID0gTWF0aC5yb3VuZChjdXJyZW50VGVtcCAqIDEwMCkgLyAxMDA7XG5cblx0XHRcdGlmICghY3VycmVudFRlbXApIGN1cnJlbnRUZW1wID0gJ1Vua25vd24nOyBcblxuXHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0XHQkKCcjc2lkZWJhcicpLmFwcGVuZCgnJyArXG5cdFx0XHRcdFx0JzxwPlRlbXBlcmF0dXJlIGluICcgKyB5ZWFyUmFuZ2VbMF0gKyAnLTxzdHJvbmc+JyArIHllYXJSYW5nZVsxXSArICc6ICcgKyBjdXJyZW50VGVtcCArICc8L3N0cm9uZz4gJiM4NDU3OzwvcD4nKTtcblx0XHRcdH0sIGNvbmZpZy5zaWRlYmFyRGlzcGxheSk7XG5cdFx0fVxuXHR9KTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGdldCA6IGZ1bmN0aW9uKHVybCkge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBkMy5qc29uKHVybCwgZnVuY3Rpb24oZXJyb3IsIHJlcyl7XG4gICAgICAgICAgaWYgKGVycm9yKSByZWplY3QoZXJyb3IpO1xuICAgICAgICAgIHJlc29sdmUocmVzKTtcbiAgICAgICAgfSlcbiAgICAgIH0pO1xuICAgIH1cbn1cblxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdG9wZW5GYWN0czogZnVuY3Rpb24oKXtcblx0XHQkKCcjc2lkZWJhcicpLm9uKCdjbGljaycsICcjcXVlc3Rpb24taWNvbicsIGZ1bmN0aW9uKCl7XG5cdFx0XHQkKCcjc2lkZWJhcicpLmFkZENsYXNzKCdzaG93LWZhY3RzJyk7XG5cdFx0XHQkKCcjc2lkZWJhcicpLmh0bWwoJycpO1xuXHRcdFx0Ly9wb3B1bGF0ZSBzaWRlYmFyIHdpdGggZGVzY3JpcHRpb24gb2YgYXBwXG5cdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdCQoJyNzaWRlYmFyJykuaHRtbCgnJytcblx0XHRcdFx0XHQnPHAgaWQ9XCJjbG9zZS1idXR0b25cIj54PC9wPicgK1xuXHRcdFx0XHRcdCc8cD5DbGltYXRlIE1hcCBwdWxscyBkYXRhIGZyb20gdGhlIDxhIHRhcmdldD1cIl9ibGFua1wiIGhyZWY9XCJodHRwOi8vd3d3LndvcmxkYmFuay5vcmcvZW4vdG9waWMvY2xpbWF0ZWNoYW5nZVwiPldvcmxkIEJhbms8L2E+IGNsaW1hdGUgYXBpIHRvIG1ha2UgYSB2aXN1YWxpemF0aW9uIG9mIHByb2plY3RlZCB0ZW1wZXJhdHVyZSBjaGFuZ2VzIG92ZXIgdGhlIGN1cnJlbnQgY2VudHVyeS4gVGhlIHRlbXBlcmF0dXJlcyB1c2VkIGFyZSB0YWtlbiBmcm9tIHRoZSA8YSB0YXJnZXQ9XCJfYmxhbmtcIiBocmVmPVwiaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvU3BlY2lhbF9SZXBvcnRfb25fRW1pc3Npb25zX1NjZW5hcmlvc1wiPkEyPC9hPiBzY2VuYXJpby48cD4nICsgXG5cdFx0XHRcdFx0JzxwPlRvIG1ha2UgdGVtcGVyYXR1cmUgY2hhbmdlIG1vcmUgZXZpZGVudCwgYSBkaWZmZXJlbnQgY2FsY3VsYXRpb24gaXMgdXNlZCB0byBnZW5lcmF0ZSB0aGUgaW5pdGlhbCBjb2xvcnMgdGhhbiBpcyB1c2VkIHRvIGRlcGljdCB0aGUgY2hhbmdlLCB3aGljaCBmZWF0dXJlcyBkZWVwZW5pbmcgcmVkIHRvbmVzIHBlciAwLjUgZGVncmVlIHNoaWZ0LjwvcD4nICtcblx0XHRcdFx0XHQnPHA+Rm9yIG1vcmUgaW5mb3JtYXRpb246PC9wPicgKyBcblx0XHRcdFx0XHQnPHA+PGEgdGFyZ2V0PVwiX2JsYW5rXCIgaHJlZj1cImh0dHBzOi8vd3d3Lndhc2hpbmd0b25wb3N0LmNvbS9uZXdzL2NhcGl0YWwtd2VhdGhlci1nYW5nL3dwLzIwMTYvMDUvMTAvdGhlLW1vc3QtY29tcGVsbGluZy12aXN1YWwtb2YtZ2xvYmFsLXdhcm1pbmctZXZlci1tYWRlL1wiPkhhd2tpbnMgU3BpcmFsIFZpc3VhbGl6YXRpb248L2E+PC9wPicgKyBcblx0XHRcdFx0XHQnPHA+PGEgdGFyZ2V0PVwiX2JsYW5rXCIgaHJlZj1cImh0dHA6Ly9jbGltYXRlLm5hc2EuZ292L2VmZmVjdHMvXCI+TkFTQTwvYT48L3A+JyArXG5cdFx0XHRcdFx0JzxwPjxhIHRhcmdldD1cIl9ibGFua1wiIGhyZWY9XCJodHRwczovL3d3dy5uY2RjLm5vYWEuZ292L2luZGljYXRvcnMvXCI+Tk9BQTwvYT48L3A+Jyk7XG5cdFx0XHR9LDUwKTtcblx0XHR9KTtcblx0fSxcblx0Y2xvc2U6IGZ1bmN0aW9uKCkge1xuXHRcdCQoJyNzaWRlYmFyJykub24oJ2NsaWNrJywgJyNjbG9zZS1idXR0b24nLCBmdW5jdGlvbigpe1xuXHRcdFx0JCgnI3NpZGViYXInKS5yZW1vdmVDbGFzcygpO1xuXHRcdFx0JCgnI3NpZGViYXInKS5odG1sKCcnKTtcblxuXHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0XHQkKCcjc2lkZWJhcicpLmh0bWwoJzxoNSBpZD1cInF1ZXN0aW9uLWljb25cIj4/PC9oNT4nICtcblx0XHRcdFx0XHQnPGg1IGlkPVwic2hhcmUtYnV0dG9uXCI+ZjwvaDU+Jyk7XHRcdFxuXHRcdFx0fSw1MCk7XG5cdFx0fSk7XG5cdH1cbn0iLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0c2V0SW5pdGlhbENvbG9yOiBmdW5jdGlvbiAocHJvbWlzZSwgY29uZmlnLCBzdmcpIHtcblx0XHRjaGFuZ2VNYXBDb2xvcihwcm9taXNlLCBjb25maWcsIFsyMDIwLCAyMDM5XSwgZnVuY3Rpb24oeWVhclR3ZW50eVRlbXAsIHllYXJUd2VudHlDb2xvciwgY291bnRyeUNvZGUpe1xuXHRcdFx0XHRzZXRTdmdGaWxsKHN2ZywgY29uZmlnLCBjb3VudHJ5Q29kZSwgeWVhclR3ZW50eUNvbG9yKTtcdFxuXHRcdH0pO1xuXHR9LFxuXHRzZXRDb2xvcldpdGhTbGlkZXI6IGZ1bmN0aW9uKHByb21pc2UsIGNvbmZpZywgc3ZnKSB7XG5cdFx0Ly9jaGFuZ2Ugc2F0dXJhdGlvbiBvZiByZWRzIGluIG1hcCBhcyB0ZW1wcyBpbmNyZW1lbnQgb3IgZGVjcmVtZW50IHcvIHRpbWVcblx0XHQkKCcjeWVhci1zZWxlY3RvcicpLmNoYW5nZShmdW5jdGlvbigpe1xuXHRcdFx0dmFyIHJhbmdlID0gZmluZFllYXJSYW5nZShjb25maWcpO1xuXHRcdFx0JCgnI3NlbGVjdG9yLWxhYmVsJykudGV4dChyYW5nZVswXSArICcgLS0gJyArIHJhbmdlWzFdKTtcblxuXHRcdFx0aWYgKHJhbmdlWzBdID09PSAyMDIwKSB7XG5cdFx0XHRcdGNoYW5nZU1hcENvbG9yKHByb21pc2UsIGNvbmZpZywgcmFuZ2UsIGZ1bmN0aW9uKHllYXJUd2VudHlUZW1wLCB5ZWFyVHdlbnR5Q29sb3IsIGNvdW50cnlDb2RlKXtcblx0XHRcdFx0XHRzZXRTdmdGaWxsKHN2ZywgY29uZmlnLCBjb3VudHJ5Q29kZSwgeWVhclR3ZW50eUNvbG9yKTtcdFxuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNoYW5nZU1hcENvbG9yKHByb21pc2UsIGNvbmZpZywgcmFuZ2UsIGZ1bmN0aW9uKGN1cnJlbnRUZW1wLCBjb3VudHJ5Q29kZSl7XG5cdFx0XHRcdFx0bWFrZUFwaUNhbGwocHJvbWlzZSwgY29uZmlnLCBjb3VudHJ5Q29kZSwgWzIwMjAsIDIwMzldLCBmdW5jdGlvbih5ZWFyVHdlbnR5VGVtcCwgeWVhclR3ZW50eUNvbG9yLCBjb3VudHJ5Q29kZSl7XG5cblx0XHRcdFx0XHRcdHZhciB0ZW1wRGlmZiA9IGN1cnJlbnRUZW1wIC0geWVhclR3ZW50eVRlbXAsXG5cdFx0XHRcdFx0XHRcdGRpZmZNdWx0ID0gTWF0aC5mbG9vcih0ZW1wRGlmZi8wLjUpLFxuXHRcdFx0XHRcdFx0XHRjdXJyZW50Q29sb3IgPSBbeWVhclR3ZW50eUNvbG9yWzBdKygxNSpkaWZmTXVsdCksIHllYXJUd2VudHlDb2xvclsxXSwgeWVhclR3ZW50eUNvbG9yWzJdLSgxMCpkaWZmTXVsdCldO1xuXG5cdFx0XHRcdFx0XHRpZighaXNOYU4oeWVhclR3ZW50eVRlbXApKSB7XG5cdFx0XHRcdFx0XHRcdHNldFN2Z0ZpbGwoc3ZnLCBjb25maWcsIGNvdW50cnlDb2RlLCBjdXJyZW50Q29sb3IpO1xuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9O1xuXHRcdH0pO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGNoYW5nZU1hcENvbG9yKHByb21pc2UsIGNvbmZpZywgeWVhclJhbmdlLCBjYWxsYmFjayl7XG5cdHByb21pc2UuZ2V0KGNvbmZpZy5iYXNlICsgJy9tYXBfZGF0YS9jb3VudHJ5X2NvZGVzLmpzb24nKVxuXHQudGhlbihmdW5jdGlvbihjb2Rlcyl7XG5cdFx0Zm9yIChjb3VudHJ5IGluIGNvZGVzKSB7XG5cdFx0XHQoZnVuY3Rpb24oY291bnRyeUNvZGUsIHllYXJSYW5nZSl7XG5cdFx0XHRcdG1ha2VBcGlDYWxsKHByb21pc2UsIGNvbmZpZywgY291bnRyeUNvZGUsIHllYXJSYW5nZSwgY2FsbGJhY2spO1xuXHRcdFx0fSkoY29kZXNbY291bnRyeV0sIHllYXJSYW5nZSk7XG5cdFx0fVxuXHR9KVxufTtcblxuZnVuY3Rpb24gbWFrZUFwaUNhbGwocHJvbWlzZSwgY29uZmlnLCBjb3VudHJ5Q29kZSwgeWVhclJhbmdlLCBjYWxsYmFjaykge1xuXHRwcm9taXNlLmdldChjb25maWcuYmFzZSArICcvYXBpLycgKyBjb3VudHJ5Q29kZSArICcvJyArIHllYXJSYW5nZVswXSArICd0bycgKyB5ZWFyUmFuZ2VbMV0pXG5cdC50aGVuKGZ1bmN0aW9uKGRhdGEpe1xuXHRcdHZhciB0ZW1wID0gZGF0YS5jbGltYXRlRGF0YVswXS5hbm51YWxEYXRhICogKDkvNSkgKyAzMjtcblxuXHRcdGlmICh5ZWFyUmFuZ2VbMF0gPT09IDIwMjApIHtcblx0XHRcdC8vY3JlYXRlIGJhc2UgY29sb3IgZm9yIDIwMjBcblx0XHRcdHZhciB0ZW1wRGlmZiA9IHRlbXAgLSA0Mixcblx0XHRcdGRpZmZNdWx0ID0gTWF0aC5mbG9vcih0ZW1wRGlmZiAvIDIpLFxuXHRcdFx0c3RhbmRhcmRDb2xvciA9IFsxMDEsIDE0NSwgMTc3XSxcblx0XHRcdG5ld0NvbG9yID0gW3N0YW5kYXJkQ29sb3JbMF0gLSAoMiAqKGRpZmZNdWx0KSksIHN0YW5kYXJkQ29sb3JbMV0gLSAoNCooZGlmZk11bHQpKSwgc3RhbmRhcmRDb2xvclsyXSAtICg3KihkaWZmTXVsdCkpXTtcblxuXHRcdFx0Y2FsbGJhY2sodGVtcCwgbmV3Q29sb3IsIGNvdW50cnlDb2RlKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y2FsbGJhY2sodGVtcCwgY291bnRyeUNvZGUpO1xuXHRcdH1cblx0fSk7XG59O1xuXG5mdW5jdGlvbiBzZXRTdmdGaWxsKHN2ZywgY29uZmlnLCBjb3VudHJ5Q29kZSwgY29sb3IpIHtcblx0c2V0VGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0c3ZnLnNlbGVjdEFsbCgnLnN1YnVuaXQuJyArIGNvdW50cnlDb2RlKVxuXHRcdFx0XHQudHJhbnNpdGlvbigpXG5cdFx0XHRcdC5zdHlsZSgnZmlsbCcsIGZ1bmN0aW9uKCl7IHJldHVybiAncmdiKCcgKyBjb2xvclswXSArICcsICcgKyBjb2xvclsxXSArICcsICcgKyBjb2xvclsyXSArICcpJ30pO1xuXHRcdH0sIGNvbmZpZy5zdmdGaWxsKTtcbn07XG5cbmZ1bmN0aW9uIGZpbmRZZWFyUmFuZ2UoY29uZmlnKSB7XG5cdHZhciByYW5nZUtleSA9ICQoJyN5ZWFyLXNlbGVjdG9yJykudmFsKCk7XHRcblx0cmV0dXJuIGNvbmZpZy55ZWFyUmFuZ2VzW3JhbmdlS2V5XTtcbn07XG5cbiJdfQ==
