var _ = require("underscore"),
	Q = require("q"),
	BSON = require('mongodb').BSONPure,
	Cache = require('../cache'),
	utils = require("../utils");

module.exports = function(Database){

	function Bill(o){
		if(typeof o !== 'object')
			return;

		for(var n in o){
			if(!o.hasOwnProperty(n))
				continue;
			
			if(n == 'date' && !(o[n] instanceof Date)){
				this.date = new Date(o[n]);
				continue;
			}

			if(n == 'balances' || n == 'changes'){
				var r = utils.dictFilter(
					utils.toDict(o[n], utils.ensureOID, parseInt), 
					null,
					function(v){ return typeof v == 'number' && !isNaN(v); }
				);
				this[n] = r;
				continue;
			}

			this[n] = o[n];
		}
	}

	Bill.byId = utils.findById.bind(utils, Database, 'bills', Bill);
	Bill.find = function(){
		return utils.findAndSort.bind(utils, Database, 'bills', Bill).call(utils, arguments, [{ date: -1 }]);
	}

	Bill.types = function(){
		return ["standard", "deposit", "activity"];
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
		var diff = utils.sum(this.changes) - utils.sum(this.balances);

		if(diff > this.changes.length || diff < -1 * this.changes.length)
			throw new Error("Not entered correctly! Difficiency is " + diff + " cents");

		return utils.saveModel(Database, 'bills', this)
			.then(function(id){	
				Cache.clear('saldos');
				return id;
			})
	};

	Bill.prototype.delete = function(){
		return utils.trashModel(Database, 'bills', this)
			.then(function(id){
				Cache.clear('saldos');
				return id;
			})
	};

	return Bill;

};