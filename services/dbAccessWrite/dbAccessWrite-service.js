'use strict';

var seneca = require('seneca')();
var dbAccessWrite = require('./dbAccessWrite');

seneca
  .use(dbAccessWrite.dbAccessWrite)
  .listen({
    type: 'tcp',
    port: 10006
  });