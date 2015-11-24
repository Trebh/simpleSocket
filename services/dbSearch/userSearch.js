(function() {

  'use strict';

  var config = require('../../config/config');
  var sql = require('seriate');
  var Task = require('data.task');
  var Async = require('control.async')(Task);
  var Validation = require('data.validation');
  var Success = Validation.Success;
  var Failure = Validation.Failure;
  var R = require('ramda');

  var dbConfig = config.dbConfigConn;
  sql.setDefaultConfig(dbConfig);

  checkDb().fork(handleError, console.log('DB OK'));

  module.exports = {
    userSearch: userSearch,
    validateId: validateId
  };

  function userSearch() {
    var senecaThis = this;
    senecaThis.add('role:main,cmd:search', validateId);
  }

  function validateId(data, respond) {

    findId(data.msg).fork(execError, validateAndRespond);

    function validateAndRespond(results) {
      return new Success(R.curryN(2, function() {
          return results;
        }))
        .ap(isNotEmpty(results))
        .ap(noMoreThanOne(results))
      .cata({
        Failure: function(err) {
          respond(null, {
            failure: err.message
          });
          return err;
        },
        Success: function(res) {
          respond(null, {
            answer: res[0].id
          });
          return res;
        }
      });
    }

    function execError() {
      respond(new Error('ERRORE ESRECUZIONE QUERY'), null);
    }

  }

  function checkDb() {
    return Async.fromPromise(
      sql.execute({
        query: 'SELECT Distinct TABLE_NAME FROM information_schema.TABLES'
      })
    );
  }

  //findId: String -> Success:Failure
  function findId(id) {

    var code = addZerosLeft(id);

    return Async.fromPromise(sql.execute({
      preparedSql: 'SELECT a.id from iscritti a inner join tessererf b on a.tessera = b.idtessera where b.codicerf = @codicerf',
      params: {
        codicerf: {
          val: code,
          type: sql.NVARCHAR
        }
      }
    }));

  }

  function addZerosLeft(num) {

    return R.compose(R.takeLast(20), R.concat('000000000000000'))(num);
  }

  function isNotEmpty(arr) {
    return (arr.length === 0) ? new Failure(new Error([
      'rfid non associato ad alcun id'
    ])) : new Success(arr);
  }

  function noMoreThanOne(arr) {
    return (arr.length > 0 && arr.length !== 1) ? new Failure(new Error([
      'Piu` di un id associato alla tessera'
    ])) : new Success(arr);
  }

  function handleError(err) {
    console.log(err);
    process.exit(1);
  }

})();