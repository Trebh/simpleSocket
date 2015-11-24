'use strict';

var bunyan = require('bunyan');

var log = bunyan.createLogger({
  name: 'SimpleSocketLogger', // logger name
  streams: [{
    level: 'info', // loging level
    path: 'services/log/bunyan-info.log' 
  }, {
    level: 'error',
    path: 'services/log/bunyan-error.log' // log ERROR and above to a file
  }]
});


module.exports = function logger() {

  var seneca = this;

  seneca.add({
    role: 'main',
    cmd: 'loginfo'
  }, function(data, respond) {

    log.info(data.msg);
    respond(null, {
      answer: 'logger-ok'
    });

  });

  seneca.add({
    role: 'main',
    cmd: 'logerror'
  }, function(data, respond) {

    log.error(data.msg);
    respond(null, {
      answer: 'logger-error-ok'
    });

  });

};