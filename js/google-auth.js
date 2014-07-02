var Q = require('q'),
	passport = require('passport'),
	GoogleStrategy = require('passport-google').Strategy,
	package = require("../package.json"),
	ObjectId = require('mongodb').ObjectID;

module.exports = function(ExpressApp, Database){
	var app = ExpressApp,
		User = Database.then(function(_){
			return _.collection('users')
		})
	
	var hostname = process.env.HOSTNAME || package.config.hostname || require('os').hostname();
	var port = process.env.HEROKU_PUBLIC_PORT || process.env.PORT || package.config.port || 80;

	passport.use(new GoogleStrategy({
	    returnURL: 'http://'+hostname+':'+port+'/auth/google/return',
	    realm: 'http://'+hostname+':'+port+'/'
	  },
	  function(identifier, profile, done) {
	  	User.then(function(c){
	    	c.findAndModify({ openId: identifier }, [], { $set: {
		    	openId: identifier,
		    	"profile.emails": profile.emails,
		    	"profile.name": profile.name, 	
		    }}, { upsert: true, new: true }, function(err, user) {
		      done(err, user);
		    })
	  	})
	  }
	));

	passport.serializeUser(function(user, done) {
	  done(null, user._id);
	});

	passport.deserializeUser(function(id, done) {
	  User.then(function(c){
	  	c.findOne({ _id: new ObjectId(id) }, function (err, user) {
	    	done(err, user);
	  	})
	  })
	});

	app.get('/auth/google', function(req, res, next){
	  return passport.authenticate('google')(req, res, function(e){
	    console.log("Return from Google");
	    next();
	  });
	});
	app.get('/auth/google/return', passport.authenticate('google', { successRedirect: '/', failureRedirect: '/' }));

	app.get('/logout', function(req, res){
	  req.logout();
	  res.redirect('/');
	});
}