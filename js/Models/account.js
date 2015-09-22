var _ = require("underscore"),
	Q = require("q"),
	BSON = require('mongodb').BSONPure,
	Cache = require('../cache'),
	utils = require("../utils");

module.exports = function(Database){

	function Account(o){
		if(typeof o !== 'object')
			return;

		for(var n in o){
			if(!o.hasOwnProperty(n))
				continue;

			this[n] = o[n];
		}
	}

	Account.byId = function(id){
		return utils.findById(Database, 'accounts', Account, id);
	}

	Account.find = function(query){
		return utils.find.bind(utils, Database, 'accounts', Account).apply(arguments).then(function(accounts){
			return [accounts, Cache.getOrElse('saldos', utils.saldos.bind(utils, Database))];
		}).spread(function(list, saldos){
			return list.map(function(i){ 
				var v,u = new Account(i);
				u.saldo = (v = _.indexBy(saldos, "_id")[i._id]) && v && v.value || 0
				return u;
			})
		})
	};

	Account.types = function(){
		return ["standard", "fund"];
	}

	Account.prototype.validate = function(){
		return true;
	};

	Account.prototype.save = function(){
		return utils.saveModel(Database, 'accounts', this);		
	};

	return Account;

};