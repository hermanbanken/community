var moment = require('moment'),
	npm_package = require('../package'),
	_ = require('underscore'),
	lang = require('./translation.nl');

exports.Authenticated = function Authenticated(req, res, next){
	if(req.isAuthenticated()){
		return next();
	}

	// console.warn("Not authenticated");
	// if(true)
	// 	return next();

	if(req.accepts('html'))
		res.redirect('/login');
	else 
		res.send(401, "");
}

exports.WithMenu = function(req, res, next){
	res.locals.appname = npm_package.name.charAt(0).toUpperCase() + npm_package.name.slice(1);
	if(req.user)
		res.locals.menuItems = [{
			path: '/bills',
			title: "Bills",
		},{
			path: '/users',
			title: "Saldi",
		},{
			path: '/accounts',
			title: "Bigbook",
		}];
	next();
};

exports.ViewHelpers = {
	lookup: function(list, key){
		return list && typeof list == 'object' && list[key];
	},
	isEqual: function(a, options){
		if(options.hash.to === a)
			return options.fn(this);
		else
			return options.inverse(this);
	},
	withEmpty: function(options){
		return options.fn({}, { data: options.data });
	},
	eachIncludeParent: function ( context, options ) {
		var fn = options.fn,
				inverse = options.inverse,
				ret = "",
				_context = [];
		if(context)
			_.each(context, function(object, index){
				var _object = _.extend({ "parentContext": options.hash.parent, "key": index }, object);
				ret = ret + fn(_object);
			});
		else
			ret = inverse(this);
		return ret;
	},
	routeClass: function(path){
		return "";
	},
	datef: function(date, format){
		return moment(date).format(format);
	},
	currency: function(number){
		return (typeof number == 'number' || !isNaN(number)) && (number/100).toFixed(2) || "";
	},
	name: function(profile){
		return profile.displayName || profile.name && profile.name.givenName + " " + profile.name.familyName;
	},
	stringify: JSON.stringify,
	t: function(key){
		if(lang[key])
			return lang[key];
		return key;
	},
	rel_date: function(date){
		if(new Date - date > 24 * 3600 * 1000){
			return date.getDate() + "-" + (date.getMonth()+1);
		}
		if(new Date - date > 3600 * 1000){
			return date.getHour() + ":" + (date.getMinutes() > 9 ? '' : "0" + date.getMinutes());
		}
		if(new Date - date > 60 * 1000){
			var m = ~~((new Date - date) / 60000);
			return m + " minute" + (m == 1 ? '' : 's') + " ago";
		}
		else {
			var s = ~~((new Date - date) / 1000);
			return s + " second" + (s == 1 ? '' : 's') + " ago";
		}
	},

	changeFor: function(bill, user){
		return bill.changes && bill.changes[user] || bill.balances && bill.balances[user] || 0;
	},

	gravatar: function(email){
		return "";
	},

	isRole: function(role, user, options){
		if(user && user.tags && user.tags.indexOf(role) >= 0)
			return  options.fn(this);
		else
			return options.inverse(this);
	},

};

exports.WithUser = function WithUser(req, res, next){
	if(req.user)
		res.locals.user = req.user;
	next();
}

exports.WithFlash = function WithFlash(req, res, next){
	if(req.accepts('html')){
		res.flashing = function(type, message, icon){
			if(typeof message == 'undefined'){
				message = type;
				type = 'info';
			}
			
			if(req.session && !req.session.messages)
				req.session.messages = [];

			if(req.session)
			req.session.messages.push({
				type: type,
				message: message,
				icon: icon || 'comment'
			})
			return this;
		}
		res.locals.flash = function(){
			if(req.session && req.session.messages)
				return req.session.messages.shift();
			return false;
		}
	}
	next();
}

exports.WithData = function WithData(req, res, next){
	// Empty body / no data
	if(typeof req.body == 'object' && Object.keys(req.body).length == 0){
		return res
		.flashing('warning', 'Please send some data', 'question')
		.send(400, "No POST data found");
	}
	next();
}