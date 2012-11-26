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

function ConMgr(controller){
    this.last_id = 0;
    this.connections = [];
    this.listeners = [];
    this.controller = controller;
}

function new_connection(connection){
    var id = this.last_id;
    if(this.last_id === 9007199254740992){
        console.error("Connection counter looping");
        for(id=0; id<this.connections.length; id++){
            if(this.connections[id] === undefined){
                break;
            }
        }
    }else{
        this.last_id++;
    }

    this.connections[id] = connection;
    this.listeners.forEach(function(listener){
        listener.new_connection(id);
    });
    var self = this;
    connection.on('message', function(message) {
        console.log(message);
        self.controller.message(id, message);
    });
        
    connection.on('close', function(connection) {
        // close connection
        delete self.connections[id];
        self.listeners.forEach(function(listener){
            listener.disconnect(id);
        });
    });
    return id;
}

function add_listener(listener){
    this.listeners.push(listener);
}

function send(connection_id, message){
    if(this.connections[connection_id] === undefined){
        return console.error("Trying to send on a drop connection");
    }
    this.connections[connection_id].send(message);
}

function list(){
    var results=[];
    for(id in this.connections)
        results.append(id);
    return results;
}

ConMgr.prototype.new_connection = new_connection;
ConMgr.prototype.add_listener = add_listener;
ConMgr.prototype.list = list;
ConMgr.prototype.send = send;

module.exports = ConMgr;
