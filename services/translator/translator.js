'use strict';

var R = require('ramda');
var utility = require('../../utilities');
var Validation = require('data.validation');

module.exports = {
  translator: translator,
  translateRead: translateRead,
  translateWrite: translateWrite
};

function translator() {
  var senecaThis = this;

  senecaThis.add('role:main,cmd:translateRead', translateRead);
  senecaThis.add('role:main,cmd:translateWrite', translateWrite);

}

function translateRead(data, respond) {

  var toBeTranslated = data.msg;
  var translated = toBeTranslated.map(iterateMaybe);

  respond(null, {
    answer: translated
  });

  return translated.getOrElse('?');
}

function translateWrite(data, respond) {

  var validationObj = data.msg;

  var RGBgreen = '000255000';
  var RGBred = '255000000';

  var RGB = validationObj.isFailure() ? RGBred : RGBgreen;

  var okString = prepareString([utility.select, utility.setOutputs,
    utility.separator, RGB,
    utility.separator, '010',
    utility.separator,
    utility.confirm, utility.separator, '0002', utility.ETX
  ]);

  var answer = okString;

  respond(null, {
    answer: answer
  });

  return answer;
}

function getRespString() {

}

function iterateMaybe(data) {
  var fn = R.compose(toObject, R.replace(utility.STX, ''), R.replace(utility.STX,
    ''));
  return fn(data);
}

function prepareString() {
  return R.compose(R.reduce(R.add(), ''),
    R.reduce(R.add(), ''),
    R.prepend(utility.STX));
}

/*function hexDecode(hexChar) {
  return String.fromCharCode(parseInt(hexChar, 16));
}

function isNotSeparator(el) {
  return !R.equals(el, '|');
}

function isNotStartEnd(el) {
  return !(R.equals(el, utility.STX) || R.equals(el, utility.STX));
}*/

function toObject(goodParts) {
  var tplObj = {
    event: null,
    action: null,
    code: null
  };

  var codeRegex = /\w{2}\|\w\|\w\|(\w{10})/;
  var actionRegex = /\w{2}\|(\w)\|\w\|\w{10}/;
  var eventRegex = /(\w)\w\|\w\|\w\|\w{10}/;
  var eventTypeRegex = /\w(\w)\|\w\|\w\|\w{10}/;
  var getEvent = R.compose(R.last(), R.match(eventRegex));
  var getAction = R.compose(R.last(), R.match(actionRegex));
  var getCode = R.compose(R.last(), R.match(codeRegex));
  var getEventType = R.compose(R.last(), R.match(eventTypeRegex));

  tplObj.event = getEvent(goodParts);
  tplObj.action = getAction(goodParts);
  tplObj.code = getCode(goodParts);
  tplObj.eventType = getEventType(goodParts);

  return tplObj;
}

/*function strToHex(str) {
  return str.charCodeAt(0).toString(16);
}*/