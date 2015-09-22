var Q = require('q')
var lib = require('./lib')
var _ = require("underscore")
var underscore = require("underscore")
var express = require("express")
var BSON = require('mongodb').BSONPure;

// Register end-points that serve both json and html
module.exports = function(ExpressApp, Database, Community){
	var app = ExpressApp,
		router = express.Router(),
		User = require('./Models/user')(Database),
		Bill = require('./Models/bill')(Database),
		Account = require('./Models/account')(Database)

	app.use('/accounts', router);
	router.use(lib.Authenticated);

	// Gets
	router.get('/', handleIndex);
	router.get('/:id', handleSingleAccount)
	// Create new account
	router.post('/', handleAccountSave)
	// Modify existing account
	router.put('/:id', lib.WithData, handleAccountSave)
	router.post('/:id', handleAccountSave)

	function handleIndex(req, res, next){
		console.log("Index");
		Q.all([User.find(), Bill.find(), Account.find()]).spread(function(users, bills, accounts){
			res.render('accounts', {
				title: 'Accounts',
				bills: bills,
				users: users,
				accounts: accounts,
			});
		}).fail(next)
	}

	function handleSingleAccount(req, res, next){
		// Query only bills that the user is involved in
		var bq = { };
		bq["balances."+req.params.id] = { $exists: true, $ne: 0 };
		
		Q.all([
			Account.byId(req.params['id']), 
			Bill.find(bq)
		]).spread(function(account, bills){
			if(req.accepts('html','json') == 'html')	
				res.render('account-form', {
					title: account.name,
					account: account,
					bills: bills,
					editable: true,
				});
			else	
				res.redirect(201, '/accounts/'+id)
			
		}).fail(next)
	}

	function handleAccountSave(req, res, next){
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