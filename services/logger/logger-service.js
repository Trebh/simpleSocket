'use strict';

var seneca = require('seneca')();

seneca
.use('logger')
.listen({
	type:'tcp',
	port:10002});
