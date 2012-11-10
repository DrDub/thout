var WebSocketServer = require('websocket').server;
var http = require('http');
var static = require('node-static');

var client_files = new(static.Server)('../client');

var server = http.createServer(function(request, response) {
    request.addListener('end', function () {
        // Serve files
        client_files.serve(request, response);
    });
});

server.listen(8080);

var wsServer = new WebSocketServer({
    httpServer: server
});

wsServer.on('request', function(request) {
    var connection = request.accept(null, request.origin);
    connection.on('message', function(message) {
	if (message.type === 'utf8') {
	    // process message
	}
    });

    connection.on('close', function(connection) {
	// close connection
    });
});