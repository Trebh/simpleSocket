'use strict';

var seneca = require('seneca')();
var translator = require('./translator')

seneca
.use(translator.translator)
.listen({
	type:'tcp',
	port:10003});
