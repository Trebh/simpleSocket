'use strict';

module.exports = function userSearch( options ) { 
  var senecaThis = this;

  senecaThis.add( 'role:main,cmd:search', function search( msg, respond ) {

    //dbsearchlogic
    var userid = msg.rfid + 1000;

    respond( null, {idgiocatore: userid});
    
  })

}
