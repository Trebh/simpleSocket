(function() {
    'use strict';

    angular.module('simpleSocket')
      .directive('simpleNotification', simpleNotification);

    function simpleNotification() {

      var directive = {
        link: link,
        templateUrl: 'app/components/simpleNotification/simpleNotification.html',
        restrict: 'E',
        scope:{
        	errors: '=',
        	warn: '='
        }
      };
      return directive;

      function link(scope, element, attrs) {
        /* */
      }

  }
})();