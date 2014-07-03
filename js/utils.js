var _ = require("underscore"),
	Q = require("q"),
	BSON = require('mongodb').BSONPure,
	Cache = require('./cache')

function ensureOID(id, nullIsNew){
	if (id instanceof BSON.ObjectID)
		return id;

	if(!id && nullIsNew)
		return new BSON.ObjectID();

	try {
		return new BSON.ObjectID(id);
	} catch(e){
		console.log("Not an ID", id, typeof id);
	}
}
function dbCollection(dbQ, collectionName){
	if(!dbQ)
		throw new Error("Without database we can't do anything");
	if(dbQ.then)
		return dbQ.then(function(_){
			return _.collection(collectionName)
		})
	if(dbQ.collection)
		return Q.fcall(function(){ 
			return dbQ.collection(collectionName); 
		});
	throw new Error("Incompatible database given");
};

module.exports = {
	ensureOID: ensureOID,

	toDict: function toDict(input, keyF, valueF){
		var ret = {};
		for(n in input){
			ret[keyF(n)] = valueF(input[n]);
		}
		return ret;
	},

	saldos: function saldos(dbQ){
		return dbCollection(dbQ, 'bills').then(function(c){
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
		})
	},

	findById: function findById(db, collection, modelType, id){
		id = ensureOID(id);
		return dbCollection(db, collection).then(function(_){
			return Q.nfcall(_.findOne.bind(_), { _id: id });
		}).then(function(i){
			return new modelType(i);
		})
	},

	find: function find(db, collection, modelType){
		var args = Array.prototype.slice.call(arguments, 3);
		return dbCollection(db, collection).then(function(_){
			return Q.nfcall(_.find.apply(_, args).toArray.bind(_));
		}).then(function(list){
			return list.map(function(i){ return new modelType(i) })
		})
	},

	saveModel: function saveModel(db, collection, model){
		var id = ensureOID(model._id);

		return Q.fcall(function () {
			// validate
			if(model.validate() !== true)
				throw new Error(model.validate());
			return true;
		}).then(function(){
			return dbCollection(db, collection);
		}).then(function(mongo){
			// Prepare document
			model.lastModified = new Date;
			var doc = {
					$set: _.clone(model), 
					$setOnInsert: { createdAt: new Date }
				},
				query = { _id: id };
			
			delete doc['$set'].createdAt;
			delete doc['$set']._id;

			// Execute update	
			return Q.nfcall(mongo.findAndModify.bind(mongo, query, [], doc, { upsert: true }))
		}).then(function(result){
			return id;
		})
	}
};