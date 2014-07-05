var Q = require('q')
var package = require("../package.json")
var lib = require('./lib')
var _ = require("underscore")
var underscore = require("underscore")
var express = require("express")
var BSON = require('mongodb').BSONPure;

// Register end-points that serve both json and html
module.exports = function(ExpressApp, Database){
	var app = ExpressApp,
		router = express.Router(),
		User = Database.then(function(_){
			return _.collection('users');
		}),
		User = require('./Models/user')(Database),
		Bill = require('./Models/bill')(Database),
		Account = require('./Models/account')(Database)

	app.use('/users', router);
	router.use(lib.Authenticated)

	// Gets
	router.get('/', handleIndex);
	router.get('/:id', handleSingleUser)
	// Create new user
	router.post('/', handleUserSave)
	// Modify existing user
	router.put('/:id', lib.WithData, handleUserSave)
	router.post('/:id', handleUserSave)

	function handleIndex(req, res, next){
		Q.all([User.find(), Account.find()]).spread(function(users, accounts){
			res.render('users', {
				title: 'Users',
				users: users,
				accounts: accounts,
			});
		}).fail(next)
	}

	function handleSingleUser(req, res, next){
		// Query only bills that the user is involved in
		var bq = { };
		bq["changes."+req.params.id] = { $exists: true, $ne: 0 };
		
		Q.all([
			User.byId(req.params['id']), 
			Bill.find(bq)
		]).spread(function(user, bills){
			if(req.accepts('html','json') == 'html')	
				res.render('user-form', {
					title: user.profile && user.profile.name.givenName + ' - Users',
					user: user,
					bills: bills,
					editable: true,
					userTypes: User.types(),
				});
			else	
				res.redirect(201, '/users/'+id)
			
		}).fail(next)
	}

	function handleUserSave(req, res, next){
		User.byId(req.param.id || req.body.id).then(function(user){ 
			user.profile = req.body.profile;
			user.tags = req.body.tags;
			user.type = req.body.type;
			return user.save();
		}).then(function(id){
			if(req.accepts('html','json') == 'html')	
				res.redirect('/users/'+id)
			else	
				res.redirect(201, '/users/'+id)
		}).fail(next);		
	}

}