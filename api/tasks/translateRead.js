(function() {

  'use strict';

  var Task = require('data.task');
  var Async = require('control.async')(Task);
  var seneca = require('seneca')();
  var utilities = require('simpleSocketUtils');
  var Promise = require('bluebird');
  var R = require('ramda');
  var validation = require('../validations/translateRead');

  module.exports = {
    translateRead: translateRead
  };

  function translateRead(data) {

    var fn = R.compose(validation.check,
      utilities.flattenAnswer);

    var infoObj = fn(data);

    if (infoObj.fatalErr.length > 0) {
      return Task.reject(infoObj);
    }
    var senecaThis = seneca
      .client({
        type: 'tcp',
        port: 10003
      });

    var act = Promise.promisify(seneca.act, {
      context: senecaThis
    });

    var serviceCall = Async.fromPromise(act({
      role: 'main',
      cmd: 'translateRead',
      msg: infoObj.data.receivedString
    }));

    return new Task(function(reject, resolve) {
      serviceCall.fork(function(err) {
        infoObj.fatalErr.push(err);
        reject(infoObj);
      }, function(res) {
        if (res.answer.errors) {
          infoObj.errors = R.compose(R.concat(infoObj.errors), R.filter(
            R.is(String)))(res.answer.errors);
        }
        infoObj.data.translatedString = R.merge(infoObj.data.translatedString,
          res.answer);
        resolve(infoObj);
      });
    });

  }

})();