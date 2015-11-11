'use strict';

var seneca = require('seneca')();

seneca
.use('translator')
.listen({
	type:'tcp',
	port:10204});