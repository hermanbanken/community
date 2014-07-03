var _ = require("underscore"),
	Q = require("q"),
	BSON = require('mongodb').BSONPure,
	Cache = require('../cache'),
	utils = require("../utils");

module.exports = function(Database){
	
	function User(o){
		if(typeof o !== 'object')
			return;

		for(n in o){
			if(!o.hasOwnProperty(n))
				continue;

			this[n] = o[n];
		}

		this.tags = this.tags || [];
	}

	User.byId = function(id){
		return utils.findById(Database, 'users', User, id);
	}

	User.find = function(query){
		return utils.find.bind(utils, Database, 'users', User).apply(arguments).then(function(users){
			return [users, Cache.getOrElse('saldos', utils.saldos.bind(Database))];
		}).spread(function(list, saldos){
			return list.map(function(i){ 
				var v,u = new User(i);
				u.saldo = (v = _.indexBy(saldos, "_id")[i._id]) && v && v.value || 0
				return u;
			})
		})
	};

	User.types = function(){
		return ["standard", "fund"];
	}

	User.prototype.validate = function(){
		return true;
	};

	User.prototype.save = function(){
		return utils.saveModel(Database, 'users', this)	
	};

	return User;

};