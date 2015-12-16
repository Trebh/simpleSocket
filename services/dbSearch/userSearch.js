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
var terminalConfig;

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

  var infoObj = data.msg;
  terminalConfig = infoObj.config;

  var user = {
    warn: [],
    errors: [],
  };
  user.rfid = infoObj.data.translatedString.code;

  var parallelAfterId;
  var toDos = findAndValidateId(user)
    .chain(function(userFirstStep) {
      if (!userFirstStep.id) {
        return new Task.of(userFirstStep);
      }
      if (userFirstStep.isIstruttore) {
        return findAndValidateName(userFirstStep);
      }
      parallelAfterId = Async.parallel([findAndValidateName(userFirstStep),
        getAndValidateQuotaAssociativa(userFirstStep),
        getAndValidateScadenzaAbbonamento(userFirstStep),
        getAndValidateScadenzaCM(userFirstStep)
      ]);
      return parallelAfterId.map(function(arrayRes) {
        return R.reduce(deepMergeUser, user,
          arrayRes);
      });
    })
    .chain(function(resultScadenze) {
      if (resultScadenze.isIstruttore) {
        return new Task.of(resultScadenze);
      }
      if (!resultScadenze.id) {
        return new Task.of(resultScadenze);
      }
      var parallelChecks = Async.parallel([checkEntrateCorsi(
        resultScadenze), checkEntrateIngressi(resultScadenze)]);
      return parallelChecks.map(function(arrayRes) {
        var mergedUser = R.reduce(deepMergeUser, resultScadenze,
          arrayRes);
        if (!((mergedUser.checkEntrateCorsi === 'ok') ||
            (mergedUser.checkPalestra === 'ok') ||
            (mergedUser.checkIngressi === 'ok'))) {
          mergedUser.errors.push('ingresso non valido');
        }
        return mergedUser;
      });

    });

  toDos.fork(execError, resp);

  function resp(finalRes) {

    respond(null, {
      answer: finalRes
    });
    return finalRes;

  }

  function execError(err) {
    respond(new Error('ERRORE ESRECUZIONE QUERY ricerca utente', err), null);
  }

}

function checkEntrateCorsi(user) {
  var thisUser = R.clone(user);
  var parallel = Async.parallel([getAbbonamentoCorso(thisUser.id),
    readAccessoStruttura(user)
  ]);
  return parallel
    .chain(function(arrayRes) {

      var abbonamentiCorsi = arrayRes[0];
      var lastEntry = arrayRes[1][0];
      var diff;
      if (lastEntry) {
        thisUser.lastEntry = lastEntry;
        var lastEntryTmp = moment(lastEntry.Data).startOf('day').add(
          lastEntry.Ora,
          'minutes');
        var ora = moment();
        diff = ora.diff(lastEntryTmp, 'minutes');
      }

      if (abbonamentiCorsi && abbonamentiCorsi.length > 0) {
        thisUser.abbonamentiCorsi = abbonamentiCorsi;
        var abbonamento = thisUser.abbonamentiCorsi[0];
        return getCalendarEntries(thisUser.id)
          .chain(function(calEntries) {
            return checkAllEntries(calEntries)
              .map(function(newCalEntries) {
                thisUser.calEntries = newCalEntries;
                if (R.all(ko, thisUser.calEntries)) {
                  thisUser.checkEntrateCorsi = 'ko';
                } else if (abbonamento.TempoIngressi === 'I' && Number(
                    abbonamento.Ingressi) >
                  0) {
                  thisUser.ingressi = abbonamento.Ingressi;
                  thisUser.checkEntrateCorsi = 'ok';
                } else if (abbonamento.TempoIngressi === 'I' &&
                  Number(abbonamento.Ingressi) === 0 &&
                  lastEntry &&
                  diff < terminalConfig.NoDecrIngrEntroMinuti) {
                  thisUser.ingressi = abbonamento.ingressi;
                  thisUser.checkEntrateCorsi = 'ok';
                }
                return thisUser;
              });
          });
      } else {
        return new Task.of(thisUser);
      }
    });

}

function ko(x) {
  return x.checkOrario !== 'ok';
}

function checkEntrateIngressi(user) {
  var thisUser = R.clone(user);
  thisUser.abbonamentiIngressi = [];

  var parallel = Async.parallel([getAbbonamentoTempoIngressi(thisUser.id),
    readAccessoStruttura(user)
  ]);

  return parallel
    .map(function(arrayRes) {
      var abbonamentiIngressi = arrayRes[0];
      var lastEntry = arrayRes[1][0];
      var diff;
      if (lastEntry) {
        thisUser.lastEntry = lastEntry;
        var lastEntryTmp = moment(lastEntry.Data).startOf('day').add(
          lastEntry.Ora,
          'minutes');
        var ora = moment();
        diff = ora.diff(lastEntryTmp, 'minutes');
      }
      if (abbonamentiIngressi && abbonamentiIngressi.length > 0) {
        thisUser.abbonamentiIngressi = abbonamentiIngressi;
        var abbonamento = thisUser.abbonamentiIngressi[0];
        if (abbonamento.TempoIngressi === 'T') {
          thisUser.checkPalestra = 'ok';
        } else if (abbonamento.TempoIngressi === 'I' && Number(abbonamento.Ingressi) >
          0) {
          thisUser.ingressi = abbonamento.Ingressi;
          thisUser.checkIngressi = 'ok';
        } else if (abbonamento.TempoIngressi === 'I' &&
          Number(abbonamento.Ingressi) === 0 &&
          lastEntry &&
          diff < terminalConfig.NoDecrIngrEntroMinuti) {
          thisUser.ingressi = abbonamento.ingressi;
          thisUser.checkIngressi = 'ok';
        } else {
          thisUser.checkIngressi = 'ko';
        }
        return thisUser;
      } else {
        return thisUser;
      }
    });

}

function checkDb() {
  return Async.fromPromise(
    sql.execute({
      query: 'SELECT Distinct TABLE_NAME FROM information_schema.TABLES'
    })
  );
}

function findAndValidateName(user) {

  var thisUser = R.clone(user);

  return findName(thisUser)
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
        })
        .cata({
          Failure: function(err) {
            thisUser.errors.push(err.message);
            return thisUser;
          },
          Success: function(res) {
            return res;
          }
        });
    });

}

function findAndValidateId(user) {

  var thisUser = R.clone(user);
  var parallelFind = Async.parallel([findIdIstruttore(thisUser.rfid),
    findId(thisUser.rfid)
  ]);
  return parallelFind
    .map(function(results) {
      var queryRes;
      if (results[0].length > 0) {
        queryRes = results[0];
        thisUser.isIstruttore = true;
      } else {
        queryRes = results[1];
        thisUser.isIstruttore = false;
      }
      return validateFindId(queryRes)
        .map(function(okIds) {
          thisUser.id = okIds[0].id || okIds[0].idistruttore;
          return thisUser;
        })
        .failureMap(function(err) {
          if (err.message === 'empty') {
            err.message = 'nessun id associato alla tessera';
            return err;
          }
          if (err.message === 'toomany') {
            err.message = 'piu di un id associato alla tessera';
            return err;
          }
        })
        .cata({
          Failure: function(err) {
            thisUser.errors.push(err.message);
            return thisUser;
          },
          Success: function(res) {
            return thisUser;
          }
        });

    });

}

function getAndValidateQuotaAssociativa(user) {

  var thisUser = R.clone(user);

  return getScadenzaQuotaAssociativa(thisUser.id)
    .map(function(results) {
      return validateQuotaAssociativa(results)
        .failureMap(function(err) {
          if (err.message === 'timeOutofBounds') {
            err.message = 'quota associativa scaduta';
            return err;
          }
        })
        .map(function(scadenzaRes) {

          var giorniWarn = warnScadenza(scadenzaRes[0].scadenza, config
            .misc.ggIs);
          if (giorniWarn) {
            var warnStr =
              'attenzione: iscrizione in scadenza tra ' +
              giorniWarn;
            if (giorniWarn > 1) {
              warnStr = warnStr.concat(' giorni');
            } else {
              warnStr = warnStr.concat(' giorno');
            }
            thisUser.warn.push(warnStr);
          }

          thisUser.scadenzaQuotaAss = scadenzaRes[0].scadenza;
          return thisUser;
        })
        .cata({
          Failure: function(err) {
            thisUser.errors.push(err.message);
            return thisUser;
          },
          Success: function(res) {
            return res;
          }
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

function findIdIstruttore(id) {

  var code = addZerosLeft(id);

  return Async.fromPromise(sql.execute({
    preparedSql: 'SELECT a.idistruttore from istruttori a inner join tessererf b on a.badge = b.idtessera where b.codicerf = @codicerf',
    params: {
      codicerf: {
        val: code,
        type: sql.NVARCHAR
      }
    }
  }));

}

function findName(user) {

  var sqlStr;
  if (user.isIstruttore) {
    sqlStr = 'Select Nome,Cognome from istruttori where idistruttore = @id';
  } else {
    sqlStr = 'Select Nome,Cognome,Sesso from iscritti where id = @id';
  }

  return Async.fromPromise(sql.execute({
    preparedSql: sqlStr,
    params: {
      id: {
        val: user.id,
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

function warnScadenza(scadenza, numGiorni) {
  var ora = moment();
  var momentScadenza = moment(scadenza);
  var limiteWarn = moment(scadenza).subtract(numGiorni, 'days');
  if (ora.isAfter(limiteWarn)) {
    return momentScadenza.diff(ora, 'days');
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

function getAndValidateScadenzaAbbonamento(user) {

  var thisUser = R.clone(user);

  return getScadenzaAbbonamento(thisUser.id)
    .map(function(results) {
      return validateScadenzaAbbonamento(results)
        .failureMap(function(err) {
          if (err.message === 'timeOutofBounds') {
            err.message = 'abbonamento scaduto';
            return err;
          }
        })
        .map(function(scadenzaRes) {
          var giorniWarn = warnScadenza(scadenzaRes[0].scadenza, config
            .misc.ggAbb);
          if (giorniWarn) {
            var warnStr = 'attenzione: abbonamento in scadenza tra ' +
              giorniWarn;
            if (giorniWarn > 1) {
              warnStr = warnStr.concat(' giorni');
            } else {
              warnStr = warnStr.concat(' giorno');
            }
            thisUser.warn.push(warnStr);
          }
          thisUser.scadenzaAbb = scadenzaRes[0].scadenza;
          return thisUser;
        })
        .cata({
          Failure: function(err) {
            thisUser.errors.push(err.message);
            return thisUser;
          },
          Success: function(res) {
            return res;
          }
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

function getAndValidateScadenzaCM(user) {

  var thisUser = R.clone(user);

  return getScadenzaCM(thisUser.id)
    .map(function(results) {
      return validateScadenzaCM(results)
        .failureMap(function(err) {
          if (err.message === 'timeOutofBounds') {
            err.message = 'CM scaduto';
            return err;
          }
        })
        .map(function(scadenzaRes) {
          var giorniWarn = warnScadenza(scadenzaRes[0].scadenza, config
            .misc.ggCm);
          if (giorniWarn) {
            var warnStr =
              'attenzione: certificato medico in scadenza tra ' +
              giorniWarn;
            if (giorniWarn > 1) {
              warnStr = warnStr.concat(' giorni');
            } else {
              warnStr = warnStr.concat(' giorno');
            }
            thisUser.warn.push(warnStr);
          }
          thisUser.scadenzaCm = scadenzaRes[0].scadenza;
          return thisUser;
        })
        .cata({
          Failure: function(err) {
            thisUser.errors.push(err.message);
            return thisUser;
          },
          Success: function(res) {
            return res;
          }
        });
    });
}

function getAbbonamentoCorso(idUtente) {
  return Async.fromPromise(sql.execute({
    preparedSql: 'select top 1 * ' +
      'from iscrittisituazione where tipo=\'C\' and idiscritto = @idiscritto order by scadenza desc',
    params: {
      idiscritto: {
        val: idUtente,
        type: sql.NVARCHAR
      }
    }
  }));
}

function getAbbonamentoTempoIngressi(idUtente) {
  return Async.fromPromise(sql.execute({
    preparedSql: 'select top 1 * ' +
      'from iscrittisituazione where tipo=\'R\' and idiscritto = @idiscritto order by scadenza desc',
    params: {
      idiscritto: {
        val: idUtente,
        type: sql.NVARCHAR
      }
    }
  }));
}

function getCalendarEntries(idUtente) {
  return Async.fromPromise(sql.execute({
    preparedSql: 'set datefirst 1 SELECT TOP 1000 [IdIscritto],[ID_Calendario],[Giorno]' +
      'FROM [keepergym].[dbo].[CalendariIscrizioni] ' +
      'where idiscritto = @idiscritto and giorno=datepart(dw,getdate())',
    params: {
      idiscritto: {
        val: idUtente,
        type: sql.NVARCHAR
      }
    }
  }));
}

function checkAllEntries(calEntries) {

  return Async.parallel(R.map(checkTolleranzaEntrata, calEntries));

}

function checkTolleranzaEntrata(calEntry) {

  return Async.fromPromise(sql.execute({
      preparedSql: 'set datefirst 1 SELECT \'ok\' as response, a.idCalendario, b.Attività, b.Descrizione FROM [keepergym].[dbo].[CalendariOrari]' +
        'as a inner join [keepergym].[dbo].[Calendari] as b on a.IdCalendario=b.IdCalendario ' +
        'where a.IdCalendario= @idCalendario and GiornoNum=datepart(dw,getdate()) ' +
        'and (DATEDIFF(MINUTE, dateadd(second, 1, dateadd(day, datediff(day, 0, getdate()), 0)), GETDATE()) between (a.[OraInizio] - b.tolleranza)' +
        'and (a.[OraFine]+b.tolleranzauscita))',
      params: {
        idCalendario: {
          val: calEntry.ID_Calendario,
          type: sql.INT
        }
      }
    }))
    .map(function(res) {
      if (res.length > 0) {
        calEntry.checkOrario = res[0].response;
        calEntry.attivita = res[0].Attività;
        calEntry.idCalendario = res[0].idCalendario;
        calEntry.descrizione = res[0].Descrizione;
      }
      return calEntry;
    });
}

function readAccessoStruttura(user) {
  return Async.fromPromise(sql.execute({
    preparedSql: 'select top 1 * from AccessiStruttura where IDIscritto = @idiscritto and Esito=\'0\' order by  Data desc',
    params: {
      idiscritto: {
        val: user.id,
        type: sql.NVARCHAR
      }
    }
  }));
}

function deepMergeUser(a, b) {
  var errors = R.concat(a.errors, b.errors);
  var warn = R.concat(a.warn, b.warn);
  var autoMerge = R.merge(a, b);
  autoMerge.errors = R.uniq(errors);
  autoMerge.warn = R.uniq(warn);
  return autoMerge;
}