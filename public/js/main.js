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







