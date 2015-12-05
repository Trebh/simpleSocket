'use strict';

var findId = require('../api/tasks/findId.js');

describe('process Isc Err', function() {

  var infoObjRes = {};

  beforeEach(function(done) {
    var apiFn = findId.findId;
    var infoObj = {
      fatalErr: [],
      errors: [],
      data: {
        receivedString: '\u00022M|A|L|0A003DE42F\u0003',
        user: {
          warn: []
        },
        translatedString: {
          event: '2',
          action: 'A',
          code: '42953698173',
          eventType: 'M'
        },
        response: {}
      }
    };

    apiFn(infoObj).fork(handleError, function(res) {
      infoObjRes = res;
      done();
    });
  });

  it(
    'should process an input rfid and answer iscr err',
    function(done) {

      expect(infoObjRes.data.user.nome).toContain('ISCR');
      expect(infoObjRes.data.user.cognome).toContain('AAA');
      expect(infoObjRes.errors).toContain('quota associativa scaduta');
      done();
    }, 20000);
});

function handleError(err) {
  console.log(err);
  throw err;
}