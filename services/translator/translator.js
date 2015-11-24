'use strict';

var R = require('ramda');
var utility = require('simpleSocketUtils');
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

  var toBeTranslated = Validation.fromNullable(data.msg);
  var translated = toBeTranslated.map(iterateMaybe);

  respond(null, {
    answer: translated.getOrElse('?')
  });

  return translated.getOrElse('?');
}

function translateWrite(data, respond) {

  var command = data.msg;

  var RGB, rele, sound;

  if (command === 'red') {
    RGB = '255000000';
    rele = '0000';
    sound = utility.errorSnd;
  } else if (command === 'yellow') {
    RGB = '255255000';
    rele = '0002';
    sound = utility.confirmSnd;
  } else if (command === 'green') {
    RGB = '000255000';
    rele = '0002';
    sound = utility.confirmSnd;
  }

  var okString = prepareString([utility.select,
    utility.setOutputs,
    utility.separator,
    RGB,
    utility.separator,
    '010',
    utility.separator,
    sound,
    utility.separator,
    rele,
    utility.ETX
  ]);

  var answer = okString;

  respond(null, {
    answer: answer
  });

  return answer;
}

function iterateMaybe(data) {
  var fn = R.compose(toObject, R.replace(utility.STX, ''), R.replace(utility.STX,
    ''));
  return fn(data);
}

function prepareString(string) {
  return R.compose(R.reduce(R.add(), ''),
    R.prepend(utility.STX))(string);
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

  if (R.test(/OK/, goodParts)){
    tplObj.code = 'OK';
    return tplObj;
  }

  var codeRegex = /\w{2}\|\w\|\w\|(\w+)/;
  var actionRegex = /\w{2}\|(\w)\|\w\|\w+/;
  var eventRegex = /(\w)\w\|\w\|\w\|\w+/;
  var eventTypeRegex = /\w(\w)\|\w\|\w\|\w+/;
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