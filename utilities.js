'use strict';

var seneca = require('seneca')();

module.exports = {
	STX: '\u0002',
	ETX: '\u0003',
	select: '0',
	setOutputs: '6',
	separator: '|',
	confirm: '5',
	log: log
}

function log(level, message) {
	seneca
		.client({
			type: 'tcp',
			port: 10002
		})
		.act({
			role: 'main',
			cmd: level,
			msg: message
		}, console.log);
}