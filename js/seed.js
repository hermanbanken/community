var Q = require('q')
var package = require("../package.json")
var lib = require('./lib')
var _ = require("underscore")
var express = require("express")
var BSON = require('mongodb').BSONPure;

// Register end-points that serve both json and html
var exports = function(ExpressApp, Database){
	var app = ExpressApp,
		router = express.Router()

	var users = [
		["Firstname", "Lastname", "User1", "user1@example.org", ["tag1"]],
		["Tim", "Test", "User2", "user2@example.org", ["tag1", "tag2"]],
	];
	
	users.forEach(function(user){
		Database.then(function(db){
			db.collection("users").findAndModify({ 
				"profile.emails.value": user[3]
	    	}, [], { 
	    		$set: {
	    			"profile.name": {
						givenName: user[0], 
						familyName: user[1], 
					},
					"profile.displayName": user[2]
				},
		    	$setOnInsert: {
					"profile.emails": [{ value: user[3] }],
					tags: user[4],
			    	createdAt: new Date,
			    }
			}, { upsert: true, new: true }, function(err, user) {
				if(err) console.error(err);
		    	else console.info("Seeded", user);
		    })
	  	})
	})
}

module.exports = exports;