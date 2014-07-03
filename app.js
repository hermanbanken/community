var Q = require('q'),
	express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io')(server),
	passport = require('passport'),
	package = require("./package.json"),
	partials = require("express-partials"),
	MongoClient = require('mongodb').MongoClient;

var db = Q.nfcall(
    MongoClient.connect,
    process.env.MONGOLAB_URI || package.config.mongouri);

app
  .use(require("body-parser")())
  .use(require("cookie-parser")())
  .use(require("express-session")({ secret: 'changeme'} ))
  .use(passport.initialize())
  .use(passport.session());

require("./js/site")(app, db);
require("./js/google-auth")(app, db);
require("./js/api-users")(app, db);
require("./js/api-bills")(app, db);
require("./js/api-accounts")(app, db);

// Make statics cachable on production
/*	var oneYear = 31557600000;
	app.use(express.static(__dirname + '/public', { maxAge: oneYear }));
	app.use(express.errorHandler());
*/

app.use(express.static(__dirname + '/public'));

// Default error handler
app.use(function errorHandler(err, req, res, next) {
  res.send(500, err);
})

/** Start the server **/
server.listen(process.env.PORT || package.config.port);

if(require.main === module) {
	console.log("Starting Community API and site on port "+(process.env.PORT || package.config.port));
	db.then(function(){
		console.log("Started on port "+(process.env.PORT || package.config.port))
	})
} else {
	exports.community = Q.all(db);
	exports.express = app;
	exports.server = server;
	exports.config = package.config;
	exports.db = db;
}