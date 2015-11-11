'use strict';

module.exports = function searchDetails( options ) { 
  var seneca = this;

  seneca.add( 'role:main,cmd:search, foundid:true', function details( msg, respond ) {

    //dbsearchlogic
    var name = 'pippo';

    respond( null, {details:name});

  })

}
