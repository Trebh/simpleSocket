(function() {

  'use strict';

  var Task = require('data.task');
  var Async = require('control.async')(Task);
  var seneca = require('seneca')({timeout:30000});
  var utilities = require('simpleSocketUtils');
  var Promise = require('bluebird');
  var R = require('ramda');

  module.exports = {
    writeAccess: writeAccess
  };

  function writeAccess(data) {

    var infoObj = data;
    
    var senecaThis = seneca
      .client({
        type: 'tcp',
        port: 10006
      });

    var act = Promise.promisify(seneca.act, {
      context: senecaThis
    });

    var serviceCall = Async.fromPromise(act({
      role: 'main',
      cmd: 'dbAccessWrite',
      msg: infoObj
    }));

    return new Task(function(reject, resolve) {
      serviceCall.fork(function(err) {
        infoObj.fatalErr.push(err);
        return reject(infoObj);
      }, function(res) {
        infoObj.data.response.sent = res.answer;
        return resolve(infoObj);
      });
    });

  }

})();