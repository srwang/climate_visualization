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
		promise.get(config.base + '/map_data/country_codes.json')
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9jb25maWcuanMiLCJqcy9mYWNlYm9va19zZGsuanMiLCJqcy9tYWluLmpzIiwianMvbWFwLmpzIiwianMvcHJvbWlzZS5qcyIsImpzL3NpZGVuYXYuanMiLCJqcy90ZW1wX2NhbGMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0gIHtcblx0YmFzZTogJ2h0dHBzOi8vY2xpbWF0ZS12aXMuaGVyb2t1YXBwLmNvbScsXG5cdGNoZWNrTWFwTG9hZGVkOiA3MDAsIC8vaW50ZXJ2YWwgdG8gY2hlY2tcblx0Y29sb3JMb2FkaW5nOiA0MDAwLFxuXHRzdmdGaWxsOiA1MDAsXG5cdHNpZGViYXJEaXNwbGF5OiAzMCxcblx0eWVhclJhbmdlczogW1syMDIwLCAyMDM5XSwgWzIwNDAsIDIwNTldLCBbMjA2MCwgMjA3OV0sIFsyMDgwLCAyMDk5XV1cbn1cblxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdHNoYXJlOiBmdW5jdGlvbih1cmwpe1xuXHRcdC8vc2V0dGluZyB1cCBzZGtcblx0XHR3aW5kb3cuZmJBc3luY0luaXQgPSBmdW5jdGlvbigpIHtcblx0XHRcdCAgICBGQi5pbml0KHtcblx0XHRcdCAgICAgIGFwcElkICAgICAgOiAnMTA2Mjk2NjgyNzExODc3NicsXG5cdFx0XHQgICAgICB4ZmJtbCAgICAgIDogdHJ1ZSxcblx0XHRcdCAgICAgIHZlcnNpb24gICAgOiAndjIuNidcblx0XHRcdCAgICB9KTtcblx0XHRcdCAgfTtcblxuXHRcdChmdW5jdGlvbihkLCBzLCBpZCl7XG5cdFx0XHR2YXIganMsIGZqcyA9IGQuZ2V0RWxlbWVudHNCeVRhZ05hbWUocylbMF07XG5cdFx0XHRpZiAoZC5nZXRFbGVtZW50QnlJZChpZCkpIHtyZXR1cm47fVxuXHRcdFx0anMgPSBkLmNyZWF0ZUVsZW1lbnQocyk7IGpzLmlkID0gaWQ7XG5cdFx0XHRqcy5zcmMgPSBcIi8vY29ubmVjdC5mYWNlYm9vay5uZXQvZW5fVVMvc2RrLmpzXCI7XG5cdFx0XHRmanMucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoanMsIGZqcyk7XG5cdFx0fShkb2N1bWVudCwgJ3NjcmlwdCcsICdmYWNlYm9vay1qc3NkaycpKTtcblxuXHRcdC8vZmFjZWJvb2sgc2hhcmVcblx0XHQkKCcjc2lkZWJhcicpLm9uKCdjbGljaycsICcjc2hhcmUtYnV0dG9uJywgZnVuY3Rpb24oKXtcblx0XHRcdEZCLnVpKHtcblx0XHRcdG1ldGhvZDogJ3NoYXJlJyxcblx0XHRcdGRpc3BsYXk6ICdwb3B1cCcsXG5cdFx0XHRocmVmOiB1cmwsIFxuXHRcdFx0fSwgZnVuY3Rpb24ocmVzcG9uc2Upe30pO1xuXHRcdH0pO1xuXHR9XG59IiwiJCgnYm9keScpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKCl7XG5cbnZhciBjb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZycpLFxuXHRmYlNESyA9IHJlcXVpcmUoJy4vZmFjZWJvb2tfc2RrJyksXG5cdHByb21pc2UgPSByZXF1aXJlKCcuL3Byb21pc2UnKSxcblx0bWFwID0gcmVxdWlyZSgnLi9tYXAnKSxcblx0Y2FsY1RlbXAgPSByZXF1aXJlKCcuL3RlbXBfY2FsYycpLFxuXHRzaWRlTmF2ID0gcmVxdWlyZSgnLi9zaWRlbmF2Jyk7XG5cbi8vRkIgU0hBUkVcbmZiU0RLLnNoYXJlKGNvbmZpZy5iYXNlKTtcblxuLy9DQUNIRSBTT01FIEFQSSBDQUxMUyBPRkYgVEhFIEJBVFxuKGZ1bmN0aW9uKCl7XG5cdGNvbmZpZy55ZWFyUmFuZ2VzLmZvckVhY2goZnVuY3Rpb24ocmFuZ2Upe1xuXHRcdHByb21pc2UuZ2V0KGNvbmZpZy5iYXNlICsgJy9tYXBfZGF0YS9jb3VudHJ5X2NvZGVzLmpzb24nKVxuXHRcdC50aGVuKGZ1bmN0aW9uKGNvZGVzKXtcblx0XHRcdGZvciAoY291bnRyeSBpbiBjb2Rlcykge1xuXHRcdFx0XHRwcm9taXNlLmdldChjb25maWcuYmFzZSArICcvYXBpLycgKyBjb2Rlc1tjb3VudHJ5XSArICcvJyArIHJhbmdlWzBdICsgJ3RvJyArIHJhbmdlWzFdKTtcblx0XHRcdH1cblx0XHR9KVxuXHR9KVxufSkoKTtcblxuLy9MT0FESU5HIElDT05cbmZ1bmN0aW9uIHJlbW92ZUxvYWRpbmdJY29uKCkge1xuXHRpZiAoJCgncGF0aCcpLmxlbmd0aCA9PT0gMzM3KSB7Ly9hbGwgY291bnRyaWVzIGRyYXduXG5cdFx0c2V0VGltZW91dChmdW5jdGlvbigpey8vZ2l2ZSBjb2xvcnMgdGltZSB0byBsb2FkXG5cdFx0XHQkKCdib2R5JykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHR9LCBjb25maWcuY29sb3JMb2FkaW5nKTtcblx0fVxufVxuc2V0SW50ZXJ2YWwocmVtb3ZlTG9hZGluZ0ljb24sIGNvbmZpZy5jaGVja01hcExvYWRlZCk7XG5cbi8vTUFQXG52YXIgc3ZnID0gbWFwLmNyZWF0ZUJnKCk7XG5tYXAuY3JlYXRlQ291bnRyaWVzKHByb21pc2UsIGNvbmZpZyk7XG5tYXAuZHJhZygpO1xuXG4vL0NPTE9SU1xuY2FsY1RlbXAuc2V0SW5pdGlhbENvbG9yKHByb21pc2UsIGNvbmZpZywgc3ZnKTtcbmNhbGNUZW1wLnNldENvbG9yV2l0aFNsaWRlcihwcm9taXNlLCBjb25maWcsIHN2Zyk7XG5cbi8vU0lERU5BViBFVkVOVFNcbnNpZGVOYXYub3BlbkZhY3RzKCk7XG5zaWRlTmF2LmNsb3NlKCk7XG5cbn0pO1xuXG5cblxuXG5cblxuXG4iLCJ2YXIgbW91c2VQb3NpdGlvbjAsXG5cdHN2Zyxcblx0cHJvamVjdGlvbixcblx0cGF0aCxcblx0ZmVhdHVyZSxcblx0YmFja2dyb3VuZENpcmNsZTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdGNyZWF0ZUJnOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgd2lkdGggPSAkKHdpbmRvdykud2lkdGgoKSxcblx0XHQgICAgaGVpZ2h0ID0gNzUwO1xuXG5cdFx0Ly9jcmVhdGUgU1ZHXG5cdFx0c3ZnID0gZDMuc2VsZWN0KCcjbWFwJykuYXBwZW5kKCdzdmcnKVxuXHRcdCAgICAuYXR0cignd2lkdGgnLCB3aWR0aClcblx0XHQgICAgLmF0dHIoJ2hlaWdodCcsIGhlaWdodCk7XG5cblx0XHQvL3NldCBtYXAgcHJvcGVydGllc1xuXHRcdHByb2plY3Rpb24gPSBkMy5nZW9TdGVyZW9ncmFwaGljKClcblx0XHQgICAgLnNjYWxlKDI4MClcblx0XHQgICAgLmNlbnRlcihbMCwgMF0pXG5cdFx0ICAgIC50cmFuc2xhdGUoW3dpZHRoIC8gMiwgaGVpZ2h0IC8gMl0pXG5cdFx0ICAgIC5yb3RhdGUoWzAsMCwwXSlcblx0XHQgICAgLmNsaXBBbmdsZSgxMDApO1xuXG5cdFx0cGF0aCA9IGQzLmdlb1BhdGgoKVxuXHRcdCAgICAucHJvamVjdGlvbihwcm9qZWN0aW9uKTtcblxuXHRcdGJhY2tncm91bmRDaXJjbGUgPSBzdmcuYXBwZW5kKFwiY2lyY2xlXCIpXG5cdFx0ICAgIC5hdHRyKCdjeCcsIHdpZHRoIC8gMilcblx0XHQgICAgLmF0dHIoJ2N5JywgaGVpZ2h0IC8gMilcblx0XHQgICAgLmF0dHIoJ3InLCAzMzUpXG5cdFx0ICAgIC5hdHRyKCdpZCcsICdiYWNrZ3JvdW5kLWNpcmNsZScpO1xuXG5cdFx0cmV0dXJuIHN2Z1xuXHR9LFxuXHRjcmVhdGVDb3VudHJpZXM6IGZ1bmN0aW9uKHByb21pc2UsIGNvbmZpZykge1xuXHRcdHByb21pc2UuZ2V0KGNvbmZpZy5iYXNlICsgJy9tYXBfZGF0YS9uZXdfd29ybGQuanNvbicpXG5cdFx0LnRoZW4oZnVuY3Rpb24od29ybGQpe1xuXHRcdFx0XG5cdFx0XHR2YXIgc3VidW5pdHMgPSB0b3BvanNvbi5mZWF0dXJlKHdvcmxkLCB3b3JsZC5vYmplY3RzLnN1YnVuaXRzKTtcblx0XHRcdC8vY3JlYXRlIGNvdW50cmllcycgcGF0aHNcblx0XHRcdGZlYXR1cmUgPSBzdmcuc2VsZWN0QWxsKCcuc3VidW5pdCcpXG5cdFx0XHQgICAgLmRhdGEodG9wb2pzb24uZmVhdHVyZSh3b3JsZCwgd29ybGQub2JqZWN0cy5zdWJ1bml0cykuZmVhdHVyZXMpXG5cdFx0XHQgIC5lbnRlcigpLmFwcGVuZCgncGF0aCcpXG5cdFx0XHQgICAgLmF0dHIoJ2NsYXNzJywgXG5cdFx0XHQgICAgXHRmdW5jdGlvbiAoZCkgeyBcblx0XHRcdCAgICBcdFx0cmV0dXJuICdzdWJ1bml0ICcgKyBkLmlkLnNwbGl0KCcgJylbMF07IFxuXHRcdFx0ICAgIFx0fSlcblx0XHRcdCAgICAuYXR0cignaWQnLCAvL2NsYXNzIGlzIGNvdW50cnkgY29kZSAoZm9yIGFwaSBjYWxsKSwgaWQgaXMgc3BlY2lmaWMgcmVnaW9uIGNvZGUgKHRvIGdlbmVyYXRlIGxhYmVsKVxuXHRcdFx0ICAgIFx0ZnVuY3Rpb24gKGQpIHtcblx0XHRcdCAgICBcdFx0cmV0dXJuIGQuaWQuc3BsaXQoJyAnKVsxXSA/IGQuaWQuc3BsaXQoJyAnKVsxXSA6IGQuaWQuc3BsaXQoJyAnKVswXTtcblx0XHRcdCAgICBcdH0pXG5cdFx0XHQgICAgLmF0dHIoJ2QnLCBwYXRoKTtcblxuXHRcdFx0Ly9jcmVhdGUgbGFiZWxzXG5cdFx0XHRsYWJlbCA9IHN2Zy5zZWxlY3RBbGwoJy5zdWJ1bml0LWxhYmVsJylcblx0XHRcdFx0LmRhdGEodG9wb2pzb24uZmVhdHVyZSh3b3JsZCwgd29ybGQub2JqZWN0cy5zdWJ1bml0cykuZmVhdHVyZXMpXG5cdFx0XHQuZW50ZXIoKS5hcHBlbmQoJ3RleHQnKVxuXHRcdFx0XHQuYXR0cignY2xhc3MnLCAnc3VidW5pdC1sYWJlbCcpXG5cdFx0XHRcdC5hdHRyKCdpZCcsIFxuXHRcdFx0ICAgIFx0ZnVuY3Rpb24gKGQpIHtcblx0XHRcdCAgICBcdFx0cmV0dXJuIGQuaWQuc3BsaXQoJyAnKVsxXSA/IGQuaWQuc3BsaXQoJyAnKVsxXSA6IGQuaWQuc3BsaXQoJyAnKVswXTtcblx0XHRcdCAgICBcdH0pXG5cdFx0XHRcdC5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbihkKSB7IFxuXHRcdFx0XHRcdHZhciBjZW50ZXIgPSBwYXRoLmNlbnRyb2lkKGQpO1xuXHRcdFx0XHRcdC8vYWRqdXN0IGZvciBsZWZ0IG9mZnNldFxuXHRcdFx0XHRcdGlmICghaXNOYU4oY2VudGVyWzBdKSl7XG5cdFx0XHRcdFx0XHRyZXR1cm4gJ3RyYW5zbGF0ZSgnICsgW2NlbnRlclswXSAtIDIwLCBjZW50ZXJbMV1dICsgJyknO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSlcblx0XHRcdFx0LmF0dHIoJ2R5JywgJy4xZW0nKVxuXHRcdFx0XHQuc3R5bGUoJ2ZpbGwnLCAnYmxhY2snKVxuXHRcdFx0XHQuc3R5bGUoJ2Rpc3BsYXknLCAnbm9uZScpXG5cdFx0XHRcdC50ZXh0KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQucHJvcGVydGllcy5uYW1lOyB9KTtcblxuXHRcdFx0Ly9kaXNwbGF5IGxhYmVscyBvbiBob3ZlclxuXHRcdFx0c3ZnLnNlbGVjdEFsbCgnLnN1YnVuaXQnKVxuXHRcdFx0XHQub24oJ21vdXNlZW50ZXInLCBmdW5jdGlvbigpeyBcblx0XHRcdFx0XHRzdmcuc2VsZWN0KCcuc3VidW5pdC1sYWJlbCMnICsgdGhpcy5pZClcblx0XHRcdFx0XHRcdC5zdHlsZSgnZGlzcGxheScsICdibG9jaycpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQub24oJ21vdXNlbGVhdmUnLCBmdW5jdGlvbigpe1xuXHRcdFx0XHRcdHN2Zy5zZWxlY3QoJy5zdWJ1bml0LWxhYmVsIycgKyB0aGlzLmlkKVxuXHRcdFx0XHRcdFx0LnN0eWxlKCdkaXNwbGF5JywgJ25vbmUnKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0Lm9uKCdjbGljaycsIGZ1bmN0aW9uKCl7IC8vbWF5YmUgc2VwYXJhdGUgb3V0IHRoaXMgc2VjdGlvbiB0b29cblx0XHRcdFx0XHR2YXIgaWQgPSB0aGlzLmlkLFxuXHRcdFx0XHRcdFx0Y291bnRyeUNvZGUgPSAkKHRoaXMpLmF0dHIoJ2NsYXNzJykuc3BsaXQoJyAnKVsxXSxcblx0XHRcdFx0XHRcdGNvdW50cnlOYW1lID0gJCgnLnN1YnVuaXQtbGFiZWwjJyArIGlkKS50ZXh0KCksXG5cdFx0XHRcdFx0XHRyYW5nZSA9IGNvbmZpZy55ZWFyUmFuZ2VzWyQoJyN5ZWFyLXNlbGVjdG9yJykudmFsKCldO1xuXG5cdFx0XHRcdFx0cG9wdWxhdGVTaWRlYmFyKHByb21pc2UsIGNvbmZpZywgaWQsIGNvdW50cnlDb2RlLCBjb3VudHJ5TmFtZSwgcmFuZ2UpO1xuXHRcdFx0XHR9KTtcblx0XHR9KVxuXHR9LFxuXHRkcmFnIDogZnVuY3Rpb24oKXtcblx0XHRiYWNrZ3JvdW5kQ2lyY2xlLm9uKCdtb3VzZWRvd24nLCBmdW5jdGlvbigpe1xuXHRcdFx0bW91c2VQb3NpdGlvbjAgPSBbZDMuZXZlbnQucGFnZVgsIGQzLmV2ZW50LnBhZ2VZXTtcblx0XHR9KTtcblxuXHRcdGJhY2tncm91bmRDaXJjbGUub24oJ21vdXNlbW92ZScsIGZ1bmN0aW9uKCl7XG5cdFx0XHRpZiAobW91c2VQb3NpdGlvbjApIHtcblx0XHRcdFx0dmFyIGN1cnJlbnRDZW50ZXIgPSBwcm9qZWN0aW9uLnJvdGF0ZSgpLFxuXHRcdFx0XHRcdG1vdXNlUG9zaXRpb24xID0gW2QzLmV2ZW50LnBhZ2VYLCBkMy5ldmVudC5wYWdlWV0sXG5cdFx0XHRcdFx0bmV3Q2VudGVyID0gW2N1cnJlbnRDZW50ZXJbMF0gKyAobW91c2VQb3NpdGlvbjBbMF0tbW91c2VQb3NpdGlvbjFbMF0pIC8gOCwgY3VycmVudENlbnRlclsxXSArIChtb3VzZVBvc2l0aW9uMVsxXS1tb3VzZVBvc2l0aW9uMFsxXSkgLyA4XTtcblxuXHRcdFx0XHQvL3NldCByb3RhdGUgYWNjb3JkaW5nIHRvIG1vdXNlIGV2ZW50XG5cdFx0XHQgICAgcHJvamVjdGlvbi5yb3RhdGUoWy1uZXdDZW50ZXJbMF0sIC1uZXdDZW50ZXJbMV0sIDBdKTtcblx0XHRcdCAgICAvL3JlcmVuZGVyIHBhdGggdXNpbmcgbmV3IHByb2plY3Rpb25cblx0XHRcdFx0ZmVhdHVyZS5hdHRyKCdkJywgZDMuZ2VvUGF0aCgpLnByb2plY3Rpb24ocHJvamVjdGlvbikpO1xuXHRcdFx0XHQvL3JlcmVuZGVyIGxhYmVsc1xuXHRcdFx0XHRsYWJlbC5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbihkKSB7IFxuXHRcdFx0XHRcdHZhciBjZW50ZXIgPSBwYXRoLmNlbnRyb2lkKGQpO1xuXHRcdFx0XHRcdGlmICghaXNOYU4oY2VudGVyWzBdKSl7XG5cdFx0XHRcdFx0XHRyZXR1cm4gJ3RyYW5zbGF0ZSgnICsgW2NlbnRlclswXSAtIDIwLCBjZW50ZXJbMV1dICsgJyknO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XHRcblxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRiYWNrZ3JvdW5kQ2lyY2xlLm9uKCdtb3VzZXVwJywgZnVuY3Rpb24oKXtcblx0XHRcdC8vc3RvcCBhbmltYXRpb24gb24gbW91c2V1cFxuXHRcdFx0bW91c2VQb3NpdGlvbjA9bnVsbDtcblx0XHR9KTtcblx0fVxufVxuXG5mdW5jdGlvbiBwb3B1bGF0ZVNpZGViYXIocHJvbWlzZSwgY29uZmlnLCBpZCwgY291bnRyeUNvZGUsIGNvdW50cnlOYW1lLCB5ZWFyUmFuZ2UpIHtcblxuXHRwcm9taXNlLmdldChjb25maWcuYmFzZSArICcvYXBpLycgKyBjb3VudHJ5Q29kZSArICcvMjAyMHRvMjAzOScpXG5cdC50aGVuKGZ1bmN0aW9uKGRhdGEpe1xuXHRcdHZhciB5ZWFyVHdlbnR5VGVtcCA9IGRhdGEuY2xpbWF0ZURhdGFbMF0uYW5udWFsRGF0YSAqICg5LzUpICsgMzI7XG5cdFx0eWVhclR3ZW50eVRlbXAgPSBNYXRoLnJvdW5kKHllYXJUd2VudHlUZW1wICogMTAwKSAvIDEwMDtcblxuXHRcdGlmICgheWVhclR3ZW50eVRlbXApIHllYXJUd2VudHlUZW1wID0gJ1Vua25vd24nO1xuXG5cdFx0JCgnI3NpZGViYXInKS5hZGRDbGFzcygnc2hvdy1kYXRhJyk7XG5cdFx0JCgnI3NpZGViYXInKS5odG1sKCcnKTtcblxuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXsvL21ha2Ugc3VyZSBkYXRhIGlzIHJldHVybiBiZWZvcmUgYXBwZW5kaW5nXG5cdFx0XHQkKCcjc2lkZWJhcicpLmFwcGVuZCgnJyArIFxuXHRcdFx0XHQnPHAgaWQ9XCJjbG9zZS1idXR0b25cIj54PC9wPicgK1xuXHRcdFx0XHQnPGgxPicgKyBjb3VudHJ5TmFtZSArICc8L2gxPicgK1xuXHRcdFx0XHQnPHA+VGVtcGVyYXR1cmUgaW4gPHN0cm9uZz4yMDIwLTIwMzk8L3N0cm9uZz46ICcgKyB5ZWFyVHdlbnR5VGVtcCArICcgJiM4NDU3OzwvcD4nKTtcblx0XHR9LCBjb25maWcuc2lkZWJhckRpc3BsYXkpO1xuXG5cdFx0aWYgKCEoeWVhclJhbmdlWzBdID09PSAyMDIwKSkge1xuXHRcdFx0cmV0dXJuIHByb21pc2UuZ2V0KGNvbmZpZy5iYXNlICsgJy9hcGkvJyArIGNvdW50cnlDb2RlICsgJy8nICsgeWVhclJhbmdlWzBdICsgJ3RvJyArIHllYXJSYW5nZVsxXSlcblx0XHR9XG5cdH0pXG5cdC50aGVuKGZ1bmN0aW9uKGN1cnJlbnRUZW1wRGF0YSl7XG5cdFx0aWYgKGN1cnJlbnRUZW1wRGF0YSkge1xuXHRcdFx0Y3VycmVudFRlbXAgPSBjdXJyZW50VGVtcERhdGEuY2xpbWF0ZURhdGFbMF0uYW5udWFsRGF0YSAqICg5LzUpICsgMzI7XG5cdFx0XHRjdXJyZW50VGVtcCA9IE1hdGgucm91bmQoY3VycmVudFRlbXAgKiAxMDApIC8gMTAwO1xuXG5cdFx0XHRpZiAoIWN1cnJlbnRUZW1wKSBjdXJyZW50VGVtcCA9ICdVbmtub3duJzsgXG5cblx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdFx0JCgnI3NpZGViYXInKS5hcHBlbmQoJycgK1xuXHRcdFx0XHRcdCc8cD5UZW1wZXJhdHVyZSBpbiAnICsgeWVhclJhbmdlWzBdICsgJy08c3Ryb25nPicgKyB5ZWFyUmFuZ2VbMV0gKyAnOiAnICsgY3VycmVudFRlbXAgKyAnPC9zdHJvbmc+ICYjODQ1Nzs8L3A+Jyk7XG5cdFx0XHR9LCBjb25maWcuc2lkZWJhckRpc3BsYXkpO1xuXHRcdH1cblx0fSk7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBnZXQgOiBmdW5jdGlvbih1cmwpIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZDMuanNvbih1cmwsIGZ1bmN0aW9uKGVycm9yLCByZXMpe1xuICAgICAgICAgIGlmIChlcnJvcikgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICByZXNvbHZlKHJlcyk7XG4gICAgICAgIH0pXG4gICAgICB9KTtcbiAgICB9XG59XG5cbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHRvcGVuRmFjdHM6IGZ1bmN0aW9uKCl7XG5cdFx0JCgnI3NpZGViYXInKS5vbignY2xpY2snLCAnI3F1ZXN0aW9uLWljb24nLCBmdW5jdGlvbigpe1xuXHRcdFx0JCgnI3NpZGViYXInKS5hZGRDbGFzcygnc2hvdy1mYWN0cycpO1xuXHRcdFx0JCgnI3NpZGViYXInKS5odG1sKCcnKTtcblx0XHRcdC8vcG9wdWxhdGUgc2lkZWJhciB3aXRoIGRlc2NyaXB0aW9uIG9mIGFwcFxuXHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0XHQkKCcjc2lkZWJhcicpLmh0bWwoJycrXG5cdFx0XHRcdFx0JzxwIGlkPVwiY2xvc2UtYnV0dG9uXCI+eDwvcD4nICtcblx0XHRcdFx0XHQnPHA+Q2xpbWF0ZSBNYXAgcHVsbHMgZGF0YSBmcm9tIHRoZSA8YSB0YXJnZXQ9XCJfYmxhbmtcIiBocmVmPVwiaHR0cDovL3d3dy53b3JsZGJhbmsub3JnL2VuL3RvcGljL2NsaW1hdGVjaGFuZ2VcIj5Xb3JsZCBCYW5rPC9hPiBjbGltYXRlIGFwaSB0byBtYWtlIGEgdmlzdWFsaXphdGlvbiBvZiBwcm9qZWN0ZWQgdGVtcGVyYXR1cmUgY2hhbmdlcyBvdmVyIHRoZSBjdXJyZW50IGNlbnR1cnkuIFRoZSB0ZW1wZXJhdHVyZXMgdXNlZCBhcmUgdGFrZW4gZnJvbSB0aGUgPGEgdGFyZ2V0PVwiX2JsYW5rXCIgaHJlZj1cImh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1NwZWNpYWxfUmVwb3J0X29uX0VtaXNzaW9uc19TY2VuYXJpb3NcIj5BMjwvYT4gc2NlbmFyaW8uPHA+JyArIFxuXHRcdFx0XHRcdCc8cD5UbyBtYWtlIHRlbXBlcmF0dXJlIGNoYW5nZSBtb3JlIGV2aWRlbnQsIGEgZGlmZmVyZW50IGNhbGN1bGF0aW9uIGlzIHVzZWQgdG8gZ2VuZXJhdGUgdGhlIGluaXRpYWwgY29sb3JzIHRoYW4gaXMgdXNlZCB0byBkZXBpY3QgdGhlIGNoYW5nZSwgd2hpY2ggZmVhdHVyZXMgZGVlcGVuaW5nIHJlZCB0b25lcyBwZXIgMC41IGRlZ3JlZSBzaGlmdC48L3A+JyArXG5cdFx0XHRcdFx0JzxwPkZvciBtb3JlIGluZm9ybWF0aW9uOjwvcD4nICsgXG5cdFx0XHRcdFx0JzxwPjxhIHRhcmdldD1cIl9ibGFua1wiIGhyZWY9XCJodHRwczovL3d3dy53YXNoaW5ndG9ucG9zdC5jb20vbmV3cy9jYXBpdGFsLXdlYXRoZXItZ2FuZy93cC8yMDE2LzA1LzEwL3RoZS1tb3N0LWNvbXBlbGxpbmctdmlzdWFsLW9mLWdsb2JhbC13YXJtaW5nLWV2ZXItbWFkZS9cIj5IYXdraW5zIFNwaXJhbCBWaXN1YWxpemF0aW9uPC9hPjwvcD4nICsgXG5cdFx0XHRcdFx0JzxwPjxhIHRhcmdldD1cIl9ibGFua1wiIGhyZWY9XCJodHRwOi8vY2xpbWF0ZS5uYXNhLmdvdi9lZmZlY3RzL1wiPk5BU0E8L2E+PC9wPicgK1xuXHRcdFx0XHRcdCc8cD48YSB0YXJnZXQ9XCJfYmxhbmtcIiBocmVmPVwiaHR0cHM6Ly93d3cubmNkYy5ub2FhLmdvdi9pbmRpY2F0b3JzL1wiPk5PQUE8L2E+PC9wPicpO1xuXHRcdFx0fSw1MCk7XG5cdFx0fSk7XG5cdH0sXG5cdGNsb3NlOiBmdW5jdGlvbigpIHtcblx0XHQkKCcjc2lkZWJhcicpLm9uKCdjbGljaycsICcjY2xvc2UtYnV0dG9uJywgZnVuY3Rpb24oKXtcblx0XHRcdCQoJyNzaWRlYmFyJykucmVtb3ZlQ2xhc3MoKTtcblx0XHRcdCQoJyNzaWRlYmFyJykuaHRtbCgnJyk7XG5cblx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdFx0JCgnI3NpZGViYXInKS5odG1sKCc8aDUgaWQ9XCJxdWVzdGlvbi1pY29uXCI+PzwvaDU+JyArXG5cdFx0XHRcdFx0JzxoNSBpZD1cInNoYXJlLWJ1dHRvblwiPmY8L2g1PicpO1x0XHRcblx0XHRcdH0sNTApO1xuXHRcdH0pO1xuXHR9XG59IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdHNldEluaXRpYWxDb2xvcjogZnVuY3Rpb24gKHByb21pc2UsIGNvbmZpZywgc3ZnKSB7XG5cdFx0Y2hhbmdlTWFwQ29sb3IocHJvbWlzZSwgY29uZmlnLCBbMjAyMCwgMjAzOV0sIGZ1bmN0aW9uKHllYXJUd2VudHlUZW1wLCB5ZWFyVHdlbnR5Q29sb3IsIGNvdW50cnlDb2RlKXtcblx0XHRcdFx0c2V0U3ZnRmlsbChzdmcsIGNvbmZpZywgY291bnRyeUNvZGUsIHllYXJUd2VudHlDb2xvcik7XHRcblx0XHR9KTtcblx0fSxcblx0c2V0Q29sb3JXaXRoU2xpZGVyOiBmdW5jdGlvbihwcm9taXNlLCBjb25maWcsIHN2Zykge1xuXHRcdC8vY2hhbmdlIHNhdHVyYXRpb24gb2YgcmVkcyBpbiBtYXAgYXMgdGVtcHMgaW5jcmVtZW50IG9yIGRlY3JlbWVudCB3LyB0aW1lXG5cdFx0JCgnI3llYXItc2VsZWN0b3InKS5jaGFuZ2UoZnVuY3Rpb24oKXtcblx0XHRcdHZhciByYW5nZSA9IGZpbmRZZWFyUmFuZ2UoY29uZmlnKTtcblx0XHRcdCQoJyNzZWxlY3Rvci1sYWJlbCcpLnRleHQocmFuZ2VbMF0gKyAnIC0tICcgKyByYW5nZVsxXSk7XG5cblx0XHRcdGlmIChyYW5nZVswXSA9PT0gMjAyMCkge1xuXHRcdFx0XHRjaGFuZ2VNYXBDb2xvcihwcm9taXNlLCBjb25maWcsIHJhbmdlLCBmdW5jdGlvbih5ZWFyVHdlbnR5VGVtcCwgeWVhclR3ZW50eUNvbG9yLCBjb3VudHJ5Q29kZSl7XG5cdFx0XHRcdFx0c2V0U3ZnRmlsbChzdmcsIGNvbmZpZywgY291bnRyeUNvZGUsIHllYXJUd2VudHlDb2xvcik7XHRcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjaGFuZ2VNYXBDb2xvcihwcm9taXNlLCBjb25maWcsIHJhbmdlLCBmdW5jdGlvbihjdXJyZW50VGVtcCwgY291bnRyeUNvZGUpe1xuXHRcdFx0XHRcdG1ha2VBcGlDYWxsKHByb21pc2UsIGNvbmZpZywgY291bnRyeUNvZGUsIFsyMDIwLCAyMDM5XSwgZnVuY3Rpb24oeWVhclR3ZW50eVRlbXAsIHllYXJUd2VudHlDb2xvciwgY291bnRyeUNvZGUpe1xuXG5cdFx0XHRcdFx0XHR2YXIgdGVtcERpZmYgPSBjdXJyZW50VGVtcCAtIHllYXJUd2VudHlUZW1wLFxuXHRcdFx0XHRcdFx0XHRkaWZmTXVsdCA9IE1hdGguZmxvb3IodGVtcERpZmYvMC41KSxcblx0XHRcdFx0XHRcdFx0Y3VycmVudENvbG9yID0gW3llYXJUd2VudHlDb2xvclswXSsoMTUqZGlmZk11bHQpLCB5ZWFyVHdlbnR5Q29sb3JbMV0sIHllYXJUd2VudHlDb2xvclsyXS0oMTAqZGlmZk11bHQpXTtcblxuXHRcdFx0XHRcdFx0aWYoIWlzTmFOKHllYXJUd2VudHlUZW1wKSkge1xuXHRcdFx0XHRcdFx0XHRzZXRTdmdGaWxsKHN2ZywgY29uZmlnLCBjb3VudHJ5Q29kZSwgY3VycmVudENvbG9yKTtcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fTtcblx0XHR9KTtcblx0fVxufVxuXG5mdW5jdGlvbiBjaGFuZ2VNYXBDb2xvcihwcm9taXNlLCBjb25maWcsIHllYXJSYW5nZSwgY2FsbGJhY2spe1xuXHRwcm9taXNlLmdldChjb25maWcuYmFzZSArICcvbWFwX2RhdGEvY291bnRyeV9jb2Rlcy5qc29uJylcblx0LnRoZW4oZnVuY3Rpb24oY29kZXMpe1xuXHRcdGZvciAoY291bnRyeSBpbiBjb2Rlcykge1xuXHRcdFx0KGZ1bmN0aW9uKGNvdW50cnlDb2RlLCB5ZWFyUmFuZ2Upe1xuXHRcdFx0XHRtYWtlQXBpQ2FsbChwcm9taXNlLCBjb25maWcsIGNvdW50cnlDb2RlLCB5ZWFyUmFuZ2UsIGNhbGxiYWNrKTtcblx0XHRcdH0pKGNvZGVzW2NvdW50cnldLCB5ZWFyUmFuZ2UpO1xuXHRcdH1cblx0fSlcbn07XG5cbmZ1bmN0aW9uIG1ha2VBcGlDYWxsKHByb21pc2UsIGNvbmZpZywgY291bnRyeUNvZGUsIHllYXJSYW5nZSwgY2FsbGJhY2spIHtcblx0cHJvbWlzZS5nZXQoY29uZmlnLmJhc2UgKyAnL2FwaS8nICsgY291bnRyeUNvZGUgKyAnLycgKyB5ZWFyUmFuZ2VbMF0gKyAndG8nICsgeWVhclJhbmdlWzFdKVxuXHQudGhlbihmdW5jdGlvbihkYXRhKXtcblx0XHR2YXIgdGVtcCA9IGRhdGEuY2xpbWF0ZURhdGFbMF0uYW5udWFsRGF0YSAqICg5LzUpICsgMzI7XG5cblx0XHRpZiAoeWVhclJhbmdlWzBdID09PSAyMDIwKSB7XG5cdFx0XHQvL2NyZWF0ZSBiYXNlIGNvbG9yIGZvciAyMDIwXG5cdFx0XHR2YXIgdGVtcERpZmYgPSB0ZW1wIC0gNDIsXG5cdFx0XHRkaWZmTXVsdCA9IE1hdGguZmxvb3IodGVtcERpZmYgLyAyKSxcblx0XHRcdHN0YW5kYXJkQ29sb3IgPSBbMTAxLCAxNDUsIDE3N10sXG5cdFx0XHRuZXdDb2xvciA9IFtzdGFuZGFyZENvbG9yWzBdIC0gKDIgKihkaWZmTXVsdCkpLCBzdGFuZGFyZENvbG9yWzFdIC0gKDQqKGRpZmZNdWx0KSksIHN0YW5kYXJkQ29sb3JbMl0gLSAoNyooZGlmZk11bHQpKV07XG5cblx0XHRcdGNhbGxiYWNrKHRlbXAsIG5ld0NvbG9yLCBjb3VudHJ5Q29kZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNhbGxiYWNrKHRlbXAsIGNvdW50cnlDb2RlKTtcblx0XHR9XG5cdH0pO1xufTtcblxuZnVuY3Rpb24gc2V0U3ZnRmlsbChzdmcsIGNvbmZpZywgY291bnRyeUNvZGUsIGNvbG9yKSB7XG5cdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdHN2Zy5zZWxlY3RBbGwoJy5zdWJ1bml0LicgKyBjb3VudHJ5Q29kZSlcblx0XHRcdFx0LnRyYW5zaXRpb24oKVxuXHRcdFx0XHQuc3R5bGUoJ2ZpbGwnLCBmdW5jdGlvbigpeyByZXR1cm4gJ3JnYignICsgY29sb3JbMF0gKyAnLCAnICsgY29sb3JbMV0gKyAnLCAnICsgY29sb3JbMl0gKyAnKSd9KTtcblx0XHR9LCBjb25maWcuc3ZnRmlsbCk7XG59O1xuXG5mdW5jdGlvbiBmaW5kWWVhclJhbmdlKGNvbmZpZykge1xuXHR2YXIgcmFuZ2VLZXkgPSAkKCcjeWVhci1zZWxlY3RvcicpLnZhbCgpO1x0XG5cdHJldHVybiBjb25maWcueWVhclJhbmdlc1tyYW5nZUtleV07XG59O1xuXG4iXX0=
