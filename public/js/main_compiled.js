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
			for (country in codes) {
				promise.get('/api/' + codes[country] + '/' + range[0] + 'to' + range[1]);
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

	promise.get('/api/' + countryCode + '/2020to2039')
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
			return promise.get('/api/' + countryCode + '/' + yearRange[0] + 'to' + yearRange[1])
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
	promise.get('map_data/country_codes.json')
	.then(function(codes){
		for (country in codes) {
			(function(countryCode, yearRange){
				makeApiCall(promise, config, countryCode, yearRange, callback);
			})(codes[country], yearRange);
		}
	})
};

function makeApiCall(promise, config, countryCode, yearRange, callback) {
	promise.get('/api/' + countryCode + '/' + yearRange[0] + 'to' + yearRange[1])
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9jb25maWcuanMiLCJqcy9mYWNlYm9va19zZGsuanMiLCJqcy9tYWluLmpzIiwianMvbWFwLmpzIiwianMvcHJvbWlzZS5qcyIsImpzL3NpZGVuYXYuanMiLCJqcy90ZW1wX2NhbGMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0gIHtcblx0YmFzZTogJ2h0dHBzOi8vY2xpbWF0ZS12aXMuaGVyb2t1YXBwLmNvbScsXG5cdGNoZWNrTWFwTG9hZGVkOiA3MDAsIC8vaW50ZXJ2YWwgdG8gY2hlY2tcblx0Y29sb3JMb2FkaW5nOiA0MDAwLFxuXHRzdmdGaWxsOiA1MDAsXG5cdHNpZGViYXJEaXNwbGF5OiAzMCxcblx0eWVhclJhbmdlczogW1syMDIwLCAyMDM5XSwgWzIwNDAsIDIwNTldLCBbMjA2MCwgMjA3OV0sIFsyMDgwLCAyMDk5XV1cbn1cblxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdHNoYXJlOiBmdW5jdGlvbih1cmwpe1xuXHRcdC8vc2V0dGluZyB1cCBzZGtcblx0XHR3aW5kb3cuZmJBc3luY0luaXQgPSBmdW5jdGlvbigpIHtcblx0XHRcdCAgICBGQi5pbml0KHtcblx0XHRcdCAgICAgIGFwcElkICAgICAgOiAnMTA2Mjk2NjgyNzExODc3NicsXG5cdFx0XHQgICAgICB4ZmJtbCAgICAgIDogdHJ1ZSxcblx0XHRcdCAgICAgIHZlcnNpb24gICAgOiAndjIuNidcblx0XHRcdCAgICB9KTtcblx0XHRcdCAgfTtcblxuXHRcdChmdW5jdGlvbihkLCBzLCBpZCl7XG5cdFx0XHR2YXIganMsIGZqcyA9IGQuZ2V0RWxlbWVudHNCeVRhZ05hbWUocylbMF07XG5cdFx0XHRpZiAoZC5nZXRFbGVtZW50QnlJZChpZCkpIHtyZXR1cm47fVxuXHRcdFx0anMgPSBkLmNyZWF0ZUVsZW1lbnQocyk7IGpzLmlkID0gaWQ7XG5cdFx0XHRqcy5zcmMgPSBcIi8vY29ubmVjdC5mYWNlYm9vay5uZXQvZW5fVVMvc2RrLmpzXCI7XG5cdFx0XHRmanMucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoanMsIGZqcyk7XG5cdFx0fShkb2N1bWVudCwgJ3NjcmlwdCcsICdmYWNlYm9vay1qc3NkaycpKTtcblxuXHRcdC8vZmFjZWJvb2sgc2hhcmVcblx0XHQkKCcjc2lkZWJhcicpLm9uKCdjbGljaycsICcjc2hhcmUtYnV0dG9uJywgZnVuY3Rpb24oKXtcblx0XHRcdEZCLnVpKHtcblx0XHRcdG1ldGhvZDogJ3NoYXJlJyxcblx0XHRcdGRpc3BsYXk6ICdwb3B1cCcsXG5cdFx0XHRocmVmOiB1cmwsIFxuXHRcdFx0fSwgZnVuY3Rpb24ocmVzcG9uc2Upe30pO1xuXHRcdH0pO1xuXHR9XG59IiwiJCgnYm9keScpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKCl7XG5cbnZhciBjb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZycpLFxuXHRmYlNESyA9IHJlcXVpcmUoJy4vZmFjZWJvb2tfc2RrJyksXG5cdHByb21pc2UgPSByZXF1aXJlKCcuL3Byb21pc2UnKSxcblx0bWFwID0gcmVxdWlyZSgnLi9tYXAnKSxcblx0Y2FsY1RlbXAgPSByZXF1aXJlKCcuL3RlbXBfY2FsYycpLFxuXHRzaWRlTmF2ID0gcmVxdWlyZSgnLi9zaWRlbmF2Jyk7XG5cbi8vRkIgU0hBUkVcbmZiU0RLLnNoYXJlKGNvbmZpZy5iYXNlKTtcblxuLy9DQUNIRSBTT01FIEFQSSBDQUxMUyBPRkYgVEhFIEJBVFxuKGZ1bmN0aW9uKCl7XG5cdGNvbmZpZy55ZWFyUmFuZ2VzLmZvckVhY2goZnVuY3Rpb24ocmFuZ2Upe1xuXHRcdHByb21pc2UuZ2V0KCdtYXBfZGF0YS9jb3VudHJ5X2NvZGVzLmpzb24nKVxuXHRcdC50aGVuKGZ1bmN0aW9uKGNvZGVzKXtcblx0XHRcdGZvciAoY291bnRyeSBpbiBjb2Rlcykge1xuXHRcdFx0XHRwcm9taXNlLmdldCgnL2FwaS8nICsgY29kZXNbY291bnRyeV0gKyAnLycgKyByYW5nZVswXSArICd0bycgKyByYW5nZVsxXSk7XG5cdFx0XHR9XG5cdFx0fSlcblx0fSlcbn0pKCk7XG5cbi8vTE9BRElORyBJQ09OXG5mdW5jdGlvbiByZW1vdmVMb2FkaW5nSWNvbigpIHtcblx0aWYgKCQoJ3BhdGgnKS5sZW5ndGggPT09IDMzNykgey8vYWxsIGNvdW50cmllcyBkcmF3blxuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXsvL2dpdmUgY29sb3JzIHRpbWUgdG8gbG9hZFxuXHRcdFx0JCgnYm9keScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0fSwgY29uZmlnLmNvbG9yTG9hZGluZyk7XG5cdH1cbn1cbnNldEludGVydmFsKHJlbW92ZUxvYWRpbmdJY29uLCBjb25maWcuY2hlY2tNYXBMb2FkZWQpO1xuXG4vL01BUFxudmFyIHN2ZyA9IG1hcC5jcmVhdGVCZygpO1xubWFwLmNyZWF0ZUNvdW50cmllcyhwcm9taXNlLCBjb25maWcpO1xubWFwLmRyYWcoKTtcblxuLy9DT0xPUlNcbmNhbGNUZW1wLnNldEluaXRpYWxDb2xvcihwcm9taXNlLCBjb25maWcsIHN2Zyk7XG5jYWxjVGVtcC5zZXRDb2xvcldpdGhTbGlkZXIocHJvbWlzZSwgY29uZmlnLCBzdmcpO1xuXG4vL1NJREVOQVYgRVZFTlRTXG5zaWRlTmF2Lm9wZW5GYWN0cygpO1xuc2lkZU5hdi5jbG9zZSgpO1xuXG59KTtcblxuXG5cblxuXG5cblxuIiwidmFyIG1vdXNlUG9zaXRpb24wLFxuXHRzdmcsXG5cdHByb2plY3Rpb24sXG5cdHBhdGgsXG5cdGZlYXR1cmUsXG5cdGJhY2tncm91bmRDaXJjbGU7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRjcmVhdGVCZzogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHdpZHRoID0gJCh3aW5kb3cpLndpZHRoKCksXG5cdFx0ICAgIGhlaWdodCA9IDc1MDtcblxuXHRcdC8vY3JlYXRlIFNWR1xuXHRcdHN2ZyA9IGQzLnNlbGVjdCgnI21hcCcpLmFwcGVuZCgnc3ZnJylcblx0XHQgICAgLmF0dHIoJ3dpZHRoJywgd2lkdGgpXG5cdFx0ICAgIC5hdHRyKCdoZWlnaHQnLCBoZWlnaHQpO1xuXG5cdFx0Ly9zZXQgbWFwIHByb3BlcnRpZXNcblx0XHRwcm9qZWN0aW9uID0gZDMuZ2VvU3RlcmVvZ3JhcGhpYygpXG5cdFx0ICAgIC5zY2FsZSgyODApXG5cdFx0ICAgIC5jZW50ZXIoWzAsIDBdKVxuXHRcdCAgICAudHJhbnNsYXRlKFt3aWR0aCAvIDIsIGhlaWdodCAvIDJdKVxuXHRcdCAgICAucm90YXRlKFswLDAsMF0pXG5cdFx0ICAgIC5jbGlwQW5nbGUoMTAwKTtcblxuXHRcdHBhdGggPSBkMy5nZW9QYXRoKClcblx0XHQgICAgLnByb2plY3Rpb24ocHJvamVjdGlvbik7XG5cblx0XHRiYWNrZ3JvdW5kQ2lyY2xlID0gc3ZnLmFwcGVuZChcImNpcmNsZVwiKVxuXHRcdCAgICAuYXR0cignY3gnLCB3aWR0aCAvIDIpXG5cdFx0ICAgIC5hdHRyKCdjeScsIGhlaWdodCAvIDIpXG5cdFx0ICAgIC5hdHRyKCdyJywgMzM1KVxuXHRcdCAgICAuYXR0cignaWQnLCAnYmFja2dyb3VuZC1jaXJjbGUnKTtcblxuXHRcdHJldHVybiBzdmdcblx0fSxcblx0Y3JlYXRlQ291bnRyaWVzOiBmdW5jdGlvbihwcm9taXNlLCBjb25maWcpIHtcblx0XHRwcm9taXNlLmdldCgnbWFwX2RhdGEvbmV3X3dvcmxkLmpzb24nKVxuXHRcdC50aGVuKGZ1bmN0aW9uKHdvcmxkKXtcblx0XHRcdFxuXHRcdFx0dmFyIHN1YnVuaXRzID0gdG9wb2pzb24uZmVhdHVyZSh3b3JsZCwgd29ybGQub2JqZWN0cy5zdWJ1bml0cyk7XG5cdFx0XHQvL2NyZWF0ZSBjb3VudHJpZXMnIHBhdGhzXG5cdFx0XHRmZWF0dXJlID0gc3ZnLnNlbGVjdEFsbCgnLnN1YnVuaXQnKVxuXHRcdFx0ICAgIC5kYXRhKHRvcG9qc29uLmZlYXR1cmUod29ybGQsIHdvcmxkLm9iamVjdHMuc3VidW5pdHMpLmZlYXR1cmVzKVxuXHRcdFx0ICAuZW50ZXIoKS5hcHBlbmQoJ3BhdGgnKVxuXHRcdFx0ICAgIC5hdHRyKCdjbGFzcycsIFxuXHRcdFx0ICAgIFx0ZnVuY3Rpb24gKGQpIHsgXG5cdFx0XHQgICAgXHRcdHJldHVybiAnc3VidW5pdCAnICsgZC5pZC5zcGxpdCgnICcpWzBdOyBcblx0XHRcdCAgICBcdH0pXG5cdFx0XHQgICAgLmF0dHIoJ2lkJywgLy9jbGFzcyBpcyBjb3VudHJ5IGNvZGUgKGZvciBhcGkgY2FsbCksIGlkIGlzIHNwZWNpZmljIHJlZ2lvbiBjb2RlICh0byBnZW5lcmF0ZSBsYWJlbClcblx0XHRcdCAgICBcdGZ1bmN0aW9uIChkKSB7XG5cdFx0XHQgICAgXHRcdHJldHVybiBkLmlkLnNwbGl0KCcgJylbMV0gPyBkLmlkLnNwbGl0KCcgJylbMV0gOiBkLmlkLnNwbGl0KCcgJylbMF07XG5cdFx0XHQgICAgXHR9KVxuXHRcdFx0ICAgIC5hdHRyKCdkJywgcGF0aCk7XG5cblx0XHRcdC8vY3JlYXRlIGxhYmVsc1xuXHRcdFx0bGFiZWwgPSBzdmcuc2VsZWN0QWxsKCcuc3VidW5pdC1sYWJlbCcpXG5cdFx0XHRcdC5kYXRhKHRvcG9qc29uLmZlYXR1cmUod29ybGQsIHdvcmxkLm9iamVjdHMuc3VidW5pdHMpLmZlYXR1cmVzKVxuXHRcdFx0LmVudGVyKCkuYXBwZW5kKCd0ZXh0Jylcblx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ3N1YnVuaXQtbGFiZWwnKVxuXHRcdFx0XHQuYXR0cignaWQnLCBcblx0XHRcdCAgICBcdGZ1bmN0aW9uIChkKSB7XG5cdFx0XHQgICAgXHRcdHJldHVybiBkLmlkLnNwbGl0KCcgJylbMV0gPyBkLmlkLnNwbGl0KCcgJylbMV0gOiBkLmlkLnNwbGl0KCcgJylbMF07XG5cdFx0XHQgICAgXHR9KVxuXHRcdFx0XHQuYXR0cigndHJhbnNmb3JtJywgZnVuY3Rpb24oZCkgeyBcblx0XHRcdFx0XHR2YXIgY2VudGVyID0gcGF0aC5jZW50cm9pZChkKTtcblx0XHRcdFx0XHQvL2FkanVzdCBmb3IgbGVmdCBvZmZzZXRcblx0XHRcdFx0XHRpZiAoIWlzTmFOKGNlbnRlclswXSkpe1xuXHRcdFx0XHRcdFx0cmV0dXJuICd0cmFuc2xhdGUoJyArIFtjZW50ZXJbMF0gLSAyMCwgY2VudGVyWzFdXSArICcpJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5hdHRyKCdkeScsICcuMWVtJylcblx0XHRcdFx0LnN0eWxlKCdmaWxsJywgJ2JsYWNrJylcblx0XHRcdFx0LnN0eWxlKCdkaXNwbGF5JywgJ25vbmUnKVxuXHRcdFx0XHQudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLnByb3BlcnRpZXMubmFtZTsgfSk7XG5cblx0XHRcdC8vZGlzcGxheSBsYWJlbHMgb24gaG92ZXJcblx0XHRcdHN2Zy5zZWxlY3RBbGwoJy5zdWJ1bml0Jylcblx0XHRcdFx0Lm9uKCdtb3VzZWVudGVyJywgZnVuY3Rpb24oKXsgXG5cdFx0XHRcdFx0c3ZnLnNlbGVjdCgnLnN1YnVuaXQtbGFiZWwjJyArIHRoaXMuaWQpXG5cdFx0XHRcdFx0XHQuc3R5bGUoJ2Rpc3BsYXknLCAnYmxvY2snKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0Lm9uKCdtb3VzZWxlYXZlJywgZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRzdmcuc2VsZWN0KCcuc3VidW5pdC1sYWJlbCMnICsgdGhpcy5pZClcblx0XHRcdFx0XHRcdC5zdHlsZSgnZGlzcGxheScsICdub25lJyk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5vbignY2xpY2snLCBmdW5jdGlvbigpeyAvL21heWJlIHNlcGFyYXRlIG91dCB0aGlzIHNlY3Rpb24gdG9vXG5cdFx0XHRcdFx0dmFyIGlkID0gdGhpcy5pZCxcblx0XHRcdFx0XHRcdGNvdW50cnlDb2RlID0gJCh0aGlzKS5hdHRyKCdjbGFzcycpLnNwbGl0KCcgJylbMV0sXG5cdFx0XHRcdFx0XHRjb3VudHJ5TmFtZSA9ICQoJy5zdWJ1bml0LWxhYmVsIycgKyBpZCkudGV4dCgpLFxuXHRcdFx0XHRcdFx0cmFuZ2UgPSBjb25maWcueWVhclJhbmdlc1skKCcjeWVhci1zZWxlY3RvcicpLnZhbCgpXTtcblxuXHRcdFx0XHRcdHBvcHVsYXRlU2lkZWJhcihwcm9taXNlLCBjb25maWcsIGlkLCBjb3VudHJ5Q29kZSwgY291bnRyeU5hbWUsIHJhbmdlKTtcblx0XHRcdFx0fSk7XG5cdFx0fSlcblx0fSxcblx0ZHJhZyA6IGZ1bmN0aW9uKCl7XG5cdFx0YmFja2dyb3VuZENpcmNsZS5vbignbW91c2Vkb3duJywgZnVuY3Rpb24oKXtcblx0XHRcdG1vdXNlUG9zaXRpb24wID0gW2QzLmV2ZW50LnBhZ2VYLCBkMy5ldmVudC5wYWdlWV07XG5cdFx0fSk7XG5cblx0XHRiYWNrZ3JvdW5kQ2lyY2xlLm9uKCdtb3VzZW1vdmUnLCBmdW5jdGlvbigpe1xuXHRcdFx0aWYgKG1vdXNlUG9zaXRpb24wKSB7XG5cdFx0XHRcdHZhciBjdXJyZW50Q2VudGVyID0gcHJvamVjdGlvbi5yb3RhdGUoKSxcblx0XHRcdFx0XHRtb3VzZVBvc2l0aW9uMSA9IFtkMy5ldmVudC5wYWdlWCwgZDMuZXZlbnQucGFnZVldLFxuXHRcdFx0XHRcdG5ld0NlbnRlciA9IFtjdXJyZW50Q2VudGVyWzBdICsgKG1vdXNlUG9zaXRpb24wWzBdLW1vdXNlUG9zaXRpb24xWzBdKSAvIDgsIGN1cnJlbnRDZW50ZXJbMV0gKyAobW91c2VQb3NpdGlvbjFbMV0tbW91c2VQb3NpdGlvbjBbMV0pIC8gOF07XG5cblx0XHRcdFx0Ly9zZXQgcm90YXRlIGFjY29yZGluZyB0byBtb3VzZSBldmVudFxuXHRcdFx0ICAgIHByb2plY3Rpb24ucm90YXRlKFstbmV3Q2VudGVyWzBdLCAtbmV3Q2VudGVyWzFdLCAwXSk7XG5cdFx0XHQgICAgLy9yZXJlbmRlciBwYXRoIHVzaW5nIG5ldyBwcm9qZWN0aW9uXG5cdFx0XHRcdGZlYXR1cmUuYXR0cignZCcsIGQzLmdlb1BhdGgoKS5wcm9qZWN0aW9uKHByb2plY3Rpb24pKTtcblx0XHRcdFx0Ly9yZXJlbmRlciBsYWJlbHNcblx0XHRcdFx0bGFiZWwuYXR0cigndHJhbnNmb3JtJywgZnVuY3Rpb24oZCkgeyBcblx0XHRcdFx0XHR2YXIgY2VudGVyID0gcGF0aC5jZW50cm9pZChkKTtcblx0XHRcdFx0XHRpZiAoIWlzTmFOKGNlbnRlclswXSkpe1xuXHRcdFx0XHRcdFx0cmV0dXJuICd0cmFuc2xhdGUoJyArIFtjZW50ZXJbMF0gLSAyMCwgY2VudGVyWzFdXSArICcpJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1x0XG5cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0YmFja2dyb3VuZENpcmNsZS5vbignbW91c2V1cCcsIGZ1bmN0aW9uKCl7XG5cdFx0XHQvL3N0b3AgYW5pbWF0aW9uIG9uIG1vdXNldXBcblx0XHRcdG1vdXNlUG9zaXRpb24wPW51bGw7XG5cdFx0fSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gcG9wdWxhdGVTaWRlYmFyKHByb21pc2UsIGNvbmZpZywgaWQsIGNvdW50cnlDb2RlLCBjb3VudHJ5TmFtZSwgeWVhclJhbmdlKSB7XG5cblx0cHJvbWlzZS5nZXQoJy9hcGkvJyArIGNvdW50cnlDb2RlICsgJy8yMDIwdG8yMDM5Jylcblx0LnRoZW4oZnVuY3Rpb24oZGF0YSl7XG5cdFx0dmFyIHllYXJUd2VudHlUZW1wID0gZGF0YS5jbGltYXRlRGF0YVswXS5hbm51YWxEYXRhICogKDkvNSkgKyAzMjtcblx0XHR5ZWFyVHdlbnR5VGVtcCA9IE1hdGgucm91bmQoeWVhclR3ZW50eVRlbXAgKiAxMDApIC8gMTAwO1xuXG5cdFx0aWYgKCF5ZWFyVHdlbnR5VGVtcCkgeWVhclR3ZW50eVRlbXAgPSAnVW5rbm93bic7XG5cblx0XHQkKCcjc2lkZWJhcicpLmFkZENsYXNzKCdzaG93LWRhdGEnKTtcblx0XHQkKCcjc2lkZWJhcicpLmh0bWwoJycpO1xuXG5cdFx0c2V0VGltZW91dChmdW5jdGlvbigpey8vbWFrZSBzdXJlIGRhdGEgaXMgcmV0dXJuIGJlZm9yZSBhcHBlbmRpbmdcblx0XHRcdCQoJyNzaWRlYmFyJykuYXBwZW5kKCcnICsgXG5cdFx0XHRcdCc8cCBpZD1cImNsb3NlLWJ1dHRvblwiPng8L3A+JyArXG5cdFx0XHRcdCc8aDE+JyArIGNvdW50cnlOYW1lICsgJzwvaDE+JyArXG5cdFx0XHRcdCc8cD5UZW1wZXJhdHVyZSBpbiA8c3Ryb25nPjIwMjAtMjAzOTwvc3Ryb25nPjogJyArIHllYXJUd2VudHlUZW1wICsgJyAmIzg0NTc7PC9wPicpO1xuXHRcdH0sIGNvbmZpZy5zaWRlYmFyRGlzcGxheSk7XG5cblx0XHRpZiAoISh5ZWFyUmFuZ2VbMF0gPT09IDIwMjApKSB7XG5cdFx0XHRyZXR1cm4gcHJvbWlzZS5nZXQoJy9hcGkvJyArIGNvdW50cnlDb2RlICsgJy8nICsgeWVhclJhbmdlWzBdICsgJ3RvJyArIHllYXJSYW5nZVsxXSlcblx0XHR9XG5cdH0pXG5cdC50aGVuKGZ1bmN0aW9uKGN1cnJlbnRUZW1wRGF0YSl7XG5cdFx0aWYgKGN1cnJlbnRUZW1wRGF0YSkge1xuXHRcdFx0Y3VycmVudFRlbXAgPSBjdXJyZW50VGVtcERhdGEuY2xpbWF0ZURhdGFbMF0uYW5udWFsRGF0YSAqICg5LzUpICsgMzI7XG5cdFx0XHRjdXJyZW50VGVtcCA9IE1hdGgucm91bmQoY3VycmVudFRlbXAgKiAxMDApIC8gMTAwO1xuXG5cdFx0XHRpZiAoIWN1cnJlbnRUZW1wKSBjdXJyZW50VGVtcCA9ICdVbmtub3duJzsgXG5cblx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdFx0JCgnI3NpZGViYXInKS5hcHBlbmQoJycgK1xuXHRcdFx0XHRcdCc8cD5UZW1wZXJhdHVyZSBpbiAnICsgeWVhclJhbmdlWzBdICsgJy08c3Ryb25nPicgKyB5ZWFyUmFuZ2VbMV0gKyAnOiAnICsgY3VycmVudFRlbXAgKyAnPC9zdHJvbmc+ICYjODQ1Nzs8L3A+Jyk7XG5cdFx0XHR9LCBjb25maWcuc2lkZWJhckRpc3BsYXkpO1xuXHRcdH1cblx0fSk7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBnZXQgOiBmdW5jdGlvbih1cmwpIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZDMuanNvbih1cmwsIGZ1bmN0aW9uKGVycm9yLCByZXMpe1xuICAgICAgICAgIGlmIChlcnJvcikgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICByZXNvbHZlKHJlcyk7XG4gICAgICAgIH0pXG4gICAgICB9KTtcbiAgICB9XG59XG5cbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHRvcGVuRmFjdHM6IGZ1bmN0aW9uKCl7XG5cdFx0JCgnI3NpZGViYXInKS5vbignY2xpY2snLCAnI3F1ZXN0aW9uLWljb24nLCBmdW5jdGlvbigpe1xuXHRcdFx0JCgnI3NpZGViYXInKS5hZGRDbGFzcygnc2hvdy1mYWN0cycpO1xuXHRcdFx0JCgnI3NpZGViYXInKS5odG1sKCcnKTtcblx0XHRcdC8vcG9wdWxhdGUgc2lkZWJhciB3aXRoIGRlc2NyaXB0aW9uIG9mIGFwcFxuXHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0XHQkKCcjc2lkZWJhcicpLmh0bWwoJycrXG5cdFx0XHRcdFx0JzxwIGlkPVwiY2xvc2UtYnV0dG9uXCI+eDwvcD4nICtcblx0XHRcdFx0XHQnPHA+Q2xpbWF0ZSBNYXAgcHVsbHMgZGF0YSBmcm9tIHRoZSA8YSB0YXJnZXQ9XCJfYmxhbmtcIiBocmVmPVwiaHR0cDovL3d3dy53b3JsZGJhbmsub3JnL2VuL3RvcGljL2NsaW1hdGVjaGFuZ2VcIj5Xb3JsZCBCYW5rPC9hPiBjbGltYXRlIGFwaSB0byBtYWtlIGEgdmlzdWFsaXphdGlvbiBvZiBwcm9qZWN0ZWQgdGVtcGVyYXR1cmUgY2hhbmdlcyBvdmVyIHRoZSBjdXJyZW50IGNlbnR1cnkuIFRoZSB0ZW1wZXJhdHVyZXMgdXNlZCBhcmUgdGFrZW4gZnJvbSB0aGUgPGEgdGFyZ2V0PVwiX2JsYW5rXCIgaHJlZj1cImh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1NwZWNpYWxfUmVwb3J0X29uX0VtaXNzaW9uc19TY2VuYXJpb3NcIj5BMjwvYT4gc2NlbmFyaW8uPHA+JyArIFxuXHRcdFx0XHRcdCc8cD5UbyBtYWtlIHRlbXBlcmF0dXJlIGNoYW5nZSBtb3JlIGV2aWRlbnQsIGEgZGlmZmVyZW50IGNhbGN1bGF0aW9uIGlzIHVzZWQgdG8gZ2VuZXJhdGUgdGhlIGluaXRpYWwgY29sb3JzIHRoYW4gaXMgdXNlZCB0byBkZXBpY3QgdGhlIGNoYW5nZSwgd2hpY2ggZmVhdHVyZXMgZGVlcGVuaW5nIHJlZCB0b25lcyBwZXIgMC41IGRlZ3JlZSBzaGlmdC48L3A+JyArXG5cdFx0XHRcdFx0JzxwPkZvciBtb3JlIGluZm9ybWF0aW9uOjwvcD4nICsgXG5cdFx0XHRcdFx0JzxwPjxhIHRhcmdldD1cIl9ibGFua1wiIGhyZWY9XCJodHRwczovL3d3dy53YXNoaW5ndG9ucG9zdC5jb20vbmV3cy9jYXBpdGFsLXdlYXRoZXItZ2FuZy93cC8yMDE2LzA1LzEwL3RoZS1tb3N0LWNvbXBlbGxpbmctdmlzdWFsLW9mLWdsb2JhbC13YXJtaW5nLWV2ZXItbWFkZS9cIj5IYXdraW5zIFNwaXJhbCBWaXN1YWxpemF0aW9uPC9hPjwvcD4nICsgXG5cdFx0XHRcdFx0JzxwPjxhIHRhcmdldD1cIl9ibGFua1wiIGhyZWY9XCJodHRwOi8vY2xpbWF0ZS5uYXNhLmdvdi9lZmZlY3RzL1wiPk5BU0E8L2E+PC9wPicgK1xuXHRcdFx0XHRcdCc8cD48YSB0YXJnZXQ9XCJfYmxhbmtcIiBocmVmPVwiaHR0cHM6Ly93d3cubmNkYy5ub2FhLmdvdi9pbmRpY2F0b3JzL1wiPk5PQUE8L2E+PC9wPicpO1xuXHRcdFx0fSw1MCk7XG5cdFx0fSk7XG5cdH0sXG5cdGNsb3NlOiBmdW5jdGlvbigpIHtcblx0XHQkKCcjc2lkZWJhcicpLm9uKCdjbGljaycsICcjY2xvc2UtYnV0dG9uJywgZnVuY3Rpb24oKXtcblx0XHRcdCQoJyNzaWRlYmFyJykucmVtb3ZlQ2xhc3MoKTtcblx0XHRcdCQoJyNzaWRlYmFyJykuaHRtbCgnJyk7XG5cblx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdFx0JCgnI3NpZGViYXInKS5odG1sKCc8aDUgaWQ9XCJxdWVzdGlvbi1pY29uXCI+PzwvaDU+JyArXG5cdFx0XHRcdFx0JzxoNSBpZD1cInNoYXJlLWJ1dHRvblwiPmY8L2g1PicpO1x0XHRcblx0XHRcdH0sNTApO1xuXHRcdH0pO1xuXHR9XG59IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdHNldEluaXRpYWxDb2xvcjogZnVuY3Rpb24gKHByb21pc2UsIGNvbmZpZywgc3ZnKSB7XG5cdFx0Y2hhbmdlTWFwQ29sb3IocHJvbWlzZSwgY29uZmlnLCBbMjAyMCwgMjAzOV0sIGZ1bmN0aW9uKHllYXJUd2VudHlUZW1wLCB5ZWFyVHdlbnR5Q29sb3IsIGNvdW50cnlDb2RlKXtcblx0XHRcdFx0c2V0U3ZnRmlsbChzdmcsIGNvbmZpZywgY291bnRyeUNvZGUsIHllYXJUd2VudHlDb2xvcik7XHRcblx0XHR9KTtcblx0fSxcblx0c2V0Q29sb3JXaXRoU2xpZGVyOiBmdW5jdGlvbihwcm9taXNlLCBjb25maWcsIHN2Zykge1xuXHRcdC8vY2hhbmdlIHNhdHVyYXRpb24gb2YgcmVkcyBpbiBtYXAgYXMgdGVtcHMgaW5jcmVtZW50IG9yIGRlY3JlbWVudCB3LyB0aW1lXG5cdFx0JCgnI3llYXItc2VsZWN0b3InKS5jaGFuZ2UoZnVuY3Rpb24oKXtcblx0XHRcdHZhciByYW5nZSA9IGZpbmRZZWFyUmFuZ2UoY29uZmlnKTtcblx0XHRcdCQoJyNzZWxlY3Rvci1sYWJlbCcpLnRleHQocmFuZ2VbMF0gKyAnIC0tICcgKyByYW5nZVsxXSk7XG5cblx0XHRcdGlmIChyYW5nZVswXSA9PT0gMjAyMCkge1xuXHRcdFx0XHRjaGFuZ2VNYXBDb2xvcihwcm9taXNlLCBjb25maWcsIHJhbmdlLCBmdW5jdGlvbih5ZWFyVHdlbnR5VGVtcCwgeWVhclR3ZW50eUNvbG9yLCBjb3VudHJ5Q29kZSl7XG5cdFx0XHRcdFx0c2V0U3ZnRmlsbChzdmcsIGNvbmZpZywgY291bnRyeUNvZGUsIHllYXJUd2VudHlDb2xvcik7XHRcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjaGFuZ2VNYXBDb2xvcihwcm9taXNlLCBjb25maWcsIHJhbmdlLCBmdW5jdGlvbihjdXJyZW50VGVtcCwgY291bnRyeUNvZGUpe1xuXHRcdFx0XHRcdG1ha2VBcGlDYWxsKHByb21pc2UsIGNvbmZpZywgY291bnRyeUNvZGUsIFsyMDIwLCAyMDM5XSwgZnVuY3Rpb24oeWVhclR3ZW50eVRlbXAsIHllYXJUd2VudHlDb2xvciwgY291bnRyeUNvZGUpe1xuXG5cdFx0XHRcdFx0XHR2YXIgdGVtcERpZmYgPSBjdXJyZW50VGVtcCAtIHllYXJUd2VudHlUZW1wLFxuXHRcdFx0XHRcdFx0XHRkaWZmTXVsdCA9IE1hdGguZmxvb3IodGVtcERpZmYvMC41KSxcblx0XHRcdFx0XHRcdFx0Y3VycmVudENvbG9yID0gW3llYXJUd2VudHlDb2xvclswXSsoMTUqZGlmZk11bHQpLCB5ZWFyVHdlbnR5Q29sb3JbMV0sIHllYXJUd2VudHlDb2xvclsyXS0oMTAqZGlmZk11bHQpXTtcblxuXHRcdFx0XHRcdFx0aWYoIWlzTmFOKHllYXJUd2VudHlUZW1wKSkge1xuXHRcdFx0XHRcdFx0XHRzZXRTdmdGaWxsKHN2ZywgY29uZmlnLCBjb3VudHJ5Q29kZSwgY3VycmVudENvbG9yKTtcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fTtcblx0XHR9KTtcblx0fVxufVxuXG5mdW5jdGlvbiBjaGFuZ2VNYXBDb2xvcihwcm9taXNlLCBjb25maWcsIHllYXJSYW5nZSwgY2FsbGJhY2spe1xuXHRwcm9taXNlLmdldCgnbWFwX2RhdGEvY291bnRyeV9jb2Rlcy5qc29uJylcblx0LnRoZW4oZnVuY3Rpb24oY29kZXMpe1xuXHRcdGZvciAoY291bnRyeSBpbiBjb2Rlcykge1xuXHRcdFx0KGZ1bmN0aW9uKGNvdW50cnlDb2RlLCB5ZWFyUmFuZ2Upe1xuXHRcdFx0XHRtYWtlQXBpQ2FsbChwcm9taXNlLCBjb25maWcsIGNvdW50cnlDb2RlLCB5ZWFyUmFuZ2UsIGNhbGxiYWNrKTtcblx0XHRcdH0pKGNvZGVzW2NvdW50cnldLCB5ZWFyUmFuZ2UpO1xuXHRcdH1cblx0fSlcbn07XG5cbmZ1bmN0aW9uIG1ha2VBcGlDYWxsKHByb21pc2UsIGNvbmZpZywgY291bnRyeUNvZGUsIHllYXJSYW5nZSwgY2FsbGJhY2spIHtcblx0cHJvbWlzZS5nZXQoJy9hcGkvJyArIGNvdW50cnlDb2RlICsgJy8nICsgeWVhclJhbmdlWzBdICsgJ3RvJyArIHllYXJSYW5nZVsxXSlcblx0LnRoZW4oZnVuY3Rpb24oZGF0YSl7XG5cdFx0dmFyIHRlbXAgPSBkYXRhLmNsaW1hdGVEYXRhWzBdLmFubnVhbERhdGEgKiAoOS81KSArIDMyO1xuXG5cdFx0aWYgKHllYXJSYW5nZVswXSA9PT0gMjAyMCkge1xuXHRcdFx0Ly9jcmVhdGUgYmFzZSBjb2xvciBmb3IgMjAyMFxuXHRcdFx0dmFyIHRlbXBEaWZmID0gdGVtcCAtIDQyLFxuXHRcdFx0ZGlmZk11bHQgPSBNYXRoLmZsb29yKHRlbXBEaWZmIC8gMiksXG5cdFx0XHRzdGFuZGFyZENvbG9yID0gWzEwMSwgMTQ1LCAxNzddLFxuXHRcdFx0bmV3Q29sb3IgPSBbc3RhbmRhcmRDb2xvclswXSAtICgyICooZGlmZk11bHQpKSwgc3RhbmRhcmRDb2xvclsxXSAtICg0KihkaWZmTXVsdCkpLCBzdGFuZGFyZENvbG9yWzJdIC0gKDcqKGRpZmZNdWx0KSldO1xuXG5cdFx0XHRjYWxsYmFjayh0ZW1wLCBuZXdDb2xvciwgY291bnRyeUNvZGUpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjYWxsYmFjayh0ZW1wLCBjb3VudHJ5Q29kZSk7XG5cdFx0fVxuXHR9KTtcbn07XG5cbmZ1bmN0aW9uIHNldFN2Z0ZpbGwoc3ZnLCBjb25maWcsIGNvdW50cnlDb2RlLCBjb2xvcikge1xuXHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRzdmcuc2VsZWN0QWxsKCcuc3VidW5pdC4nICsgY291bnRyeUNvZGUpXG5cdFx0XHRcdC50cmFuc2l0aW9uKClcblx0XHRcdFx0LnN0eWxlKCdmaWxsJywgZnVuY3Rpb24oKXsgcmV0dXJuICdyZ2IoJyArIGNvbG9yWzBdICsgJywgJyArIGNvbG9yWzFdICsgJywgJyArIGNvbG9yWzJdICsgJyknfSk7XG5cdFx0fSwgY29uZmlnLnN2Z0ZpbGwpO1xufTtcblxuZnVuY3Rpb24gZmluZFllYXJSYW5nZShjb25maWcpIHtcblx0dmFyIHJhbmdlS2V5ID0gJCgnI3llYXItc2VsZWN0b3InKS52YWwoKTtcdFxuXHRyZXR1cm4gY29uZmlnLnllYXJSYW5nZXNbcmFuZ2VLZXldO1xufTtcblxuIl19
