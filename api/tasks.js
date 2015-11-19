(function() {

  'use strict';
  var Task = require('data.task');
  var Async = require('control.async')(Task);
  var seneca = require('seneca')();

  module.exports = {
    findId: findId,
    translateRead: translateRead,
    translateWrite: translateWrite
  };

  function findId(data) {
    return Async.liftNode(
      seneca
      .client({
        type: 'tcp',
        port: 10004
      })
      .act({
        role: 'main',
        cmd: 'search',
        msg: data
      })
    );
  }

  function translateRead(data) {
    return Async.liftNode(seneca
      .client({
        type: 'tcp',
        port: 10003
      })
      .act({
        role: 'main',
        cmd: 'translateRead',
        msg: data
      })
    );
  }

  function translateWrite(data) {
    return Async.liftNode(seneca
      .client({
        type: 'tcp',
        port: 10003
      })
      .act({
        role: 'main',
        cmd: 'translateWrite',
        msg: data
      })
    );
  }

  /*          function log(level, message) {
              return Async.liftNode(seneca
                .client({
                  type: 'tcp',
                  port: 10002
                })
                .act({
                  role: 'main',
                  cmd: level,
                  msg: message
                }, console.log);
              }
  */
})();