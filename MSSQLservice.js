'use strict';

var sql = require("seriate");
var when = require('when');

function testDB(){
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