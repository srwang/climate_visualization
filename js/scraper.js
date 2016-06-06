var request = require('request'),
  cheerio = require('cheerio'),
  fs = require('fs'),
  url = 'http://unstats.un.org/unsd/tradekb/Knowledgebase/Country-Code';
  
request(url, function (error, response, body) {
	if (!error) {
		var $ = cheerio.load(body),
			countryCodes = {},
			text = $('#ctl00_ctlContentPlaceHolder_ctl00_ctl00_ctl00_ctl00_ctlPanelBar_tblArticle > div.col-9 > div.row.article.margin-top').html();


		text = text.substring(text.indexOf('&#xA0;<br>\r\n') + 12, text.indexOf('bwe ') + 4);
		text = text.split(' <br>\r\n');
		  
		for (var i=0; i<text.length; i++) {
			var countryCode = text[i].split(/ (.+)?/)[0],
				countryName = text[i].split(/ (.+)?/)[1];

			countryCodes[countryName] = countryCode;
		};

		//console.log(countryCodes);

		fs.writeFile('../map_data/country_codes.json', JSON.stringify(countryCodes), function (error){
			if (error) {
				console.log(error);
			}
		});

	} else {
		console.log('We’ve encountered an error: ' + error);
	}
});