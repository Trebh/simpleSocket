'use strict';

var findId = require('../api/tasks/findId.js');

describe('processId', function() {

  var infoObjRes = 'pippo';

  beforeEach(function(done) {
    var apiFn = findId.findId;
    var infoObj = {
      fatalErr: [],
      errors: [],
      data: {
        receivedString: '\u00022M|A|L|5B00CF0127\u0003',
        user: {
          warn: []
        },
        translatedString: {
          event: '2',
          action: 'A',
          code: '390855590183',
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
    'should process an input rfid and respond with user info',
    function(done) {

      expect(infoObjRes.data.user.nome).toContain('DAVID');
      expect(infoObjRes.data.user.cognome).toContain('CHIAPPETTA');
      expect(infoObjRes.data.user.sesso).toBe('M');
      expect(infoObjRes.data.user.scadenzaQuotaAss).toBe(
        '2016-08-31T00:00:00.000Z');
      expect(infoObjRes.data.user.scadenzaCm).toBe(
        '2015-12-04T00:00:00.000Z');
      expect(infoObjRes.data.user.scadenzaAbb).toBe(
        '2016-02-02T00:00:00.000Z');
      done();
    }, 10000);
});

function handleError(err) {
  console.log(err);
  throw err;
}