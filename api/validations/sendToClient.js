(function() {

  'use strict';

  var Validation = require('data.validation');
  var Success = Validation.Success;
  var Check = require('core.check');
  var R = require('ramda');

  module.exports = {
    check: check
  };

  function check(infoObj) {

    if (infoObj.fatalErr && infoObj.fatalErr.length > 0) {
      return infoObj;
    }

    return isValid(infoObj).cata({
      Failure: function(error) {
        infoObj.fatalErr.push({
          err: error,
          where: 'sendToClient validation input'
        });
        return infoObj;
      },
      Success: function(value) {
        return value;
      }
    });

  }

  function isValid(infoObj) {

    return new Success(R.curryN(2, function() {
        return infoObj;
      }))
      .ap(Check.Object(infoObj))
      .ap(Check.Object(infoObj.data));
  }

})();