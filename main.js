'use strict';

var server = require('http').createServer();
var io = require('socket.io')(server);
var utilities = require('./utilities');
var dbService = require('./MSSQLservice');
var net = require('net');
var seneca = require('seneca')();
var utility = require('./utilities');

var mode = process.env.NODE_ENV;

var HOST = (mode == 'production') ? '192.168.1.10' : '127.0.0.1';
var RESPHOST = '192.168.1.20';
var PORT = 10001;


net.createServer(function(sock) {

	utility.log('loginfo', 'CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort);

	sock.on('data', function(msg) {

		utility.log('loginfo', 'got a request: ' + msg)

		seneca
			.client({
				type: 'tcp',
				port: 10003
			})
			.act({
				role: 'main',
				cmd: 'translateRead',
				msg: msg.toString()
			}, sendToRFID);

		dbService.testDB().then(function(result){
			console.log('DB OK ', result);
			sock.write(result);
		}, function(err){
			console.log('DB KO ', err);
		});

		// seneca
		// 	.client({
		// 		type: 'tcp',
		// 		port: 10201
		// 	})
		// 	.act({
		// 		role: 'main',
		// 		cmd: 'search',
		// 		rfid: converted
		// 	}, foundId);


	});

	function foundId(err, result) {
		if (err) {
			utility.log('logerror', err);
			sock.end();
		}

		seneca
			.client({
				type: 'tcp',
				port: 10202
			})
			.act({
				role: 'main',
				cmd: 'search',
				foundid: true,
				rfid: result.idgiocatore
			}, sendToRFID);

	}

	function sendToRFID(err, result) {
		if (err) {
			utility.log('logerror', err);
			sock.end();
		}
		utility.log('loginfo', 'translated code' + result.answer.code);

		seneca
			.client({
				type: 'tcp',
				port: 10003
			})
			.act({
				role: 'main',
				cmd: 'translateWrite',
				msg: 'green'
			}, write);
	}

	function write(err, what) {
		if (err) {
			utility.log('logerror', err);
			sock.end();
		}

		if (mode == 'production') {
			var client = new net.Socket();
			client.connect(PORT, RESPHOST, function() {
				utility.log('CONNECTED TO: ' + RESPHOST + ':' + PORT + ' now sending: ' + what.answer);
				client.write(new Buffer(what.answer, 'utf8'));
				sock.end();
			});
		} else {
			sock.write(new Buffer(what.answer, 'utf8'));
			sock.end();
		}
	}

	sock.on('close', function(data) {
		utility.log('loginfo', 'CLOSED: ' + sock.remoteAddress + ' ' + sock.remotePort);
	});

	sock.on('error', function(err) {
		utility.log('logerror', err);
		sock.end();
	});

}).listen(PORT, HOST);

console.log('Server listening on ' + HOST + ':' + PORT);