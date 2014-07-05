var partials = require('express-partials')
var hbrs = require('express3-handlebars')
var passport = require('passport')
var lib = require('./lib')
var Q = require("q");

var Handlebars = hbrs.create({
	helpers: lib.ViewHelpers,
	defaultLayout: 'main'
})

Handlebars.loadPartials(function (err, partials) {
    // => { 'foo.bar': [Function],
    // =>    title: [Function] }
})

module.exports = function Site(ExpressApp, Database){
	var app = ExpressApp;
	
	app.engine('handlebars', Handlebars.engine);
	app.set('view engine', 'handlebars');
	app.set('views', __dirname+'/../views');
	app.use(partials());

	var User = require('./Models/user')(Database),
		Bill = require('./Models/bill')(Database);

	app.use(lib.WithUser);
	app.use(lib.WithMenu);
	app.use(lib.WithFlash);

	app.get('/', lib.Authenticated, function(req, res, next){
		// Load data
		Q.all([Bill.find(), User.find()]).spread(function(bills, users){
			res.render('index', {
				title: 'Home',
				bills: bills,
				users: users,
			});
		}).fail(next);
	})

	app.get('/login', function(req, res){
		res.render('login', {
			title: 'Login',
			providers: ['google']
		});
	});

	app.post('/signin', function(req, res){
		if(req.body && req.body.provider){
			return res.redirect('/auth/'+req.body.provider.replace(/[^a-z]/gi, "-"));
		}
		res.render('signin', {
			title: 'Sign in',
		})
	})

	app.get('/signout', lib.Authenticated, function(req, res){
		req.logout();
		res
			.flashing('info', 'You\'ve signed out', 'info')
	    	.redirect('/');
	})

	app.get('/user', lib.Authenticated, function(req, res){
		res.render('dashboard', { 
			title: "Dashboard",
			user: req.user,
		})
	})
}