(function() {

  'use strict';
  var net = require('net');
  var utility = require('simpleSocketUtils');
  var tasks = require('./api/tasks');
  var mode = process.env.NODE_ENV;
  var HOST = (mode === 'production') ? '192.168.1.10' : '127.0.0.1';
  var RESPHOST = '192.168.1.20';
  var PORT = 10001;

  net.createServer(function(sock) {

    utility.log('loginfo', 'CONNECTED: ' + sock.remoteAddress + ':' +
      sock.remotePort);

    sock.on('data', function(msg) {

      utility.log('loginfo', 'data recieived: ' + msg);

      var infoObj = {
        fatalErr: [],
        errors: [],
        warn: [],
        data: {
          receivedString: msg.toString(),
          user: {},
          translatedString: {},
          response: {}
        }
      };

      tasks.translateRead(infoObj).fork(handleError, okOrCode);
      //var toDos = R.pipeK(tasks.translateRead,
      //  tasks.findId);
      //tasks.translateWrite);

      //var concat = monads.compose(tasks.translateRead, tasks.findId,
      //  infoObj);

      //var readTasks = R.composeK(tasks.findId, tasks.translateRead);

      //tasks.translateRead(comm).fork(handleError, function(res){console.log(res)});
      //readTasks(infoObj).fork(handleError, handleResult);

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
        tasks.findId(infoObj).fork(handleError, handleResult);
      }

      function handleResult(infoObjRes) {

        if (infoObjRes.fatalErr.length > 0) {
          return handleError(infoObjRes.fatalErr(0));
        } else if (infoObjRes.errors.length > 0) {
          infoObjRes.data.response.code = 'red';
        } else if (infoObjRes.warn.length > 0) {
          infoObjRes.data.response.code = 'yellow';
        } else {
          infoObjRes.data.response.code = 'green';
        }

        utility.log('loginfo', 'answering: ' + JSON.stringify(
          infoObjRes));

        //var writeTasks = R.composeK(tasks.sendToRfid, tasks.translateWrite);

        tasks.translateWrite(infoObj).fork(handleError, write);
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

    /////////////////////////////////////////////////////////////////////
    // funzioni
    /////////////////////////////////////////////////////////////////////

    function handleError(err) {
      utility.log('logerror', err);
      sock.end();
      return;
    }

    function write(infoObjRes) {

      utility.log('loginfo', 'answering: ' + JSON.stringify(
        infoObjRes));

      if (mode === 'production') {
        var client = new net.Socket();
        client.connect(PORT, RESPHOST, function() {
          utility.log('loginfo', 'CONNECTED TO: ' + RESPHOST + ':' + PORT +
            'now sending: ' + infoObjRes.data.response.sent);
          client.end(new Buffer(infoObjRes.data.response.sent, 'utf8'));
          sock.end();
        });
      } else {
        utility.log('loginfo', 'now sending: ' + infoObjRes.data.response.sent);
        sock.write(new Buffer(infoObjRes.data.response.sent, 'utf8'));
        sock.end();
      }
    }

  }).listen(PORT, HOST);
  console.log('Server listening on ' + HOST + ':' + PORT);

  process.on('uncaughtException', function(err) {
    utility.log('logerror', 'UNCAUGHT EXCEPTION: ' + err);
    process.exit(1);
  });

})();