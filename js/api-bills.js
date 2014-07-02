var Q = require('q')
var package = require("../package.json")
var lib = require('./lib')
var _ = require("underscore")
var BSON = require('mongodb').BSONPure;

// Register end-points that serve both json and html
var exports = function(ExpressApp, Database){
	var app = ExpressApp,
		User = Database.then(function(_){
			return _.collection('users');
		}),
		Bill = require('./Models/bill')(Database),
		Account = require('./Models/account')(Database),
		Accounts = Database.then(function(_){
			return _.collection('accounts')
		})

	function all(){
		return Bill.then(function(_){
			return Q.nfcall(_.find({}).sort({ date: 1 }).toArray.bind(_));
		});
	}

	app.get('/bills', index.bind(this, all))

	app.get('/bills/:id', single)
	
	// Create new bill
	app.post('/bills', handleBillSave)
	// Modify existing bill
	app.put('/bills/:id', handleBillSave)
	app.post('/bills/:id', handleBillSave)

	function index(all, req, res){
		var bills = Bill.find().then(function(bills){
			if(req.accepts('html','json') == 'html')		
				res.render('bills', {
					title: 'Bills',
					bills: bills,
				});
			else 
				res.send(200, bills);
		}).catch(function(err){
			console.log(err);
			res.send(500, "An error occured");
		});
	}


	function handleBillSave(req, res){
		(new Bill(req.body)).save().then(function(id){
			if(req.accepts('html','json') == 'html')	
				res.redirect('/bills/'+id)
			else	
				res.redirect(201, '/bills/'+id)
		}, function(err){
			res.send(400, err.message);
		})
	}

	function single(req, res, next){
		if(!req.params['id'])
			return next();

		var users = User.then(function(_){
			return Q.nfcall(_.find().toArray.bind(_));
		});

		var accounts = Account.find();

		var bill = req.params['id'] == 'create' ? { bill : new Bill() } : Bill.byId(req.params['id']);

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
		}).catch(function(err){
			console.error(err);
			res.send(500);
		});
	}
}

module.exports = exports;