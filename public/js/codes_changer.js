//read from country codes, world.json 
//if country name matches but country code does not, change country code in world.json

var fs = require('fs');

fs.readFile('../map_data/country_codes.json', 'utf8', function (err, data) {
	if (err) throw err;

	var officialCodes = JSON.parse(data);

	fs.readFile('../map_data/world.json', 'utf8', function (error, worldData) {
		if (error) throw error;

		var worldData = JSON.parse(worldData);
		mapCodes = worldData.objects.subunits.geometries;

		mapCodes.forEach(function(mapCode) {
			if (officialCodes[mapCode.properties.name] && officialCodes[mapCode.properties.name] !== mapCode.id) {
				console.log('rewriting ' + mapCode.properties.name);
				mapCode.id = officialCodes[mapCode.properties.name];
			}
		})

		worldData.objects.subunits.geometries = mapCodes;

		fs.writeFile('../map_data/new_world.json', JSON.stringify(worldData));

		//check before writing
	});
});