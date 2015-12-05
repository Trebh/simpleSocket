'use strict';

var net = require('net');

var mode = process.env.NODE_ENV;
//var HOST = '192.168.1.9';
var HOST = (mode === 'production') ? '192.168.1.10' : '127.0.0.1';
var PORT = 10001;

var client = new net.Socket();
client.connect(PORT, HOST, function() {

  console.log('CONNECTED TO: ' + HOST + ':' + PORT);
  //client.write('\u00022M|A|L|5B00CF0127\u0003');
  // client.write(' \u00022M|A|L|7900739622\u0003'); //abbonamento scaduto
  //client.write('\u00022M|A|L|0A003DE42F\u0003'); //test warn
  client.write('\u00022M|A|L|A8007269C1\u0003');

});

client.on('data', function(data) {

  console.log('risposta: ' + data);
  // Close the client socket completely
  client.destroy();

});

// Add a 'close' event handler for the client socket
client.on('close', function() {
  console.log('Connection closed');
});

client.on('error', function(err) {
  console.log('Connection error: ', err);
});