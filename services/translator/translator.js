'use strict';

var Maybe = require('data.maybe');
var R = require('ramda');
var utility = require('../../utilities');

module.exports = {
  translator: translator,
  translateRead: translateRead,
  translateWrite: translateWrite
}

function translator() {
  var senecaThis = this;

  senecaThis.add('role:main,cmd:translateRead', translateRead);

  senecaThis.add('role:main,cmd:translateWrite', translateWrite);
};

function translateRead(data, respond) {

  console.log('prima: ' + data.msg);

  var toBeTranslated = Maybe.of(data.msg);
  var translated = toBeTranslated.map(iterateMaybe);

  console.log('traduzione.. ' + JSON.stringify(translated.get()));

  respond(null, {
    answer: translated.getOrElse('?')
  });

  return translated.getOrElse('?');
}

function translateWrite(data, respond) {

  var RGB;

  if (data.msg == 'green') {
    RGB = '000255000';
  }

  var fn = R.compose(R.reduce(R.add(), ''),
    R.reduce(R.add(), ''),
    R.prepend(utility.STX));

  var stringToSend = fn([utility.select, utility.setOutputs, 
    utility.separator, RGB, 
    utility.separator, '010', 
    utility.separator, 
    utility.confirm, utility.separator, '0002', utility.ETX]);

  console.log(stringToSend.toString());

  respond(null, {
    answer: stringToSend
  });

  return stringToSend;
}

function iterateMaybe(hexValue) {
  var fn = R.compose(toObject, R.map(hexDecode), R.match(/.{2}/g));
  return fn(hexValue);
}

function hexDecode(hexChar) {
  return String.fromCharCode(parseInt(hexChar, 16));
}

function isNotSeparator(el) {
  return !R.equals(el, '|');
}

function toObject(charArray) {
  var tplObj = {
    event: null,
    action: null,
    code: null
  };

  var goodParts = R.filter(isNotSeparator, charArray);
  var codeRegex = /\w*\|\w\|\w\|(\w{10})/;
  var getCode = R.compose(R.last(), R.match(codeRegex), R.reduce(R.add(), ''));

  var code = getCode(charArray);

  tplObj.event = goodParts[2];
  tplObj.action = goodParts[3];
  tplObj.code = code;

  return tplObj;
}

function strToHex(str) {
  return str.charCodeAt(0).toString(16);
}