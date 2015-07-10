var server = require('http').createServer();
var io = require('socket.io')(server);
var utilities = require('./utilities');
var service = require('./MSSQLservice');


io.on('connection', function(socket){
  socket.emit('welcomemsg', { data: 'muchdataSOsocket' });

  socket.on('testEvent', function(msg){
		console.log('got a request: ', msg);
		console.log('answering...');

		var converted = utilities.hexToDecimal(msg);
		service.testDB().then(function(result){
			console.log('DB OK ', result);
			io.emit('response', converted);
		}, function(err){
			console.log('DB KO ', err);
			io.emit('response', 'errors');
		});

		
	})
	socket.on('disconnect', function(){
		console.log('client closed connection');
	})
});


io.on('disconnect', function(){
	console.log('bye client');
});

server.listen(3000);