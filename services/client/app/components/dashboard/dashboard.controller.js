(function() {
  'use strict';

  angular.module('simpleSocket')
    .controller('DashboardCtrl', DashboardCtrl);

  DashboardCtrl.$inject = ['socketFactory', '$scope'];

  function DashboardCtrl(socketFactory, $scope) {

    var vm = this;

    vm.data = {};
    vm.errors = [];
    vm.warn = [];
    vm.isDataEmpty = isDataEmpty;

    var io = socketFactory.get();
    io.on('rfidReading', show);

    function show(data) {

      vm.data = {};

      vm.errors = data.msg.fatalErr;

      vm.errors = data.msg.errors;

      vm.data = data.msg.data;
      $scope.$apply();
    }

    function isDataEmpty() {
      return (Object.getOwnPropertyNames(vm.data).length === 0);
    }

  }

})();