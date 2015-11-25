'use strict';

var seneca = require('seneca')();
var client = require('./client');

seneca
  .use(client.sendToClient)
  .listen({
    type: 'tcp',
    port: 10005
  });