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

    var validationObj = data.msg;

    var answer = validationObj.isFailure() ? validationObj: isIdValid(validationObj.get());

    respond(null, {
      idgiocatore: answer
    });
    return answer.getOrElse('?');
  }

  function checkDb() {
    return Async.fromPromise(
      sql.execute({
        query: 'SELECT * FROM INFORMATION_SCHEMA.TABLES'
      })
    );
  }

  //findId: String -> Success:Failure
  function findId(id) {

    var code = addZerosLeft(id);

    sql.execute({
      preparedSql: 'SELECT a.id from iscritti a inner join tessererf b on a.tessera = b.idtessera where b.codicerf = @codicerf',
      params: {
        id: {
          val: code,
          type: sql.VARCHAR
        }
      }
    }).then(function(res) {
      return new Success(res);
    }).catch(function(err) {
      return new Failure(['errore nel recupero id da codice rfid: ' + err]);
    });

  }

  function addZerosLeft() {
    return R.compose(R.takeLast(20), R.concat('000000000000000'));
  }

  function isIdValid(input) {
    return new Success(R.curryN(1, function() {
        return input;
      }))
      .ap(findId(input));
  }

  function handleError(err){
    console.log(err);
    process.exit(1);
  }

})();