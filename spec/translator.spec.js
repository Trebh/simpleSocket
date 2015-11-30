'use strict';

var translator = require('../services/translator/translator.js');

describe('translateRead', function() {
  it('should translate hex string to a custom obj', function() {

    var fn = translator.translateRead;
    var stringToTest = '\u00022M|A|L|5B00CF0127\u0003';
    var data = {
      msg: stringToTest
    };

    expect(fn(data, nothing).event).toBe('2');
    expect(fn(data, nothing).eventType).toBe('M');
    expect(fn(data, nothing).action).toBe('A');
    expect(fn(data, nothing).code).toBe('390855590183');
  });
});

describe('translateWrite', function() {
  it('should respond with appropriate string to send to rfid', function() {

    var fn = translator.translateWrite;

    var red = {
      msg: 'red'
    };
    var yellow = {
      msg: 'yellow'
    };

    var green = {
      msg: 'green'
    };

    expect(fn(red, nothing)).toBe('\u000206|255000000|010|6|0000\u0003');
    expect(fn(yellow, nothing)).toBe('\u000206|255255000|010|5|0002\u0003');
    expect(fn(green, nothing)).toBe('\u000206|000255000|010|5|0002\u0003');
  });
});

function nothing() {
  return;
}