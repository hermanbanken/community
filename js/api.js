var Q = require('q')
var package = require("../package.json")
var lib = require('./lib')
var _ = require("underscore")
var underscore = require("underscore")
var BSON = require('mongodb').BSONPure;

// Register end-points that serve both json and html
module.exports = function(ExpressApp, Database){
	var app = ExpressApp,
		User = Database.then(function(_){
			return _.collection('users');
		}),
		User = require('./Models/user')(Database),
		Bill = require('./Models/bill')(Database),
		Account = require('./Models/account')(Database)


	app.get('/users', function(req, res){
		Q.all([User.find(), Account.find()]).spread(function(users, accounts){
			res.render('users', {
				title: 'Users',
				users: users,
				accounts: accounts,
			});
		}, function(err){
			console.error(err.stack);
			res.send(500);
		})
	})

	app.get('/users/:id', function(req, res){
		Q.all([User.byId(req.params['id']), Bill.find({ changes: {$elemMatch: req.params['id']}})]).spread(function(user, bills){
			res.render('user-form', {
				title: user.profile.name.givenName + ' - Users',
				user: user,
				bills: bills,
				editable: true,
				userTypes: User.types(),
			});
		}, function(err){
			console.error(err.stack);
			res.send(500);
		})
	})

	// Create new bill
	app.post('/users', lib.WithData, handleUserSave)
	// Modify existing bill
	app.put('/users/:id', lib.WithData, handleUserSave)
	app.post('/users/:id', /*lib.Authenticated, */lib.WithData, handleUserSave)

	function handleUserSave(req, res){
		var data = { profile: req.body.profile };
		console.log("Saving", data);
		if(req.params.id)
			data._id = req.params.id;

		(new User({ profile: req.body.profile })).save().then(function(id){
			if(req.accepts('html','json') == 'html')	
				res.redirect('/users/'+id)
			else	
				res.redirect(201, '/users/'+id)
		}, function(err){
			res.send(400, err.message);
		})
	}

	/*app.post('/user', lib.Authenticated, lib.WithData, function(req, res){
		if(req.body && req.body.profile && req.body.profile.displayName)
			req.user.profile.displayName = req.body.profile.displayName;
	
		var doc = {
			profile: req.user.profile,
		}
	
		console.info("Updating user", req.user._id, doc);
	
		User.then(function(_){
			return Q.nfcall(_.update.bind(_, { _id: req.user._id }, {$set: doc}));
		}).then(function(result){
			if(req.accepts('html','json') == 'html')
				res
					.flashing('success', 'We\'ve updated your settings', 'setting')
					.redirect('/user');
			else 
				res.send(200, "");
		}).catch(function(err){
			console.log(err);
			res
    			.flashing('error', 'Something went wrong', 'bug')
				.send(500, "Something went wrong");
		})
	})*/

	app.get('/users', function(req, res){
		res.render('index', {
			title: 'Users',
		});
	})

}