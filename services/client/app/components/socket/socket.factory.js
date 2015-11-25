(function() {
  'use strict';

  angular.module('simpleSocket')
    .factory('socketFactory', socketFactory);

  function socketFactory() {

  	var socket = io.connect('http://localhost:3000');

  	socket.on('connection', console.log('socket ok'));

    var service = {
    	get: get
    };

    function get(){
    	return socket;
    }

    return service;
  }
})();