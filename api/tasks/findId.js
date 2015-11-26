(function() {

  'use strict';

  var Task = require('data.task');
  var Async = require('control.async')(Task);
  var seneca = require('seneca')();
  var utilities = require('simpleSocketUtils');
  var Promise = require('bluebird');
  var R = require('ramda');
  var validation = require('../validations/findId');

  module.exports = {
    findId: findId
  };

  function findId(data) {

    var infoObj = R.compose(validation.check,
      utilities.flattenAnswer)(data);

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
      msg: infoObj.data.translatedString.code
    }));

    return new Task(function(reject, resolve) {
      serviceCall.fork(function(err) {
        infoObj.fatalErr.push(err);
        reject(infoObj);
      }, function(res) {
        if (res.answer){
          infoObj.data.user = res.answer;
        }
        if (res.failure) {
          infoObj.errors.push(res.failure);
        }
        resolve(infoObj);
      });
    });

  }

})();