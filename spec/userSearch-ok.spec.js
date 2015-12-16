'use strict';

var findId = require('../api/tasks/findId.js');

describe('processOkId', function() {

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
          code: '42953729071',
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
    'should process an input rfid and answer ok',
    function(done) {

      expect(infoObjRes.data.user.nome).toContain('OK');
      expect(infoObjRes.data.user.cognome).toContain('AAA');
      expect(infoObjRes.data.user.sesso).toBe('M');
      expect(infoObjRes.errors.length).toBe(0);
      expect(infoObjRes.data.user.warn.length).toBe(0);
      expect(infoObjRes.data.user.checkEntrateCorsi).toBe('ko');
      expect(infoObjRes.data.user.checkIngressi).toBe('ok');
      done();
    }, 30000);
});

function handleError(err) {
  console.log(err);
  throw err;
}