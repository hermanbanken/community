var _ = require("underscore"),
	Q = require("q"),
	BSON = require('mongodb').BSONPure,
	Cache = require('../cache');

module.exports = function(Database){
	
	function toDict(input, keyF, valueF){
		var ret = {};
		for(n in input){
			ret[keyF(n)] = valueF(input[n]);
		}
		return ret;
	}

	var C = Database.then(function(_){
		return _.collection('users')
	})

	function ensureOID(id){
		return id instanceof BSON.ObjectID ? id : new BSON.ObjectID(id);
	}

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
		id = ensureOID(id);
		return C.then(function(_){
			return Q.nfcall(_.findOne.bind(_, { _id: id }));
		}).then(function(i){
			return new User(i);
		});
	}

	User.find = function(query){
		return C.then(function(_){
			return Q.nfcall(_.find().toArray.bind(_));
		}).then(function(users){
			return [users, Cache.getOrElse('saldos', saldos)];
		}).spread(function(list, saldos){
			return list.map(function(i){ 
				var u = new User(i);
				u.saldo = _.indexBy(saldos, "_id")[i._id].value || 0
				return u;
			})
		})
	};

	User.types = function(){
		return ["standard", "fund"];
	}

	function saldos(){
		return Database.then(function(_){
			var c = _.collection('bills');
			return Q.nfcall(c.mapReduce.bind(c), function(){
				for(n in this.changes)
					emit(n, this.changes[n]);
				for(n in this.balances)
					emit(n, this.balances[n]);
			}, function(key, values){
				return Array.sum(values);
			}, {
				out: { inline: 1 }
			});
		}).catch(function(err){
			console.error(err);
		})
	};

	User.prototype.validate = function(){
		return true;
	};

	User.prototype.save = function(){
		return Q.fcall(function () {
			// validate
			if(this.validate() !== true)
				throw new Error(this.validate());
			return true;
		}.bind(this)).then(function(){
			// Prepare document
			this.lastModified = new Date;
			var doc = { 
				$set: _.clone(this), 
				$setOnInsert: { createdAt: new Date }
			},
			id = this._id && new BSON.ObjectID(this._id) || new BSON.ObjectID(),
			query = { _id: id };
			delete doc['$set']._id;

			// Execute update
			return C.then(function(_){
				return Q.nfcall(_.findAndModify.bind(_, query, [], doc, { upsert: true }))
			}).then(function(result){
				return id;
			}, function(err){
				console.log("Error", err)
			});
		}.bind(this));		
	};

	return User;

};