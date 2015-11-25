/**
 * Main application routes
 */

'use strict';

var errors = require('./app/components/errors');
var bunyan = require('bunyan');
var config = require('../../config/config');

module.exports = function(app) {

  var logger = bunyan.createLogger({
    name: 'StdLogger',                     // logger name
    serializers: {
        req: bunyan.stdSerializers.req,     // standard bunyan req serializer
        err: bunyan.stdSerializers.err      // standard bunyan error serializer
    },
    streams: [
        {
            level: 'info',                  // loging level
            stream: process.stdout          // log INFO and above to stdout
        },
        {
          level: 'error',
          path: './bunyan-error.log'  // log ERROR and above to a file
        }
    ]
});
app.use(function(req, res, next) {
    req.log = logger;
    next();
});

  // Insert routes below

  //app.use('/api/livelliGiocatori', require('./api/livelliGiocatori'));
  
  // All undefined asset or api routes should return a 404
  app.route('/:url(api|auth|components|app|bower_components|assets)/*')
   .get(errors[404]);

  // All other routes should redirect to the index.html
  app.route('/*')
    .get(function(req, res) {
      res.sendfile(config.expressConfig.dir + '/index.html');
    });
};
