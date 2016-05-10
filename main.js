console.log('linked');



//get api data
//create a range slider
//create basic map (3-D globe or flat visuals)
//figure out visualization (layering colors? changing the interface?)

var startYear = 2010,
	endYear = 2016;

d3.request('http://climatedataapi.worldbank.org/climateweb/rest/v1/country/annualanom/tas/' + startYear + '/' + endYear + '/ISO3', function(err, json){
	if (err) console.warn(err);
	console.log(json);
})