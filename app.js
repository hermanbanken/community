var Q = require('q'),
	events = require('events'),
	express = require('express'),
	http = require('http'),
	passport = require('passport'),
	npm_package = require("./package.json"),
	partials = require("express-partials"),
	MongoClient = require('mongodb').MongoClient,
	bodyParser = require("body-parser"),
	expressSession = require("express-session"),
	MongoStore = require('connect-mongo')(expressSession);

function scripts(Community){
	return function(req, res, next){
		res.locals.scripts = Community.scripts;
		next();
	};
}

function Community(){
	events.EventEmitter.call(this);

	this.package = npm_package;
	this.app = express();
	this.server = http.createServer(this.app);
	this.config = npm_package.config;
	this.io = require('socket.io')(this.server),
	this.db = false;
	this.lib = require('./js/lib');
	this.scripts = [
		"/js/vendor/jquery.min.js",
		"/js/vendor/underscore-min.js",
		"/js/vendor/bootstrap-3.2.0/js/bootstrap.min.js",
		"/js/vendor/q.js",
		"/js/community.js",
	];

	// Start DB
	console.info("Connecting to mongodb "+process.env.MONGO_URI || npm_package.config.mongouri);
	var dbPromise = this.dbPromise = Q.nfcall(
	  MongoClient.connect,
	  process.env.MONGO_URI || npm_package.config.mongouri
	);

	// Models
	this.User = require('./js/Models/user')(dbPromise);
	this.Bill = require('./js/Models/bill')(dbPromise);
	this.Account = require('./js/Models/account')(dbPromise);

	// Start plugins
	this.plugins = (npm_package.config.plugins || []).map((function(plugin){
	  var p = require(plugin);
		typeof p == "function" && p(this) || (p.init && p.init(this));
	  return p;
	}).bind(this));

	// When db ready
	dbPromise.then(this.dbReady.bind(this)).fail(console.error);
}

Community.prototype.__proto__ = events.EventEmitter.prototype;

Community.prototype.dbReady = function(db){
	this.emit('dbReady');
	this.db = db;
	this.start(db);
}

Community.prototype.start = function(db){
	this.emit("start", this);

	var app = this.app, dbPromise = this.dbPromise;

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
		.use(passport.session())
		.use(scripts(this));

	// Start core modules
	this.emit('modules');
	[
		"seed",
		"site",
		"google-auth",
		"api-users",
		"api-bills",
		"api-accounts"
	].forEach((function(name){
		this.emit('module', name);
		require("./js/"+name)(app, dbPromise, this);
	}).bind(this));

	this.emit('plugin-modules');

	// Default error handler
	app.use(function errorHandler(err, req, res, next) {
		console.error(err);
		res.send(500, JSON.stringify({error: err, stack: err.stack.split("\n") }));
	});

	this.emit('statics');
	app.use(express.static(__dirname + '/public'));

	// Make statics cachable on production
	/*  var oneYear = 31557600000;
	  app.use(express.static(__dirname + '/public', { maxAge: oneYear }));
	  app.use(express.errorHandler());
	*/

	/** Start the server **/
	this.server.listen(process.env.PORT || npm_package.config.port);
	console.info("Started on port "+(process.env.PORT || npm_package.config.port));
	this.emit('started');
};

var c = new Community();

if(require.main === module) {
	console.log("Starting Community API and site on port "+(process.env.PORT || npm_package.config.port)+ " using hostname '"+(process.env.HOSTNAME || npm_package.config.hostname)+"'");
} else {
	exports.community = c;
}