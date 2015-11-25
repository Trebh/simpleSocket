(function() {

  'use strict';

  var express = require('express');
  var app = express();
  var server = require('http').createServer(app);
  var io = require('socket.io')(server);
  var config = require('../../config/config');

  server.listen(config.expressConfig.port);

  server.listen(config.expressConfig.port, config.expressConfig.ip, function() {
    console.log('Express server listening on %d, in %s mode', config.expressConfig
      .port, process.env.NODE_ENV);
  });

  app.get('/', function(req, res) {
    res.sendFile('index.html', {
      root: config.expressConfig.dir
    });
  });

  app.get('/whoami', function(req, res) {
    res.send(config.expressConfig.ip + ':' + config.expressConfig.port);
  });

  app.use(express.static('services/client'));

  var thisSocket;

  io.on('connection', function(socket) {
    thisSocket = socket;
  });

  module.exports = {
    sendToClient: sendToClient
  };

  function sendToClient() {
    var senecaThis = this;
    senecaThis.add('role:main,cmd:sendToClient', send);
  }

  function send(infoObj, respond) {

    if (!thisSocket) {
      respond(new Error('NESSUN CLIENT CONNESSO'), null);
    } else {
      thisSocket.emit('rfidReading', infoObj);
      respond(null, {
        answer: 'sent to client'
      });
    }

  }

  function handleError(err) {
    console.log(err);
    process.exit(1);
  }

})();