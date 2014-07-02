var Q = require('q');

var cache = {};
var cachePromise = {};

module.exports = {
	getOrElse: function(key, orElse){
		if(cache[key])
			return Q.fcall(function(){ return cache[key]; });
		
		if(cachePromise[key])
			return cachePromise[key];

		cachePromise[key] = orElse().then(function(r){
			cache[key] = r;
			delete cachePromise[key];
			return r;
		});

		return cachePromise[key];
	},
	set: function(key, value){
		cache[key] = value;
	},
	clear: function(key){
		if(key){
			delete cache[key];
			delete cachePromise[key];
		} else {
			cache = {};
			cachePromise = {};
		}
	}
};