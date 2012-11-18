/* 
Copyright (c) 2012 Pablo Duboue

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var websocket = require('websocket'), 
http = require('http'),
static = require('node-static');

function start(external_ip, conmgr, torchecker) {
    var client_files = new(static.Server)('../client');
    var server = http.createServer(function(request, response) {
	request.addListener('end', function () {
	    if(!torchecker.check(request.connection)){
		if(!/\/images\//.test(request.url) &&
		   !/\/favicon.ico/.test(request.url)){
		    request.url='/no_tor.html';
		}
	    }
	    // Serve files
	    client_files.serve(request, response);
	});
    });

    var wsServer = new (websocket.server)({
	httpServer: server
    });

    wsServer.on('request', function(request) {
	var connection = request.accept(null, request.origin);
	if(torchecker.check(request))
	   conmgr.new_connection(connection);
    });

    server.listen(8080, external_ip);
}

exports.start = start;
