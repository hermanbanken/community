var Q = require('q'),
	passport = require('passport'),
	GoogleStrategy = require('passport-google-oauth').OAuth2Strategy,
	package = require("../package.json"),
	ObjectId = require('mongodb').ObjectID;

module.exports = function(ExpressApp, Database){
	var app = ExpressApp,
		User = Database.then(function(_){
			return _.collection('users')
		})
	
	var hostname = process.env.HOSTNAME || package.config.hostname || require('os').hostname();
	var port = process.env.HEROKU_PUBLIC_PORT || process.env.PORT || package.config.port || 80;
	var callbackurl = 'http://'+hostname+':'+port+'/auth/google/return';

	passport.use(new GoogleStrategy({
	    clientID: process.env.GOOGLE_CLIENTID || package.config.google.clientid,
	    clientSecret: process.env.GOOGLE_SECRET || package.config.google.secret,
	    callbackURL: callbackurl,
	  },
	  function(identifier, other, profile, done) {
	  	User.then(function(c){
	    	c.findAndModify({ $or: [
	    		{ openId: identifier }, 
	    		{ "profile.emails.value": profile.emails[0].value }
	    	]}, [], { 
	    		$set: {
		 			lastLogin: new Date,
		    	}, 
		    	$addToSet: { 
		    		openId: identifier,
		    		"profile.emails": { $each: profile.emails },
		    	},
		    	$setOnInsert: {
			    	createdAt: new Date,
			    	"profile.name": profile.name,
			    	"profile.displayName": profile.displayName,
		    	}
			}, { upsert: false, new: true }, function(err, user) {
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
	  return passport.authenticate('google', { scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile' })(req, res, function(e){
	    next();
	  });
	});
	app.get('/auth/google/return', passport.authenticate('google', { successRedirect: '/', failureRedirect: '/' }));

	app.get('/logout', function(req, res){
	  req.logout();
	  res.redirect('/');
	});
}