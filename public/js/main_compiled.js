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
		promise.get(config.base + 'map_data/country_codes.json')
		.then(function(codes){
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
		promise.get(config.base + 'map_data/new_world.json')
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
	promise.get(config.base + 'map_data/country_codes.json')
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9jb25maWcuanMiLCJqcy9mYWNlYm9va19zZGsuanMiLCJqcy9tYWluLmpzIiwianMvbWFwLmpzIiwianMvcHJvbWlzZS5qcyIsImpzL3NpZGVuYXYuanMiLCJqcy90ZW1wX2NhbGMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0gIHtcblx0YmFzZTogJ2h0dHBzOi8vY2xpbWF0ZS12aXMuaGVyb2t1YXBwLmNvbScsXG5cdGNoZWNrTWFwTG9hZGVkOiA3MDAsIC8vaW50ZXJ2YWwgdG8gY2hlY2tcblx0Y29sb3JMb2FkaW5nOiA0MDAwLFxuXHRzdmdGaWxsOiA1MDAsXG5cdHNpZGViYXJEaXNwbGF5OiAzMCxcblx0eWVhclJhbmdlczogW1syMDIwLCAyMDM5XSwgWzIwNDAsIDIwNTldLCBbMjA2MCwgMjA3OV0sIFsyMDgwLCAyMDk5XV1cbn1cblxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdHNoYXJlOiBmdW5jdGlvbih1cmwpe1xuXHRcdC8vc2V0dGluZyB1cCBzZGtcblx0XHR3aW5kb3cuZmJBc3luY0luaXQgPSBmdW5jdGlvbigpIHtcblx0XHRcdCAgICBGQi5pbml0KHtcblx0XHRcdCAgICAgIGFwcElkICAgICAgOiAnMTA2Mjk2NjgyNzExODc3NicsXG5cdFx0XHQgICAgICB4ZmJtbCAgICAgIDogdHJ1ZSxcblx0XHRcdCAgICAgIHZlcnNpb24gICAgOiAndjIuNidcblx0XHRcdCAgICB9KTtcblx0XHRcdCAgfTtcblxuXHRcdChmdW5jdGlvbihkLCBzLCBpZCl7XG5cdFx0XHR2YXIganMsIGZqcyA9IGQuZ2V0RWxlbWVudHNCeVRhZ05hbWUocylbMF07XG5cdFx0XHRpZiAoZC5nZXRFbGVtZW50QnlJZChpZCkpIHtyZXR1cm47fVxuXHRcdFx0anMgPSBkLmNyZWF0ZUVsZW1lbnQocyk7IGpzLmlkID0gaWQ7XG5cdFx0XHRqcy5zcmMgPSBcIi8vY29ubmVjdC5mYWNlYm9vay5uZXQvZW5fVVMvc2RrLmpzXCI7XG5cdFx0XHRmanMucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoanMsIGZqcyk7XG5cdFx0fShkb2N1bWVudCwgJ3NjcmlwdCcsICdmYWNlYm9vay1qc3NkaycpKTtcblxuXHRcdC8vZmFjZWJvb2sgc2hhcmVcblx0XHQkKCcjc2lkZWJhcicpLm9uKCdjbGljaycsICcjc2hhcmUtYnV0dG9uJywgZnVuY3Rpb24oKXtcblx0XHRcdEZCLnVpKHtcblx0XHRcdG1ldGhvZDogJ3NoYXJlJyxcblx0XHRcdGRpc3BsYXk6ICdwb3B1cCcsXG5cdFx0XHRocmVmOiB1cmwsIFxuXHRcdFx0fSwgZnVuY3Rpb24ocmVzcG9uc2Upe30pO1xuXHRcdH0pO1xuXHR9XG59IiwiJCgnYm9keScpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKCl7XG5cbnZhciBjb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZycpLFxuXHRmYlNESyA9IHJlcXVpcmUoJy4vZmFjZWJvb2tfc2RrJyksXG5cdHByb21pc2UgPSByZXF1aXJlKCcuL3Byb21pc2UnKSxcblx0bWFwID0gcmVxdWlyZSgnLi9tYXAnKSxcblx0Y2FsY1RlbXAgPSByZXF1aXJlKCcuL3RlbXBfY2FsYycpLFxuXHRzaWRlTmF2ID0gcmVxdWlyZSgnLi9zaWRlbmF2Jyk7XG5cbi8vRkIgU0hBUkVcbmZiU0RLLnNoYXJlKGNvbmZpZy5iYXNlKTtcblxuLy9DQUNIRSBTT01FIEFQSSBDQUxMUyBPRkYgVEhFIEJBVFxuKGZ1bmN0aW9uKCl7XG5cdGNvbmZpZy55ZWFyUmFuZ2VzLmZvckVhY2goZnVuY3Rpb24ocmFuZ2Upe1xuXHRcdHByb21pc2UuZ2V0KGNvbmZpZy5iYXNlICsgJ21hcF9kYXRhL2NvdW50cnlfY29kZXMuanNvbicpXG5cdFx0LnRoZW4oZnVuY3Rpb24oY29kZXMpe1xuXHRcdFx0Zm9yIChjb3VudHJ5IGluIGNvZGVzKSB7XG5cdFx0XHRcdHByb21pc2UuZ2V0KGNvbmZpZy5iYXNlICsgJy9hcGkvJyArIGNvZGVzW2NvdW50cnldICsgJy8nICsgcmFuZ2VbMF0gKyAndG8nICsgcmFuZ2VbMV0pO1xuXHRcdFx0fVxuXHRcdH0pXG5cdH0pXG59KSgpO1xuXG4vL0xPQURJTkcgSUNPTlxuZnVuY3Rpb24gcmVtb3ZlTG9hZGluZ0ljb24oKSB7XG5cdGlmICgkKCdwYXRoJykubGVuZ3RoID09PSAzMzcpIHsvL2FsbCBjb3VudHJpZXMgZHJhd25cblx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7Ly9naXZlIGNvbG9ycyB0aW1lIHRvIGxvYWRcblx0XHRcdCQoJ2JvZHknKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdH0sIGNvbmZpZy5jb2xvckxvYWRpbmcpO1xuXHR9XG59XG5zZXRJbnRlcnZhbChyZW1vdmVMb2FkaW5nSWNvbiwgY29uZmlnLmNoZWNrTWFwTG9hZGVkKTtcblxuLy9NQVBcbnZhciBzdmcgPSBtYXAuY3JlYXRlQmcoKTtcbm1hcC5jcmVhdGVDb3VudHJpZXMocHJvbWlzZSwgY29uZmlnKTtcbm1hcC5kcmFnKCk7XG5cbi8vQ09MT1JTXG5jYWxjVGVtcC5zZXRJbml0aWFsQ29sb3IocHJvbWlzZSwgY29uZmlnLCBzdmcpO1xuY2FsY1RlbXAuc2V0Q29sb3JXaXRoU2xpZGVyKHByb21pc2UsIGNvbmZpZywgc3ZnKTtcblxuLy9TSURFTkFWIEVWRU5UU1xuc2lkZU5hdi5vcGVuRmFjdHMoKTtcbnNpZGVOYXYuY2xvc2UoKTtcblxufSk7XG5cblxuXG5cblxuXG5cbiIsInZhciBtb3VzZVBvc2l0aW9uMCxcblx0c3ZnLFxuXHRwcm9qZWN0aW9uLFxuXHRwYXRoLFxuXHRmZWF0dXJlLFxuXHRiYWNrZ3JvdW5kQ2lyY2xlO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0Y3JlYXRlQmc6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciB3aWR0aCA9ICQod2luZG93KS53aWR0aCgpLFxuXHRcdCAgICBoZWlnaHQgPSA3NTA7XG5cblx0XHQvL2NyZWF0ZSBTVkdcblx0XHRzdmcgPSBkMy5zZWxlY3QoJyNtYXAnKS5hcHBlbmQoJ3N2ZycpXG5cdFx0ICAgIC5hdHRyKCd3aWR0aCcsIHdpZHRoKVxuXHRcdCAgICAuYXR0cignaGVpZ2h0JywgaGVpZ2h0KTtcblxuXHRcdC8vc2V0IG1hcCBwcm9wZXJ0aWVzXG5cdFx0cHJvamVjdGlvbiA9IGQzLmdlb1N0ZXJlb2dyYXBoaWMoKVxuXHRcdCAgICAuc2NhbGUoMjgwKVxuXHRcdCAgICAuY2VudGVyKFswLCAwXSlcblx0XHQgICAgLnRyYW5zbGF0ZShbd2lkdGggLyAyLCBoZWlnaHQgLyAyXSlcblx0XHQgICAgLnJvdGF0ZShbMCwwLDBdKVxuXHRcdCAgICAuY2xpcEFuZ2xlKDEwMCk7XG5cblx0XHRwYXRoID0gZDMuZ2VvUGF0aCgpXG5cdFx0ICAgIC5wcm9qZWN0aW9uKHByb2plY3Rpb24pO1xuXG5cdFx0YmFja2dyb3VuZENpcmNsZSA9IHN2Zy5hcHBlbmQoXCJjaXJjbGVcIilcblx0XHQgICAgLmF0dHIoJ2N4Jywgd2lkdGggLyAyKVxuXHRcdCAgICAuYXR0cignY3knLCBoZWlnaHQgLyAyKVxuXHRcdCAgICAuYXR0cigncicsIDMzNSlcblx0XHQgICAgLmF0dHIoJ2lkJywgJ2JhY2tncm91bmQtY2lyY2xlJyk7XG5cblx0XHRyZXR1cm4gc3ZnXG5cdH0sXG5cdGNyZWF0ZUNvdW50cmllczogZnVuY3Rpb24ocHJvbWlzZSwgY29uZmlnKSB7XG5cdFx0cHJvbWlzZS5nZXQoY29uZmlnLmJhc2UgKyAnbWFwX2RhdGEvbmV3X3dvcmxkLmpzb24nKVxuXHRcdC50aGVuKGZ1bmN0aW9uKHdvcmxkKXtcblx0XHRcdFxuXHRcdFx0dmFyIHN1YnVuaXRzID0gdG9wb2pzb24uZmVhdHVyZSh3b3JsZCwgd29ybGQub2JqZWN0cy5zdWJ1bml0cyk7XG5cdFx0XHQvL2NyZWF0ZSBjb3VudHJpZXMnIHBhdGhzXG5cdFx0XHRmZWF0dXJlID0gc3ZnLnNlbGVjdEFsbCgnLnN1YnVuaXQnKVxuXHRcdFx0ICAgIC5kYXRhKHRvcG9qc29uLmZlYXR1cmUod29ybGQsIHdvcmxkLm9iamVjdHMuc3VidW5pdHMpLmZlYXR1cmVzKVxuXHRcdFx0ICAuZW50ZXIoKS5hcHBlbmQoJ3BhdGgnKVxuXHRcdFx0ICAgIC5hdHRyKCdjbGFzcycsIFxuXHRcdFx0ICAgIFx0ZnVuY3Rpb24gKGQpIHsgXG5cdFx0XHQgICAgXHRcdHJldHVybiAnc3VidW5pdCAnICsgZC5pZC5zcGxpdCgnICcpWzBdOyBcblx0XHRcdCAgICBcdH0pXG5cdFx0XHQgICAgLmF0dHIoJ2lkJywgLy9jbGFzcyBpcyBjb3VudHJ5IGNvZGUgKGZvciBhcGkgY2FsbCksIGlkIGlzIHNwZWNpZmljIHJlZ2lvbiBjb2RlICh0byBnZW5lcmF0ZSBsYWJlbClcblx0XHRcdCAgICBcdGZ1bmN0aW9uIChkKSB7XG5cdFx0XHQgICAgXHRcdHJldHVybiBkLmlkLnNwbGl0KCcgJylbMV0gPyBkLmlkLnNwbGl0KCcgJylbMV0gOiBkLmlkLnNwbGl0KCcgJylbMF07XG5cdFx0XHQgICAgXHR9KVxuXHRcdFx0ICAgIC5hdHRyKCdkJywgcGF0aCk7XG5cblx0XHRcdC8vY3JlYXRlIGxhYmVsc1xuXHRcdFx0bGFiZWwgPSBzdmcuc2VsZWN0QWxsKCcuc3VidW5pdC1sYWJlbCcpXG5cdFx0XHRcdC5kYXRhKHRvcG9qc29uLmZlYXR1cmUod29ybGQsIHdvcmxkLm9iamVjdHMuc3VidW5pdHMpLmZlYXR1cmVzKVxuXHRcdFx0LmVudGVyKCkuYXBwZW5kKCd0ZXh0Jylcblx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ3N1YnVuaXQtbGFiZWwnKVxuXHRcdFx0XHQuYXR0cignaWQnLCBcblx0XHRcdCAgICBcdGZ1bmN0aW9uIChkKSB7XG5cdFx0XHQgICAgXHRcdHJldHVybiBkLmlkLnNwbGl0KCcgJylbMV0gPyBkLmlkLnNwbGl0KCcgJylbMV0gOiBkLmlkLnNwbGl0KCcgJylbMF07XG5cdFx0XHQgICAgXHR9KVxuXHRcdFx0XHQuYXR0cigndHJhbnNmb3JtJywgZnVuY3Rpb24oZCkgeyBcblx0XHRcdFx0XHR2YXIgY2VudGVyID0gcGF0aC5jZW50cm9pZChkKTtcblx0XHRcdFx0XHQvL2FkanVzdCBmb3IgbGVmdCBvZmZzZXRcblx0XHRcdFx0XHRpZiAoIWlzTmFOKGNlbnRlclswXSkpe1xuXHRcdFx0XHRcdFx0cmV0dXJuICd0cmFuc2xhdGUoJyArIFtjZW50ZXJbMF0gLSAyMCwgY2VudGVyWzFdXSArICcpJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5hdHRyKCdkeScsICcuMWVtJylcblx0XHRcdFx0LnN0eWxlKCdmaWxsJywgJ2JsYWNrJylcblx0XHRcdFx0LnN0eWxlKCdkaXNwbGF5JywgJ25vbmUnKVxuXHRcdFx0XHQudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLnByb3BlcnRpZXMubmFtZTsgfSk7XG5cblx0XHRcdC8vZGlzcGxheSBsYWJlbHMgb24gaG92ZXJcblx0XHRcdHN2Zy5zZWxlY3RBbGwoJy5zdWJ1bml0Jylcblx0XHRcdFx0Lm9uKCdtb3VzZWVudGVyJywgZnVuY3Rpb24oKXsgXG5cdFx0XHRcdFx0c3ZnLnNlbGVjdCgnLnN1YnVuaXQtbGFiZWwjJyArIHRoaXMuaWQpXG5cdFx0XHRcdFx0XHQuc3R5bGUoJ2Rpc3BsYXknLCAnYmxvY2snKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0Lm9uKCdtb3VzZWxlYXZlJywgZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRzdmcuc2VsZWN0KCcuc3VidW5pdC1sYWJlbCMnICsgdGhpcy5pZClcblx0XHRcdFx0XHRcdC5zdHlsZSgnZGlzcGxheScsICdub25lJyk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5vbignY2xpY2snLCBmdW5jdGlvbigpeyAvL21heWJlIHNlcGFyYXRlIG91dCB0aGlzIHNlY3Rpb24gdG9vXG5cdFx0XHRcdFx0dmFyIGlkID0gdGhpcy5pZCxcblx0XHRcdFx0XHRcdGNvdW50cnlDb2RlID0gJCh0aGlzKS5hdHRyKCdjbGFzcycpLnNwbGl0KCcgJylbMV0sXG5cdFx0XHRcdFx0XHRjb3VudHJ5TmFtZSA9ICQoJy5zdWJ1bml0LWxhYmVsIycgKyBpZCkudGV4dCgpLFxuXHRcdFx0XHRcdFx0cmFuZ2UgPSBjb25maWcueWVhclJhbmdlc1skKCcjeWVhci1zZWxlY3RvcicpLnZhbCgpXTtcblxuXHRcdFx0XHRcdHBvcHVsYXRlU2lkZWJhcihwcm9taXNlLCBjb25maWcsIGlkLCBjb3VudHJ5Q29kZSwgY291bnRyeU5hbWUsIHJhbmdlKTtcblx0XHRcdFx0fSk7XG5cdFx0fSlcblx0fSxcblx0ZHJhZyA6IGZ1bmN0aW9uKCl7XG5cdFx0YmFja2dyb3VuZENpcmNsZS5vbignbW91c2Vkb3duJywgZnVuY3Rpb24oKXtcblx0XHRcdG1vdXNlUG9zaXRpb24wID0gW2QzLmV2ZW50LnBhZ2VYLCBkMy5ldmVudC5wYWdlWV07XG5cdFx0fSk7XG5cblx0XHRiYWNrZ3JvdW5kQ2lyY2xlLm9uKCdtb3VzZW1vdmUnLCBmdW5jdGlvbigpe1xuXHRcdFx0aWYgKG1vdXNlUG9zaXRpb24wKSB7XG5cdFx0XHRcdHZhciBjdXJyZW50Q2VudGVyID0gcHJvamVjdGlvbi5yb3RhdGUoKSxcblx0XHRcdFx0XHRtb3VzZVBvc2l0aW9uMSA9IFtkMy5ldmVudC5wYWdlWCwgZDMuZXZlbnQucGFnZVldLFxuXHRcdFx0XHRcdG5ld0NlbnRlciA9IFtjdXJyZW50Q2VudGVyWzBdICsgKG1vdXNlUG9zaXRpb24wWzBdLW1vdXNlUG9zaXRpb24xWzBdKSAvIDgsIGN1cnJlbnRDZW50ZXJbMV0gKyAobW91c2VQb3NpdGlvbjFbMV0tbW91c2VQb3NpdGlvbjBbMV0pIC8gOF07XG5cblx0XHRcdFx0Ly9zZXQgcm90YXRlIGFjY29yZGluZyB0byBtb3VzZSBldmVudFxuXHRcdFx0ICAgIHByb2plY3Rpb24ucm90YXRlKFstbmV3Q2VudGVyWzBdLCAtbmV3Q2VudGVyWzFdLCAwXSk7XG5cdFx0XHQgICAgLy9yZXJlbmRlciBwYXRoIHVzaW5nIG5ldyBwcm9qZWN0aW9uXG5cdFx0XHRcdGZlYXR1cmUuYXR0cignZCcsIGQzLmdlb1BhdGgoKS5wcm9qZWN0aW9uKHByb2plY3Rpb24pKTtcblx0XHRcdFx0Ly9yZXJlbmRlciBsYWJlbHNcblx0XHRcdFx0bGFiZWwuYXR0cigndHJhbnNmb3JtJywgZnVuY3Rpb24oZCkgeyBcblx0XHRcdFx0XHR2YXIgY2VudGVyID0gcGF0aC5jZW50cm9pZChkKTtcblx0XHRcdFx0XHRpZiAoIWlzTmFOKGNlbnRlclswXSkpe1xuXHRcdFx0XHRcdFx0cmV0dXJuICd0cmFuc2xhdGUoJyArIFtjZW50ZXJbMF0gLSAyMCwgY2VudGVyWzFdXSArICcpJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1x0XG5cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0YmFja2dyb3VuZENpcmNsZS5vbignbW91c2V1cCcsIGZ1bmN0aW9uKCl7XG5cdFx0XHQvL3N0b3AgYW5pbWF0aW9uIG9uIG1vdXNldXBcblx0XHRcdG1vdXNlUG9zaXRpb24wPW51bGw7XG5cdFx0fSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gcG9wdWxhdGVTaWRlYmFyKHByb21pc2UsIGNvbmZpZywgaWQsIGNvdW50cnlDb2RlLCBjb3VudHJ5TmFtZSwgeWVhclJhbmdlKSB7XG5cblx0cHJvbWlzZS5nZXQoY29uZmlnLmJhc2UgKyAnL2FwaS8nICsgY291bnRyeUNvZGUgKyAnLzIwMjB0bzIwMzknKVxuXHQudGhlbihmdW5jdGlvbihkYXRhKXtcblx0XHR2YXIgeWVhclR3ZW50eVRlbXAgPSBkYXRhLmNsaW1hdGVEYXRhWzBdLmFubnVhbERhdGEgKiAoOS81KSArIDMyO1xuXHRcdHllYXJUd2VudHlUZW1wID0gTWF0aC5yb3VuZCh5ZWFyVHdlbnR5VGVtcCAqIDEwMCkgLyAxMDA7XG5cblx0XHRpZiAoIXllYXJUd2VudHlUZW1wKSB5ZWFyVHdlbnR5VGVtcCA9ICdVbmtub3duJztcblxuXHRcdCQoJyNzaWRlYmFyJykuYWRkQ2xhc3MoJ3Nob3ctZGF0YScpO1xuXHRcdCQoJyNzaWRlYmFyJykuaHRtbCgnJyk7XG5cblx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7Ly9tYWtlIHN1cmUgZGF0YSBpcyByZXR1cm4gYmVmb3JlIGFwcGVuZGluZ1xuXHRcdFx0JCgnI3NpZGViYXInKS5hcHBlbmQoJycgKyBcblx0XHRcdFx0JzxwIGlkPVwiY2xvc2UtYnV0dG9uXCI+eDwvcD4nICtcblx0XHRcdFx0JzxoMT4nICsgY291bnRyeU5hbWUgKyAnPC9oMT4nICtcblx0XHRcdFx0JzxwPlRlbXBlcmF0dXJlIGluIDxzdHJvbmc+MjAyMC0yMDM5PC9zdHJvbmc+OiAnICsgeWVhclR3ZW50eVRlbXAgKyAnICYjODQ1Nzs8L3A+Jyk7XG5cdFx0fSwgY29uZmlnLnNpZGViYXJEaXNwbGF5KTtcblxuXHRcdGlmICghKHllYXJSYW5nZVswXSA9PT0gMjAyMCkpIHtcblx0XHRcdHJldHVybiBwcm9taXNlLmdldChjb25maWcuYmFzZSArICcvYXBpLycgKyBjb3VudHJ5Q29kZSArICcvJyArIHllYXJSYW5nZVswXSArICd0bycgKyB5ZWFyUmFuZ2VbMV0pXG5cdFx0fVxuXHR9KVxuXHQudGhlbihmdW5jdGlvbihjdXJyZW50VGVtcERhdGEpe1xuXHRcdGlmIChjdXJyZW50VGVtcERhdGEpIHtcblx0XHRcdGN1cnJlbnRUZW1wID0gY3VycmVudFRlbXBEYXRhLmNsaW1hdGVEYXRhWzBdLmFubnVhbERhdGEgKiAoOS81KSArIDMyO1xuXHRcdFx0Y3VycmVudFRlbXAgPSBNYXRoLnJvdW5kKGN1cnJlbnRUZW1wICogMTAwKSAvIDEwMDtcblxuXHRcdFx0aWYgKCFjdXJyZW50VGVtcCkgY3VycmVudFRlbXAgPSAnVW5rbm93bic7IFxuXG5cdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdCQoJyNzaWRlYmFyJykuYXBwZW5kKCcnICtcblx0XHRcdFx0XHQnPHA+VGVtcGVyYXR1cmUgaW4gJyArIHllYXJSYW5nZVswXSArICctPHN0cm9uZz4nICsgeWVhclJhbmdlWzFdICsgJzogJyArIGN1cnJlbnRUZW1wICsgJzwvc3Ryb25nPiAmIzg0NTc7PC9wPicpO1xuXHRcdFx0fSwgY29uZmlnLnNpZGViYXJEaXNwbGF5KTtcblx0XHR9XG5cdH0pO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZ2V0IDogZnVuY3Rpb24odXJsKSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGQzLmpzb24odXJsLCBmdW5jdGlvbihlcnJvciwgcmVzKXtcbiAgICAgICAgICBpZiAoZXJyb3IpIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgcmVzb2x2ZShyZXMpO1xuICAgICAgICB9KVxuICAgICAgfSk7XG4gICAgfVxufVxuXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0b3BlbkZhY3RzOiBmdW5jdGlvbigpe1xuXHRcdCQoJyNzaWRlYmFyJykub24oJ2NsaWNrJywgJyNxdWVzdGlvbi1pY29uJywgZnVuY3Rpb24oKXtcblx0XHRcdCQoJyNzaWRlYmFyJykuYWRkQ2xhc3MoJ3Nob3ctZmFjdHMnKTtcblx0XHRcdCQoJyNzaWRlYmFyJykuaHRtbCgnJyk7XG5cdFx0XHQvL3BvcHVsYXRlIHNpZGViYXIgd2l0aCBkZXNjcmlwdGlvbiBvZiBhcHBcblx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdFx0JCgnI3NpZGViYXInKS5odG1sKCcnK1xuXHRcdFx0XHRcdCc8cCBpZD1cImNsb3NlLWJ1dHRvblwiPng8L3A+JyArXG5cdFx0XHRcdFx0JzxwPkNsaW1hdGUgTWFwIHB1bGxzIGRhdGEgZnJvbSB0aGUgPGEgdGFyZ2V0PVwiX2JsYW5rXCIgaHJlZj1cImh0dHA6Ly93d3cud29ybGRiYW5rLm9yZy9lbi90b3BpYy9jbGltYXRlY2hhbmdlXCI+V29ybGQgQmFuazwvYT4gY2xpbWF0ZSBhcGkgdG8gbWFrZSBhIHZpc3VhbGl6YXRpb24gb2YgcHJvamVjdGVkIHRlbXBlcmF0dXJlIGNoYW5nZXMgb3ZlciB0aGUgY3VycmVudCBjZW50dXJ5LiBUaGUgdGVtcGVyYXR1cmVzIHVzZWQgYXJlIHRha2VuIGZyb20gdGhlIDxhIHRhcmdldD1cIl9ibGFua1wiIGhyZWY9XCJodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9TcGVjaWFsX1JlcG9ydF9vbl9FbWlzc2lvbnNfU2NlbmFyaW9zXCI+QTI8L2E+IHNjZW5hcmlvLjxwPicgKyBcblx0XHRcdFx0XHQnPHA+VG8gbWFrZSB0ZW1wZXJhdHVyZSBjaGFuZ2UgbW9yZSBldmlkZW50LCBhIGRpZmZlcmVudCBjYWxjdWxhdGlvbiBpcyB1c2VkIHRvIGdlbmVyYXRlIHRoZSBpbml0aWFsIGNvbG9ycyB0aGFuIGlzIHVzZWQgdG8gZGVwaWN0IHRoZSBjaGFuZ2UsIHdoaWNoIGZlYXR1cmVzIGRlZXBlbmluZyByZWQgdG9uZXMgcGVyIDAuNSBkZWdyZWUgc2hpZnQuPC9wPicgK1xuXHRcdFx0XHRcdCc8cD5Gb3IgbW9yZSBpbmZvcm1hdGlvbjo8L3A+JyArIFxuXHRcdFx0XHRcdCc8cD48YSB0YXJnZXQ9XCJfYmxhbmtcIiBocmVmPVwiaHR0cHM6Ly93d3cud2FzaGluZ3RvbnBvc3QuY29tL25ld3MvY2FwaXRhbC13ZWF0aGVyLWdhbmcvd3AvMjAxNi8wNS8xMC90aGUtbW9zdC1jb21wZWxsaW5nLXZpc3VhbC1vZi1nbG9iYWwtd2FybWluZy1ldmVyLW1hZGUvXCI+SGF3a2lucyBTcGlyYWwgVmlzdWFsaXphdGlvbjwvYT48L3A+JyArIFxuXHRcdFx0XHRcdCc8cD48YSB0YXJnZXQ9XCJfYmxhbmtcIiBocmVmPVwiaHR0cDovL2NsaW1hdGUubmFzYS5nb3YvZWZmZWN0cy9cIj5OQVNBPC9hPjwvcD4nICtcblx0XHRcdFx0XHQnPHA+PGEgdGFyZ2V0PVwiX2JsYW5rXCIgaHJlZj1cImh0dHBzOi8vd3d3Lm5jZGMubm9hYS5nb3YvaW5kaWNhdG9ycy9cIj5OT0FBPC9hPjwvcD4nKTtcblx0XHRcdH0sNTApO1xuXHRcdH0pO1xuXHR9LFxuXHRjbG9zZTogZnVuY3Rpb24oKSB7XG5cdFx0JCgnI3NpZGViYXInKS5vbignY2xpY2snLCAnI2Nsb3NlLWJ1dHRvbicsIGZ1bmN0aW9uKCl7XG5cdFx0XHQkKCcjc2lkZWJhcicpLnJlbW92ZUNsYXNzKCk7XG5cdFx0XHQkKCcjc2lkZWJhcicpLmh0bWwoJycpO1xuXG5cdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdCQoJyNzaWRlYmFyJykuaHRtbCgnPGg1IGlkPVwicXVlc3Rpb24taWNvblwiPj88L2g1PicgK1xuXHRcdFx0XHRcdCc8aDUgaWQ9XCJzaGFyZS1idXR0b25cIj5mPC9oNT4nKTtcdFx0XG5cdFx0XHR9LDUwKTtcblx0XHR9KTtcblx0fVxufSIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHRzZXRJbml0aWFsQ29sb3I6IGZ1bmN0aW9uIChwcm9taXNlLCBjb25maWcsIHN2Zykge1xuXHRcdGNoYW5nZU1hcENvbG9yKHByb21pc2UsIGNvbmZpZywgWzIwMjAsIDIwMzldLCBmdW5jdGlvbih5ZWFyVHdlbnR5VGVtcCwgeWVhclR3ZW50eUNvbG9yLCBjb3VudHJ5Q29kZSl7XG5cdFx0XHRcdHNldFN2Z0ZpbGwoc3ZnLCBjb25maWcsIGNvdW50cnlDb2RlLCB5ZWFyVHdlbnR5Q29sb3IpO1x0XG5cdFx0fSk7XG5cdH0sXG5cdHNldENvbG9yV2l0aFNsaWRlcjogZnVuY3Rpb24ocHJvbWlzZSwgY29uZmlnLCBzdmcpIHtcblx0XHQvL2NoYW5nZSBzYXR1cmF0aW9uIG9mIHJlZHMgaW4gbWFwIGFzIHRlbXBzIGluY3JlbWVudCBvciBkZWNyZW1lbnQgdy8gdGltZVxuXHRcdCQoJyN5ZWFyLXNlbGVjdG9yJykuY2hhbmdlKGZ1bmN0aW9uKCl7XG5cdFx0XHR2YXIgcmFuZ2UgPSBmaW5kWWVhclJhbmdlKGNvbmZpZyk7XG5cdFx0XHQkKCcjc2VsZWN0b3ItbGFiZWwnKS50ZXh0KHJhbmdlWzBdICsgJyAtLSAnICsgcmFuZ2VbMV0pO1xuXG5cdFx0XHRpZiAocmFuZ2VbMF0gPT09IDIwMjApIHtcblx0XHRcdFx0Y2hhbmdlTWFwQ29sb3IocHJvbWlzZSwgY29uZmlnLCByYW5nZSwgZnVuY3Rpb24oeWVhclR3ZW50eVRlbXAsIHllYXJUd2VudHlDb2xvciwgY291bnRyeUNvZGUpe1xuXHRcdFx0XHRcdHNldFN2Z0ZpbGwoc3ZnLCBjb25maWcsIGNvdW50cnlDb2RlLCB5ZWFyVHdlbnR5Q29sb3IpO1x0XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y2hhbmdlTWFwQ29sb3IocHJvbWlzZSwgY29uZmlnLCByYW5nZSwgZnVuY3Rpb24oY3VycmVudFRlbXAsIGNvdW50cnlDb2RlKXtcblx0XHRcdFx0XHRtYWtlQXBpQ2FsbChwcm9taXNlLCBjb25maWcsIGNvdW50cnlDb2RlLCBbMjAyMCwgMjAzOV0sIGZ1bmN0aW9uKHllYXJUd2VudHlUZW1wLCB5ZWFyVHdlbnR5Q29sb3IsIGNvdW50cnlDb2RlKXtcblxuXHRcdFx0XHRcdFx0dmFyIHRlbXBEaWZmID0gY3VycmVudFRlbXAgLSB5ZWFyVHdlbnR5VGVtcCxcblx0XHRcdFx0XHRcdFx0ZGlmZk11bHQgPSBNYXRoLmZsb29yKHRlbXBEaWZmLzAuNSksXG5cdFx0XHRcdFx0XHRcdGN1cnJlbnRDb2xvciA9IFt5ZWFyVHdlbnR5Q29sb3JbMF0rKDE1KmRpZmZNdWx0KSwgeWVhclR3ZW50eUNvbG9yWzFdLCB5ZWFyVHdlbnR5Q29sb3JbMl0tKDEwKmRpZmZNdWx0KV07XG5cblx0XHRcdFx0XHRcdGlmKCFpc05hTih5ZWFyVHdlbnR5VGVtcCkpIHtcblx0XHRcdFx0XHRcdFx0c2V0U3ZnRmlsbChzdmcsIGNvbmZpZywgY291bnRyeUNvZGUsIGN1cnJlbnRDb2xvcik7XG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdH07XG5cdFx0fSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gY2hhbmdlTWFwQ29sb3IocHJvbWlzZSwgY29uZmlnLCB5ZWFyUmFuZ2UsIGNhbGxiYWNrKXtcblx0cHJvbWlzZS5nZXQoY29uZmlnLmJhc2UgKyAnbWFwX2RhdGEvY291bnRyeV9jb2Rlcy5qc29uJylcblx0LnRoZW4oZnVuY3Rpb24oY29kZXMpe1xuXHRcdGZvciAoY291bnRyeSBpbiBjb2Rlcykge1xuXHRcdFx0KGZ1bmN0aW9uKGNvdW50cnlDb2RlLCB5ZWFyUmFuZ2Upe1xuXHRcdFx0XHRtYWtlQXBpQ2FsbChwcm9taXNlLCBjb25maWcsIGNvdW50cnlDb2RlLCB5ZWFyUmFuZ2UsIGNhbGxiYWNrKTtcblx0XHRcdH0pKGNvZGVzW2NvdW50cnldLCB5ZWFyUmFuZ2UpO1xuXHRcdH1cblx0fSlcbn07XG5cbmZ1bmN0aW9uIG1ha2VBcGlDYWxsKHByb21pc2UsIGNvbmZpZywgY291bnRyeUNvZGUsIHllYXJSYW5nZSwgY2FsbGJhY2spIHtcblx0cHJvbWlzZS5nZXQoY29uZmlnLmJhc2UgKyAnL2FwaS8nICsgY291bnRyeUNvZGUgKyAnLycgKyB5ZWFyUmFuZ2VbMF0gKyAndG8nICsgeWVhclJhbmdlWzFdKVxuXHQudGhlbihmdW5jdGlvbihkYXRhKXtcblx0XHR2YXIgdGVtcCA9IGRhdGEuY2xpbWF0ZURhdGFbMF0uYW5udWFsRGF0YSAqICg5LzUpICsgMzI7XG5cblx0XHRpZiAoeWVhclJhbmdlWzBdID09PSAyMDIwKSB7XG5cdFx0XHQvL2NyZWF0ZSBiYXNlIGNvbG9yIGZvciAyMDIwXG5cdFx0XHR2YXIgdGVtcERpZmYgPSB0ZW1wIC0gNDIsXG5cdFx0XHRkaWZmTXVsdCA9IE1hdGguZmxvb3IodGVtcERpZmYgLyAyKSxcblx0XHRcdHN0YW5kYXJkQ29sb3IgPSBbMTAxLCAxNDUsIDE3N10sXG5cdFx0XHRuZXdDb2xvciA9IFtzdGFuZGFyZENvbG9yWzBdIC0gKDIgKihkaWZmTXVsdCkpLCBzdGFuZGFyZENvbG9yWzFdIC0gKDQqKGRpZmZNdWx0KSksIHN0YW5kYXJkQ29sb3JbMl0gLSAoNyooZGlmZk11bHQpKV07XG5cblx0XHRcdGNhbGxiYWNrKHRlbXAsIG5ld0NvbG9yLCBjb3VudHJ5Q29kZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNhbGxiYWNrKHRlbXAsIGNvdW50cnlDb2RlKTtcblx0XHR9XG5cdH0pO1xufTtcblxuZnVuY3Rpb24gc2V0U3ZnRmlsbChzdmcsIGNvbmZpZywgY291bnRyeUNvZGUsIGNvbG9yKSB7XG5cdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdHN2Zy5zZWxlY3RBbGwoJy5zdWJ1bml0LicgKyBjb3VudHJ5Q29kZSlcblx0XHRcdFx0LnRyYW5zaXRpb24oKVxuXHRcdFx0XHQuc3R5bGUoJ2ZpbGwnLCBmdW5jdGlvbigpeyByZXR1cm4gJ3JnYignICsgY29sb3JbMF0gKyAnLCAnICsgY29sb3JbMV0gKyAnLCAnICsgY29sb3JbMl0gKyAnKSd9KTtcblx0XHR9LCBjb25maWcuc3ZnRmlsbCk7XG59O1xuXG5mdW5jdGlvbiBmaW5kWWVhclJhbmdlKGNvbmZpZykge1xuXHR2YXIgcmFuZ2VLZXkgPSAkKCcjeWVhci1zZWxlY3RvcicpLnZhbCgpO1x0XG5cdHJldHVybiBjb25maWcueWVhclJhbmdlc1tyYW5nZUtleV07XG59O1xuXG4iXX0=
