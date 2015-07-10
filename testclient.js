var socket = require('socket.io-client')('http://localhost:3000');

socket.on('connect', function(){
	console.log('connected');
});

socket.on('welcomemsg', function(msg){
	console.log('welcome message for me :', msg.data);
});

socket.emit('testEvent', '5B00CF0127');

socket.on('response', function(msg){
	console.log('got answer, yay! it was ', msg);
	socket.disconnect();
});


socket.on('disconnect', function(){
	console.log('disconneted');
});