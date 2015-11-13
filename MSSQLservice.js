'use strict';

var sql = require("seriate");
var when = require('when');
var config = require('./config/config');

function testDB() {

    console.log(JSON.stringify(config));
    var dbConfig = config.dbConfigConn;

    sql.setDefaultConfig(dbConfig);
    return when.promise(function(resolve, reject) {
        sql.execute({
            query: "SELECT * FROM INFORMATION_SCHEMA.TABLES"
        }).then(function(results) {
            resolve(results);
        }, function(err) {
            reject(err);
        });
    });

}

exports.testDB = testDB;