var Q = require('q'),
	express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io')(server),
	passport = require('passport'),
	package = require("./package.json"),
	partials = require("express-partials"),
	MongoClient = require('mongodb').MongoClient,
	bodyParser = require("body-parser"),
	expressSession = require("express-session"),
	MongoStore = require('connect-mongo')(expressSession);

var dbPromise = Q.nfcall(
    MongoClient.connect,
    process.env.MONGOLAB_URI || package.config.mongouri);

function start(db)
{
	app
	  .use(bodyParser.urlencoded({ extended: true }))
	  .use(bodyParser.json())
	  .use(require("cookie-parser")())
	  .use(expressSession({ 
	  	secret: 'changeme', 
	  	saveUninitialized: true, 
	  	resave: true,
	  	store: new MongoStore({ db: db })
	  }))
	  .use(passport.initialize())
	  .use(passport.session());

	require("./js/site")(app, dbPromise);
	require("./js/google-auth")(app, dbPromise);
	require("./js/api-users")(app, dbPromise);
	require("./js/api-bills")(app, dbPromise);
	require("./js/api-accounts")(app, dbPromise);

	// Default error handler
	app.use(function errorHandler(err, req, res, next) {
	  res.send(500, err);
	})

	app.use(express.static(__dirname + '/public'));

	/** Start the server **/
	server.listen(process.env.PORT || package.config.port);
	console.log("Started on port "+(process.env.PORT || package.config.port));
}

dbPromise.then(start).fail(console.error);

// Make statics cachable on production
/*	var oneYear = 31557600000;
	app.use(express.static(__dirname + '/public', { maxAge: oneYear }));
	app.use(express.errorHandler());
*/

if(require.main === module) {
	console.log("Starting Community API and site on port "+(process.env.PORT || package.config.port));
} else {
	exports.community = Q.all(db);
	exports.express = app;
	exports.server = server;
	exports.config = package.config;
	exports.db = db;
}