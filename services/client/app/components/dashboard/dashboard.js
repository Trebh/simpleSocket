(function() {

  'use strict';

  angular.module('simpleSocket')
    .config(function($stateProvider) {
      $stateProvider
        .state('dashboard', {
          url: '/',
          templateUrl: 'app/components/dashboard/dashboard.html',
          controller: 'DashboardCtrl as dashboard'
        });
    });

})();