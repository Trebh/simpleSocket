
(function() {

  'use strict';

  var Task = require('data.task');
  var Async = require('control.async')(Task);
  var seneca = require('seneca')();
  var utilities = require('simpleSocketUtils');
  var Promise = require('bluebird');
  var R = require('ramda');
  var validation = require('../validations/sendToClient');

  module.exports = {
    sendToClient: sendToClient
  };

  function sendToClient(data) {

    var infoObj = R.compose(validation.check,
      utilities.flattenAnswer)(data);

    if (infoObj.fatalErr.length > 0) {
      return Task.rejected(infoObj);
    }

    var senecaThis = seneca
      .client({
        type: 'tcp',
        port: 10005
      });

    var act = Promise.promisify(seneca.act, {
      context: senecaThis
    });

    var serviceCall = Async.fromPromise(act({
      role: 'main',
      cmd: 'sendToClient',
      msg: infoObj
    }));

    return new Task(function(reject, resolve) {
      serviceCall.fork(function(err) {
        reject(err);
      }, function(res) {
        resolve(res.answer);
      });
    });

  }

})();