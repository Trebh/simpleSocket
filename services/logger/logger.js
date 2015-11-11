'use strict';

var bunyan = require('bunyan');

var log = bunyan.createLogger({
  name: "SimpleSocketLogger",                     // logger name
  streams: [
      {
          level: 'info',                  // loging level
          stream: process.stdout          // log INFO and above to stdout
      },
      {
        level: 'error',
        path: 'bunyan-error.log'  // log ERROR and above to a file
      }
  ]
});


module.exports = function logger(options) {

    var seneca = this;

    seneca.add( {role:'main', cmd:'log'}, function( data, respond ) {

        log.info(data.msg);
        respond( null, { answer: 'logger-ok' } );

    })

}
