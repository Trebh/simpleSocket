'use strict';

var seneca = require('seneca')();


seneca
.use('userSearch')
.listen({type:'tcp',port:10201});