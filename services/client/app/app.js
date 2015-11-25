(function() {
  'use strict';

  angular.module('simpleSocket', ['ui.router'])
  	.config(configure)
  	.run(runBlock);

  configure.$inject = [];
  
  function configure(){

  }	

  runBlock.$inject = ['$state'];

  function runBlock($state){
  	$state.go('dashboard');
  }

})();