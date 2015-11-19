'use strict';

var seneca = require('seneca')();
var userSearch = require('./userSearch');

seneca
  .use(userSearch.userSearch)
  .listen({
    type: 'tcp',
    port: 10004
  });