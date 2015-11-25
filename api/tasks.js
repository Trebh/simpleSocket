(function() {

  'use strict';

  var findId = require('./tasks/findId');
  var translateRead = require('./tasks/translateRead');
  var translateWrite = require('./tasks/translateWrite');
  var sendToClient = require('./tasks/sendToClient');

  // questo modulo e` solo un proxy per esporre i singoli metodi presenti
  // nella cartella Tasks

  module.exports = {
    findId: findId.findId,
    translateRead: translateRead.translateRead,
    translateWrite: translateWrite.translateWrite,
    sendToClient: sendToClient.sendToClient
  };


 
})();