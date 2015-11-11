var net = require('net');

//var HOST = '192.168.1.9';
var HOST = '127.0.0.1';
var PORT = 10001;

var client = new net.Socket();
client.connect(PORT, HOST, function() {

    console.log('CONNECTED TO: ' + HOST + ':' + PORT);
    client.write('02324d7C417C4c7C616131316161313161617C');

});

client.on('data', function(data) {
    
    console.log('risposta: ' + data);
    // Close the client socket completely
    client.destroy();
    
});

// Add a 'close' event handler for the client socket
client.on('close', function() {
    console.log('Connection closed');
});