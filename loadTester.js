'use strict';

var cp = require('child_process');

/*for (var i = 0; i < 20; i++){
  spawn();
}*/

var tot = 0;

setInterval(spawn, 1000);

function spawn(){
  if (tot >= 20){
    return;
  }
  tot++;
  return cp.fork('./testtcpclient.js');
}

