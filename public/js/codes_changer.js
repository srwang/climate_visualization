//change outdated ids (ISO3) in downloaded map data
//keeping ids consistent with ISO3 and adding a second "unique ID" for regions that have ISO3 overlap

// var fs = require('fs');

// fs.readFile('../map_data/country_codes.json', 'utf8', function (err, data) {
// 	if (err) throw err;

// 	var officialCodes = JSON.parse(data);

// 	fs.readFile('../map_data/world.json', 'utf8', function (error, worldData) {
// 		if (error) throw error;

// 		var worldData = JSON.parse(worldData);
// 		mapCodes = worldData.objects.subunits.geometries;

// 		var allCodes = {};

// 		mapCodes.forEach(function(mapCode) {
// 			if (officialCodes[mapCode.properties.name] && officialCodes[mapCode.properties.name] !== mapCode.id) {
// 				console.log('rewriting ' + mapCode.properties.name);
// 				mapCode.id = officialCodes[mapCode.properties.name];
// 			}

// 			if(allCodes[mapCode.id]) {
// 				console.log('writing a unique id');
// 				allCodes[mapCode.id]++;
// 				mapCode.id = mapCode.id + ' ' + mapCode.id + '-' + allCodes[mapCode.id];
// 			} else {
// 				allCodes[mapCode.id] = 1;	
// 			}
// 		});

// 		worldData.objects.subunits.geometries = mapCodes;

// 		fs.writeFile('../map_data/new_world.json', JSON.stringify(worldData));
// 	});
// });
