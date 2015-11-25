(function() {
  'use strict';

  angular.module('simpleSocket')
    .factory('socketFactory', socketFactory);

  socketFactory.$inject = ['$http', '$q'];

  function socketFactory($http, $q) {

    var socket;

    var service = {
      get: get
    };

    function get() {
      return $q(function(resolve, reject) {
        $http.get('/whoami')
          .success(function(res) {
            socket = io.connect(res);
            resolve(socket);
          })
          .error(function(err){
            reject(err);
          });
      });
    }

    return service;
  }
})();