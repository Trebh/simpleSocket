(function(){

'use strict';
var net = require('net');
var utility = require('./utilities');
var tasks = require('./api/tasks');
var Validation = require('data.validation');
var mode = process.env.NODE_ENV;
var HOST = (mode === 'production') ? '192.168.1.10' : '127.0.0.1';
var RESPHOST = '192.168.1.20';
var PORT = 10001;

net.createServer(function(sock) {

  utility.log('loginfo', 'CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort);

  sock.on('data', function(msg) {

    utility.log('loginfo', 'got a request: ' + msg);

    var comm = Validation.fromNullable(msg);
    tasks.translateRead(comm)
      .chain(tasks.findId)
      .chain(tasks.translateWrite)
      .fork(handleError, write);
  });

  sock.on('close', function() {
    utility.log('loginfo', 'CLOSED: ' + sock.remoteAddress + ' ' + sock
      .remotePort);
  });

  sock.on('error', function(err) {
    utility.log('logerror', err);
    sock.end();
  });

  /////////////////////////////////////////////////////////////////////
  // funzioni
  /////////////////////////////////////////////////////////////////////

  function handleError(err) {
    utility.log(err);
    sock.end();
  }

  function write(what) {

    if (mode === 'production') {
      var client = new net.Socket();
      client.connect(PORT, RESPHOST, function() {
        utility.log('CONNECTED TO: ' + RESPHOST + ':' + PORT +
          ' now sending: ' + what.answer);
        client.write(new Buffer(what.answer, 'utf8'));
        sock.end();
      });
    } else {
      sock.write(new Buffer(what.answer, 'utf8'));
      sock.end();
    }
  }

}).listen(PORT, HOST);
console.log('Server listening on ' + HOST + ':' + PORT);

})();