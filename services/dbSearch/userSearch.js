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
  var moment = require('moment');

  var dbConfig = config.dbConfigConn;
  sql.setDefaultConfig(dbConfig);

  checkDb().fork(handleError, console.log('DB OK'));

  module.exports = {
    userSearch: userSearch,
    processId: processId
  };

  function userSearch() {
    var senecaThis = this;
    senecaThis.add('role:main,cmd:findId', processId);
  }

  function processId(data, respond) {

    var user = {};
    user.rfid = data.msg;

    var parallelAfterId;
    var toDos = findAndValidateId(user)
      .chain(function(id) {
        parallelAfterId = Async.parallel([findAndValidateName(id),
          getAndValidateQuotaAssociativa(id),
          getAndValidateScadenzaAbbonamento(id),
          getAndValidateScadenzaCM(id)
        ]);
        return parallelAfterId.map(function(validationArr) {
          return R.reduce(mergeOrFailure, new Success({}),
            validationArr);
        });
      });

    toDos.fork(execError, resp);

    function resp(results) {
      results.cata({
        Failure: function(err) {
          respond(null, {
            failure: err.message
          });
          return err;
        },
        Success: function(res) {
          respond(null, {
            answer: res
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

  function findAndValidateName(validation) {

    if (validation.isFailure) {
      return new Task.of(validation);
    }
    var thisUser = R.clone(validation.get());

    return findName(thisUser.id)
      .map(function(results) {
        return validateFindName(results)
          .failureMap(function(err) {
            if (err.message === 'empty') {
              err.message = 'nessun rfid associato all\' id';
              return err;
            }
            if (err.message === 'toomany') {
              err.message =
                'piu` di un id associato alla tessera';
              return err;
            }
          })
          .map(function(okNames) {
            thisUser.nome = okNames[0].Nome;
            thisUser.cognome = okNames[0].Cognome;
            thisUser.sesso = okNames[0].Sesso;
            return thisUser;
          });
      });

  }

  function findAndValidateId(thisUser) {
    return new Task(function(reject, resolve) {
      findId(thisUser.rfid)
        .fork(function(err) {
            reject(err);
          },
          function(results) {
            resolve(validateFindId(results)
              .map(function(okIds) {
                thisUser.id = okIds[0].id;
                return thisUser;
              }));
          });
    });

  }

  function getAndValidateQuotaAssociativa(validation) {

    if (validation.isFailure) {
      return new Task.of(validation);
    }
    var thisUser = R.clone(validation.get());

    return getScadenzaQuotaAssociativa(thisUser.id)
      .map(function(results) {
        return validateQuotaAssociativa(results)
          .failureMap(function(err){
            if (err.message === 'timeOutofBounds'){
              err.message = 'quota associativa scaduta';
              return err;
            }
          })
          .map(function(scadenzaRes) {
            thisUser.scadenzaQuotaAss = scadenzaRes[0].scadenza;
            return thisUser;
          });
      });
  }

  function validateFindId(results) {
    return new Success(R.curryN(2, function() {
        return results;
      }))
      .ap(isNotEmpty(results))
      .ap(noMoreThanOne(results));
  }

  function validateFindName(results) {
    return new Success(results);
  }

  function validateQuotaAssociativa(results) {
    return new Success(R.curryN(2, function() {
        return results;
      }))
      .ap(isNotEmpty(results))
      .ap(checkScadenza(results));
  }

  //findId: String -> Task(err, [])
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

  function findName(idutente) {

    return Async.fromPromise(sql.execute({
      preparedSql: 'Select Nome,Cognome,Sesso from iscritti where id = @id',
      params: {
        id: {
          val: idutente,
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
      'empty'
    ])) : new Success(arr);
  }

  function noMoreThanOne(arr) {
    return (arr.length > 0 && arr.length !== 1) ? new Failure(new Error(
      [
        'toomany'
      ])) : new Success(arr);
  }

  function handleError(err) {
    console.log(err);
    process.exit(1);
  }

  function checkScadenza(results) {

    var scadenza = moment(results[0].scadenza);
    var ora = moment();

    return (scadenza.isBefore(ora)) ? new Failure(new Error([
      'timeOutofBounds'
    ])) : new Success(results);

  }

  function warnScadenza(scadenza, numGiorni){
    var ora = moment();
    var scadenza = moment(scadenza);
    if(ora.isAfter(scadenza.subtract(numGiorni, 'days'))){
      return scadenza.diff(ora, 'days');
    } else {
      return false;
    }
  }

  function getScadenzaQuotaAssociativa(idutente) {

    return Async.fromPromise(sql.execute({
      preparedSql: 'select top 1 scadenza ' +
        'from iscrittisituazione where tipo=\'I\' and idiscritto = @idiscritto order by scadenza desc',
      params: {
        idiscritto: {
          val: idutente,
          type: sql.NVARCHAR
        }
      }
    }));

  }

  function mergeOrFailure(a, b) {
    if (a.isFailure) {
      return a;
    }
    if (b.isFailure) {
      return b;
    }
    // return Monads.liftM2(R.merge, a, b); dovrebbe funzionare, possibile bug?
    return Validation.of(R.merge(a.value, b.value)); //bleah
  }

  function getScadenzaAbbonamento(idutente) {
    return Async.fromPromise(sql.execute({
      preparedSql: 'select top 1 scadenza ' +
        'from iscrittisituazione where (tipo=\'C\'  or tipo=\'R\') and idiscritto = @idiscritto order by scadenza desc',
      params: {
        idiscritto: {
          val: idutente,
          type: sql.NVARCHAR
        }
      }
    }));
  }

  function validateScadenzaAbbonamento(results) {
    return new Success(R.curryN(2, function() {
        return results;
      }))
      .ap(isNotEmpty(results))
      .ap(checkScadenza(results));
  }

  function getAndValidateScadenzaAbbonamento(validation){
    if (validation.isFailure) {
      return new Task.of(validation);
    }
    var thisUser = R.clone(validation.get());

    return getScadenzaAbbonamento(thisUser.id)
      .map(function(results) {
        return validateScadenzaAbbonamento(results)
          .failureMap(function(err){
            if (err.message === 'timeOutofBounds'){
              err.message = 'abbonamento scaduto';
              return err;
            }
          })
          .map(function(scadenzaRes) {
            var giorniWarn = warnScadenza(scadenzaRes[0].scadenza, config.misc.ggAbb);
            if (giorniWarn){
              thisUser.warn.push('attenzione: abbonamento in scadenza tra ' + giorniWarn);
            }
            thisUser.scadenzaAbb = scadenzaRes[0].scadenza;
            return thisUser;
          });
      });
  }

  function getScadenzaCM(idutente) {
    return Async.fromPromise(sql.execute({
      preparedSql: 'select top 1 scadenza ' +
        'from iscrittisituazione where tipo=\'M\' and idiscritto = @idiscritto order by scadenza desc',
      params: {
        idiscritto: {
          val: idutente,
          type: sql.NVARCHAR
        }
      }
    }));
  }

  function validateScadenzaCM(results) {
    return new Success(R.curryN(2, function() {
        return results;
      }))
      .ap(isNotEmpty(results))
      .ap(checkScadenza(results));
  }

  function getAndValidateScadenzaCM(validation){
    if (validation.isFailure) {
      return new Task.of(validation);
    }
    var thisUser = R.clone(validation.get());

    return getScadenzaCM(thisUser.id)
      .map(function(results) {
        return validateScadenzaCM(results)
          .failureMap(function(err){
            if (err.message === 'timeOutofBounds'){
              err.message = 'CM scaduto';
              return err;
            }
          })
          .map(function(scadenzaRes) {
            var giorniWarn = warnScadenza(scadenzaRes[0].scadenza, config.misc.ggCM);
            if (giorniWarn){
              thisUser.warn.push('attenzione: abbonamento in scadenza tra ' + giorniWarn);
            }
            thisUser.scadenzaCm = scadenzaRes[0].scadenza;
            return thisUser;
          });
      });
  }


})();