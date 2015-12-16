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
var utility = require('simpleSocketUtils');

var dbConfig = config.dbConfigConn;
sql.setDefaultConfig(dbConfig);

checkDb().fork(handleFatalErr, console.log('DB OK'));

module.exports = {
  dbAccessWrite: dbAccessWrite,
  dbAccessWriteImpl: dbAccessWriteImpl
};

var terminalConfig;

function dbAccessWrite() {
  var senecaThis = this;
  senecaThis.add('role:main,cmd:dbAccessWrite', dbAccessWriteImpl);
}

function dbAccessWriteImpl(data, respond) {

  var infoObj = R.clone(data.msg);
  terminalConfig = infoObj.config;
  var user = infoObj.data.user;

  var toDos = [];
  if (!infoObj.data.user.id) {
    toDos.push(new Task.of('no user id'));
  } else if (infoObj.errors.length > 0) {
    toDos.push(insertAccessoStruttura(user, infoObj.errors));
  } else {
    if (user.isIstruttore) {
      toDos.push(writeAccessoIstruttore(user));
    } else {
      if (user.checkEntrateCorsi === 'ok') {
        toDos.push(writeAccessoCorsi(user));
      } else if (user.checkIngressi === 'ok') {
        toDos.push(writeAccessoIngressi(user));
      } else if (user.checkPalestra === 'ok') {
        toDos.push(writeAccessoPalestra(user));
      }
    }
  }

  Async.parallel(toDos).fork(handleError, handleSuccess);

  function handleError(err) {
    respond(new Error('errore scrittura accesso', err), null);
  }

  function handleSuccess(res) {
    respond(null, {
      answer: res
    });
    return res;
  }

}

/////////////////////////////////////////////////////////////////

function checkDb() {
  return Async.fromPromise(
    sql.execute({
      query: 'SELECT Distinct TABLE_NAME FROM information_schema.TABLES'
    })
  );
}

function handleFatalErr(err) {
  console.log(err);
  process.exit(1);
}

function writeAccessoIstruttore(user) {

  var thisUser = R.clone(user);
  return insertAccessoIstruttore(thisUser);

}

function insertAccessoIstruttore(istruttore) {

  var ora = moment();
  var minutiOra = ora.hours() * 60 + ora.minutes();

  return Async.fromPromise(sql.execute({
    preparedSql: 'insert into AccessiStrutturaIstruttori (data, ora, IDIstruttore, verso) ' +
      'values (@data, @ora, @IDIstruttore, @verso)',
    params: {
      IDIstruttore: {
        val: istruttore.id,
        type: sql.NVARCHAR
      },
      data: {
        val: moment().startOf('day').add(1, 'hours').toDate(),
        type: sql.DATETIME
      },
      ora: {
        val: minutiOra,
        type: sql.INT
      },
      verso: {
        val: 'E',
        type: sql.NVARCHAR
      }
    }
  }));
}

function writeAccessoCorsi(user) {
  var thisUser = R.clone(user);

  var lastEntryTmp;
  return new Task.of(thisUser)
    .chain(function(thisUser) {
      if (thisUser.lastEntry) {
        lastEntryTmp = moment(thisUser.lastEntry.Data).startOf('day').add(thisUser.lastEntry.Ora, 'minutes');
        var ora = moment();
        var diff = ora.diff(lastEntryTmp, 'minutes');
        if (diff < terminalConfig.NoDecrIngrEntroMinuti) {
          return insertAccessoCorsi(user);
        } else {
          return insertAccessoCorsiDecrIngr(user);
        }
      } else {
        return insertAccessoCorsiDecrIngr(user);
      }

    })
    .chain(function() {
      return insertAccessoStruttura(user);
    });
}

function writeAccessoIngressi(user) {
  var thisUser = R.clone(user);

  var lastEntryTmp;
  return new Task.of(thisUser)
    .chain(function(thisUser) {
      if (thisUser.lastEntry) {
        lastEntryTmp = moment(thisUser.lastEntry.Data).startOf('day').add(thisUser.lastEntry.Ora, 'minutes');
        var ora = moment();
        var diff = ora.diff(lastEntryTmp, 'minutes');
        if (diff < terminalConfig.NoDecrIngrEntroMinuti) {
          return new Task.of(user);
        } else {
          return updateDecrIngr(user);
        }
      } else {
        return updateDecrIngr(user);
      }

    })
    .chain(function(user) {
      return insertAccessoStruttura(user);
    });
}

function writeAccessoPalestra(user) {
  return insertAccessoStruttura(user);
}

function insertAccessoCorsi(user) {

  return Async.fromPromise(sql.execute(getStepInsertAccessiCorsi(user)));
}

function insertAccessoCorsiDecrIngr(user) {
  return new Task(function(reject, resolve) {
    sql.getTransactionContext()
      .step('insertAccessi', getStepInsertAccessiCorsi(user))
      .step('decr', function(execute, data){
        execute(getStepDecrIngr(user));
      })
      .end(function(result) {
        result.transaction.commit()
          .then(function(res) {
            resolve(user);
          }, function(err){
            reject(err);
          });
      }, function(err) {
        reject(err);
      });
  });
}

function updateDecrIngr(user) {
  return new Task(function(reject, resolve) {
    sql.getTransactionContext()
      .step('decr', getStepDecrIngr(user))
      .end(function(result) {
        result.transaction.commit()
          .then(function() {
            resolve(user);
          });
      }, function(err) {
        reject(err);
      });
  });
}

function getStepDecrIngr(user) {
  var abbonamento;
  if (user.calEntries && user.calEntries.length > 0 &&
    user.abbonamentiCorsi &&
    user.abbonamentiCorsi.length > 0) {
    //abbonamento corsi
    var calEntry = R.find(R.propEq('checkOrario', 'ok'))(user.calEntries);
    abbonamento = R.find(R.propEq('Oggetto', calEntry.descrizione))(user
      .abbonamentiCorsi);
  } else {
    //abbonamento a ingressi
    abbonamento = findLast(user.abbonamentiIngressi);
  }

  return {
    preparedSql: 'update iscrittisituazione set ingressi = @ingressi where ' +
      'idiscritto = @idiscritto and oggetto = @oggetto',
    params: {
      idiscritto: {
        val: user.id,
        type: sql.INT
      },
      ingressi: {
        val: abbonamento.Ingressi - 1,
        type: sql.INT
      },
      oggetto: {
        val: abbonamento.Oggetto,
        type: sql.NVARCHAR
      }
    }

  };
}

function getStepInsertAccessiCorsi(user) {
  var ora = moment();
  var minutiOra = ora.hours() * 60 + ora.minutes();

  var calEntry = R.find(R.propEq('checkOrario', 'ok'))(user.calEntries);

  return {
    preparedSql: 'insert into AccessiCorsi (data, ora, ID_Iscritto, verso, ID_Calendario, Descrizione, Attività, ID_Terminale) ' +
      'values (@data, @ora, @ID_Iscritto, @verso, @ID_Calendario, @descrizione, @attivita, \'001\')',
    params: {
      ID_Iscritto: {
        val: user.id,
        type: sql.NUMERIC
      },
      data: {
        val: moment().startOf('day').add(1, 'hours').toDate(),
        type: sql.DATETIME
      },
      ora: {
        val: minutiOra,
        type: sql.INT
      },
      verso: {
        val: 'E',
        type: sql.NVARCHAR
      },
      ID_Calendario: {
        val: calEntry.idCalendario,
        type: sql.NUMERIC
      },
      descrizione: {
        val: calEntry.descrizione,
        type: sql.NVARCHAR
      },
      attivita: {
        val: calEntry.attivita,
        type: sql.NVARCHAR
      }
    }
  };
}

function insertAccessoStruttura(user, errors) {
  var ora = moment();
  var minutiOra = ora.hours() * 60 + ora.minutes();
  var descrizione = 'transazione valida';
  var esito = 0;

  ora.utc();

  if (errors && errors.length > 0) {
    descrizione = errors[0];
    esito = -1;
  }

  return Async.fromPromise(sql.execute({
    preparedSql: 'insert into AccessiStruttura (data, ora, IDIscritto, verso, esito, descrizione)' +
      'values (@data, @ora, @IDIscritto, @verso, @esito, @descrizione)',
    params: {
      IDIscritto: {
        val: user.id,
        type: sql.INT
      },
      data: {
        val: moment().startOf('day').add(1, 'hours').toDate(),
        type: sql.DATETIME
      },
      ora: {
        val: minutiOra,
        type: sql.INT
      },
      verso: {
        val: 'E',
        type: sql.NVARCHAR
      },
      esito: {
        val: esito,
        type: sql.INT
      },
      descrizione: {
        val: descrizione,
        type: sql.NVARCHAR
      }
    }
  }));
}

process.on('uncaughtException', fatalErr);

function fatalErr(err) {
  utility.log('logerror', 'dbAccessWrite: ' + err);
}

function findLast(abbonamenti) {
  return R.compose(R.last, R.sortBy(R.compose(toTime, R.prop('Scadenza'))))(
    abbonamenti);
}

function toTime(date) {
  return date.getTime();
}