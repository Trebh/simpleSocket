'use strict';

var server = require('http').createServer();
var io = require('socket.io')(server);
var utilities = require('./utilities');
var service = require('./MSSQLservice');
var net = require('net');
var seneca = require('seneca')();

var mode   = process.env.NODE_ENV;

var HOST = (mode == 'production') ? '192.168.1.10' : '127.0.0.1';
var PORT = 10001;


net.createServer(function(sock) {

	console.log('CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort);

	sock.on('data', function(msg) {

			console.log('got a request: ', msg);
			console.log('answering...');

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



			/*	service.testDB().then(function(result){
					console.log('DB OK ', result);
					sock.write(result);
				}, function(err){
					console.log('DB KO ', err);
				});*/

			seneca
				.client({
					type: 'tcp',
					port: 10002
				})
				.act({
					role: 'main',
					cmd: 'log',
					msg: 'received: ' + msg
				}, console.log);

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
				console.log(err);
				sock.end();
			}
			seneca
				.client({
					type: 'tcp',
					port: 10002
				})
				.act({
					role: 'main',
					cmd: 'log',
					msg: 'found id: ' + result.idgiocatore
				}, console.log);

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
				console.log(err);
				sock.end();
			}

			seneca
				.client({
					type: 'tcp',
					port: 10002
				})
				.act({
					role: 'main',
					cmd: 'log',
					msg: 'translated ' + result.answer.code
				}, console.log);

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

			function write(err, what) {
				sock.write(what.answer);
				sock.end();
			}

		}

	sock.on('close', function(data) {
		console.log('CLOSED: ' + sock.remoteAddress + ' ' + sock.remotePort);
	});

	sock.on('error', function(err) {
		console.log(err);
		sock.end();
	});



}).listen(PORT, HOST);

console.log('Server listening on ' + HOST + ':' + PORT);
