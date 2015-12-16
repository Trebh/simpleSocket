(function() {

  'use strict';

  var Task = require('data.task');
  var Async = require('control.async')(Task);
  var seneca = require('seneca')({timeout:30000});
  var utilities = require('simpleSocketUtils');
  var Promise = require('bluebird');
  var R = require('ramda');
  var validation = require('../validations/findId');

  module.exports = {
    findId: findId
  };

  function findId(data, config) {

    var infoObj = R.compose(validation.check,
      utilities.flattenAnswer)(data);

    infoObj.config = config;

    if (!infoObj.config) {
      return Task.rejected('problema configurazioni');
    }

    if (infoObj.fatalErr.length > 0) {
      return Task.rejected(infoObj);
    }

    var senecaThis = seneca
      .client({
        type: 'tcp',
        port: 10004
      });

    var act = Promise.promisify(seneca.act, {
      context: senecaThis
    });

    var serviceCall = Async.fromPromise(act({
      role: 'main',
      cmd: 'findId',
      msg: infoObj
    }));

    return new Task(function(reject, resolve) {
      serviceCall.fork(function(err) {
        infoObj.fatalErr.push('FINDID' + err);
        reject(infoObj);
      }, function(res) {
        if (res.answer) {
          if (res.answer.errors) {
            infoObj.errors = R.compose(R.concat(infoObj.errors), R
              .filter(R.is(String)))(res.answer.errors);
          }
          infoObj.data.user = R.merge(infoObj.data.user, res.answer);
        }
        resolve(infoObj);
        return infoObj;
      });
    });

  }

})();