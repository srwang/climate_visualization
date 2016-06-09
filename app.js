//create route for main
//make sure all static assets connected correctly

var express = require('express');
var app = express();
var request = require('request');
var bodyParser = require('body-parser');
var urlencodedBodyParser = bodyParser.urlencoded({extended: false});
var ejs = require('ejs');

app.use(urlencodedBodyParser);
app.set('view_engine', 'ejs');
app.use(express.static('public'));

app.get('/', function (req, res){
	res.redirect('map');
});

app.get('/map', function (req, res){
	res.render('main.html.ejs');
});

//server
app.get('*', function(req, res, next) {
  var err = new Error();
  err.status = 404;
  next(err);
});

app.listen('3000', function(){
	console.log("Listening on port 3000!");
})