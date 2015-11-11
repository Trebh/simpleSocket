'use strict';

var seneca = require('seneca')();


seneca
.use('searchDetails')
.listen({
	type:'tcp',
	port:10202});