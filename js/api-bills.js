var Q = require('q')
var package = require("../package.json")
var lib = require('./lib')
var _ = require("underscore")
var express = require("express")
var BSON = require('mongodb').BSONPure;

// Register end-points that serve both json and html
var exports = function(ExpressApp, Database){
	var app = ExpressApp,
		router = express.Router(),
		User = require('./Models/user')(Database),
		Bill = require('./Models/bill')(Database),
		Account = require('./Models/account')(Database)

	function all(){
		return Bill.then(function(_){
			return Q.nfcall(_.find({}).sort({ date: 1 }).toArray.bind(_));
		});
	}

	app.use('/bills', router);
	router.use(lib.Authenticated);

	// Delete
	router.get("/:id/delete", handleDeleteSingle)
	router.delete("/:id", handleDeleteSingle)
	// Gets
	router.get('/', index.bind(this, all));
	router.get('/:id', single)
	// Create new bill
	router.post('/', handleBillSave)
	// Modify existing bill
	router.put('/:id', handleBillSave)
	router.post('/:id', handleBillSave)

	function index(all, req, res, next){ 
		var bills = Bill.find().then(function(bills){
			if(req.accepts('html','json') == 'html')		
				res.render('bills', {
					title: 'Bills',
					bills: bills,
				});
			else 
				res.send(200, bills);
		}).fail(next);
	}

	function handleDeleteSingle(req, res, next){
		if(!req.params['id'])
			return next();

		if(req.user.tags.indexOf("admin") >= 0){
			Bill.byId(req.params['id']).then(function(bill){
				return bill.delete();
			}).then(function(){
				res.redirect('/bills/');
			}).done();
		} else next();
	}

	function handleBillSave(req, res, next){
		var b = new Bill(req.body);
		(b).save().then(function(id){
			if(typeof id == 'undefined')
				throw new Error("No id!");
			
			if(req.accepts('html','json') == 'html')	
				res.redirect('/bills/'+id)
			else	
				res.redirect(201, '/bills/'+id)
		}).fail(next)
	}

	function single(req, res, next){
		if(!req.params['id'])
			return next();

		var bill = req.params['id'] == 'create' ? new Bill() : Bill.byId(req.params['id']);

		renderSingle(bill, req, res, next);
	}

	function renderSingle(bill, req, res, next){
		var users = User.find();
		var accounts = Account.find();
		
		Q.all([users, accounts, bill]).spread(function(users, accounts, bill){
			if(req.accepts('html','json') == 'html')		
				res.render('bill-form', {
					bill: bill,
					users: users,
					accounts: accounts,
					title: 'Bill ' + bill.title,
					billTypes: Bill.types(),	
				})
			else
				res.send(200, bill);
		}).fail(next);
	}
}

module.exports = exports;