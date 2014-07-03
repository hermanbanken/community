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
		User = require('./Models/user')(Database),
		Bill = require('./Models/bill')(Database),
		Account = require('./Models/account')(Database)

	app.use('/accounts', router);

	// Gets
	router.get('/', handleIndex);
	router.get('/:id', handleSingleUser)
	// Create new account
	router.post('/', lib.Authenticated, handleUserSave)
	// Modify existing account
	router.put('/:id', lib.Authenticated, lib.WithData, handleUserSave)
	router.post('/:id', lib.Authenticated, handleUserSave)

	function handleIndex(req, res, next){
		Q.all([User.find(), Bill.find(), Account.find()]).spread(function(users, bills, accounts){
			res.render('accounts', {
				title: 'Accounts',
				bills: bills,
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
		Account.byId(req.param.id || req.body.id).then(function(account){ 
			account.name = req.body.name;
			return account.save();
		}).then(function(id){
			if(req.accepts('html','json') == 'html')	
				res.redirect('/accounts/'+id)
			else	
				res.redirect(201, '/accounts/'+id)
		}).fail(next);		
	}
}