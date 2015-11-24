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
    res.sendfile('./index.html');
  });

  io.on('connection', function(socket) {
    socket.emit('startup', {
      hello: 'world'
    });
  });

  module.exports = {
    sendToClient: sendToClient
  };

  function sendToClient() {
    var senecaThis = this;
    senecaThis.add('role:main,cmd:sendToClient', send);
  }

  function send() {

  }

  function handleError(err) {
    console.log(err);
    process.exit(1);
  }

})();