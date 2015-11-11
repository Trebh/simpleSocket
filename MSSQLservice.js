'use strict';

var sql = require("seriate");
var when = require('when');

function testDB(){
    var config = {  
    "name": "SQLEXPRESS",
    "server": "192.168.0.2\\SQLEXPRESS",
    "user": "kg",
    "password": "kg",
    "database": "keepergym",
    "port": "1433",
    "pool": {
        "max": 10,
        "min": 4,
        "idleTimeoutMillis": 30000
    }
};

sql.setDefaultConfig( config );
	return when.promise(function (resolve,reject){
		sql.execute( {  
        query: "SELECT * FROM INFORMATION_SCHEMA.TABLES"
    }).then( function( results ) {
        resolve(results);
    }, function( err ) {
        reject(err);
    });
	});
	
}

exports.testDB = testDB;   