(function() {

  'use strict';

  var Task = require('data.task');
  var Async = require('control.async')(Task);
  var sql = require('seriate');
  var config = require('../../config/config');

  var dbConfig = config.dbConfigConn;
  sql.setDefaultConfig(dbConfig);

  module.exports = {
    getConfig: getConfig
  };

  function getConfig() {

    return getConfigFromDB();

  }

   function getConfigFromDB() {
    return Async.fromPromise(sql.execute({
      preparedSql: 'select * ' +
        'from ImpostazioniTerminali where codice =\'001\' ',
    }));
  }

})();