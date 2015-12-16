'use strict';
var net = require('net');
var utility = require('simpleSocketUtils');
var tasks = require('./api/tasks');
var mode = process.env.NODE_ENV;
var HOST = (mode === 'production') ? '192.168.1.10' : '127.0.0.1';
var RESPHOST = '192.168.1.20';
var PORT = 10001;

var terminalConfig;
tasks.getConfig()
  .fork(fatalErr, function(res) {
    terminalConfig = res[0];
  });

net.createServer(function(sock) {

  utility.log('loginfo', 'CONNECTED: ' + sock.remoteAddress + ':' +
    sock.remotePort);

  sock.on('data', function(msg) {

    utility.log('loginfo', 'data recieived: ' + msg);

    var infoObj = {
      fatalErr: [],
      errors: [],
      data: {
        receivedString: msg.toString(),
        user: {
          warn: []
        },
        translatedString: {},
        response: {}
      }
    };

    tasks.translateRead(infoObj).fork(handleError, okOrCode);

    function okOrCode(infoObjRes) {
      if (infoObjRes.data.translatedString.code === 'OK') {
        return utility.log('loginfo', 'RFID OK');
      } else {
        readID(infoObjRes);
      }
    }

    function readID(infoObj) {
      utility.log('loginfo', 'translated: ' + JSON.stringify(
        infoObj));
      tasks.findId(infoObj, terminalConfig).fork(handleError, handleResult);
    }

    function handleResult(infoObjRes) {

      utility.log('loginfo', 'handleResult: ' + JSON.stringify(
        infoObj));

      utility.log('loginfo', 'answering: ' + JSON.stringify(
        infoObjRes));

      dbWriteAccess(infoObjRes);
    }

    function dbWriteAccess(infoObjRes) {
      tasks.writeAccess(infoObjRes)
        .fork(function(err) {
          handleError(err);
        }, function(data) {
          utility.log('loginfo', data);
          if (infoObjRes.fatalErr.length > 0) {
            return handleError(infoObjRes.fatalErr(0));
          } else if (infoObjRes.errors.length > 0) {
            infoObjRes.data.response.code = 'red';
          } else if (infoObjRes.data.user.warn.length > 0) {
            infoObjRes.data.response.code = 'yellow';
          } else {
            infoObjRes.data.response.code = 'green';
          }

          tasks.translateWrite(infoObjRes).fork(handleError,
            sendToClient);
        });
    }

  });

  sock.on('close', function() {
    utility.log('loginfo', 'CLOSED: ' + sock.remoteAddress + ' ' +
      sock
      .remotePort);
  });

  sock.on('error', function(err) {
    utility.log('logerror', err);
    sock.end();
  });

  function handleError(err) {
    utility.log('logerror', err);
    tasks.sendToClient(err, 'force')
      .fork(function(err) {
        console.log('ERROR', err);
      }, function(data) {
        console.log(data);
      });
    sock.end();
    return;
  }

  function sendToClient(infoObjRes) {

    tasks.sendToClient(infoObjRes)
      .fork(function(err) {
        handleError(err);
      }, function(data) {
        utility.log('loginfo', data);
      });

    utility.log('loginfo', 'answering: ' + JSON.stringify(
      infoObjRes));

    if (mode === 'production') {
      var client = new net.Socket();
      client.connect(PORT, RESPHOST, function() {
        utility.log('loginfo', 'CONNECTED TO: ' + RESPHOST + ':' +
          PORT +
          'now sending: ' + infoObjRes.data.response.sent);
        client.end(new Buffer(infoObjRes.data.response.sent, 'utf8'));
        sock.end();
      });
    } else {
      utility.log('loginfo', 'now sending: ' + infoObjRes.data.response
        .sent);
      sock.write(new Buffer(infoObjRes.data.response.sent, 'utf8'));
      sock.end();
    }
  }

}).listen(PORT, HOST);
console.log('Server listening on ' + HOST + ':' + PORT);

process.on('uncaughtException', fatalErr);

function fatalErr(err) {
  utility.log('logerror', 'MAIN: ' + err);
  process.exit(1);
}