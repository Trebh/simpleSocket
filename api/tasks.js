(function() {

  'use strict';

  var findId = require('./tasks/findId');
  var translateRead = require('./tasks/translateRead');
  var translateWrite = require('./tasks/translateWrite');
  var sendToClient = require('./tasks/sendToClient');
  var writeAccess = require('./tasks/writeAccess');
  var getConfig = require('./tasks/getConfig');

  // questo modulo e` solo un proxy per esporre i singoli metodi presenti
  // nella cartella Tasks

  module.exports = {
    findId: findId.findId,
    translateRead: translateRead.translateRead,
    translateWrite: translateWrite.translateWrite,
    sendToClient: sendToClient.sendToClient,
    writeAccess: writeAccess.writeAccess,
    getConfig:getConfig.getConfig
  };


 
})();