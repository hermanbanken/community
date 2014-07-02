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
		return _.collection('bills')
	})

	function ensureOID(id){
		return id instanceof BSON.ObjectID ? id : new BSON.ObjectID(id);
	}

	function Bill(o){
		if(typeof o !== 'object')
			return;

		for(n in o){
			if(!o.hasOwnProperty(n))
				continue;
			
			if(n == 'date' && !(o[n] instanceof Date)){
				this.date = new Date(o[n]);
				continue;
			}

			if(n == 'balances' || n == 'changes'){
				this[n] = toDict(o[n], ensureOID, parseInt);
				continue;
			}

			this[n] = o[n];
		}
	}

	Bill.byId = function(id){
		id = ensureOID(id);
		return C.then(function(_){
			return Q.nfcall(_.findOne.bind(_, { _id: id }));
		}).then(function(i){
			return new Bill(i);
		});
	}

	Bill.find = function(query){
		return C.then(function(_){
			return Q.nfcall(_.find().toArray.bind(_));
		}).then(function(list){
			return list.map(function(i){ return new Bill(i) })
		})
	};

	Bill.types = function(){
		return ["standard", "drink", "activity", "gifts", "food"];
	}

	Bill.prototype.validate = function(){
		if(typeof this.title != 'string' || this.title.length == 0)
			return "title";
		if(typeof this.note != 'string')
			return "note";
		if(!(this.date instanceof Date))
			return "date " + this.date + new Date(this.date);
		return true;
	};

	Bill.prototype.save = function(){
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
				Cache.clear('saldos');
				return id;
			}, function(err){
				console.log("Error", err)
			});
		}.bind(this));		
	};

	return Bill;

};