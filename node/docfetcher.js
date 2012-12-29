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

function DocFetcher(max_doc_size, fetch_timeout_in_sec){
    this.docs_being_fetched = {};
    this.timeout = fetch_timeout_in_sec * 1000;
    this.max_doc_size = max_doc_size;
    this.cache = undefined;
    this.conmgr = undefined;
}

// the connection_ids in 'awaiting' expect a document that hashes to
// the given hash
function fetch(hash, awaiting){
    if(!Array.isArray(awaiting)){
        awaiting = [awaiting];
    }
    if(hash in this.docs_being_fetched){
        // already being fetched
        for(new_awaiting in awaiting)
            if(this.docs_being_fetched[hash].awaiting.indexOf(new_awaiting) < 0)
                this.docs_being_fetched[hash].awaiting.push(new_awaiting);
        return;
    }
    // create a new entry in docs_being_fetched
    var providers = [];
    var known = this.cache.find_by_hash(hash);
    var all = this.conmgr.list();
    providers.push.apply(providers, known);
    for(idx in all)
        if(!(all[idx] in known))
            providers.push(all[idx]);

    this.docs_being_fetched[hash] = 
        { providers: providers,
          awaiting: awaiting };
    this.fetch_top(hash);
}

// fetch the top document in providers
function fetch_top(hash){
    //if list is empty, send UNAVAILABLE response to every con_id in awaiting
    if (this.docs_being_fetched[hash].providers.length < 1)
        return this.unavailable(hash);

    this.docs_being_fetched[hash].contacted = -1; // being contacted
    var self = this;
    process.nextTick(function(){
        self.docs_being_fetched[hash].contacted = new Date();
        self.conmgr.send(self.docs_being_fetched[hash].providers[0], 
                         JSON.stringify({ 'command' : 'FETCH', 'hash' : hash }));
    });
}

// tell the connections in awaiting the document is unavailable
function unavailable(hash){
    var self=this;
    this.docs_being_fetched[hash].awaiting.forEach(function(other_id){
        process.nextTick(function(){
            self.conmgr.send(other_id,
                             JSON.stringify({ 'response' : 'UNAVAILABLE', 
                                              'hash' : hash }));
        });
    });
    delete this.docs_being_fetched[hash];
}
        
// a connection have disconnected, delete it from providers and
// awaiting. If needed fetch from next or unavailable if last
function disconnect(connection_id){
    for(hash in this.docs_being_fetched){
        var pos = this.docs_being_fetched[hash].providers.indexOf(connection_id);
        if(pos >= 0)
            this.docs_being_fetched[hash].providers.splice(pos, 1);
        var pos2 = this.docs_being_fetched[hash].awaiting.indexOf(connection_id);
        if(pos2 >= 0)
            this.docs_being_fetched[hash].awaiting.splice(pos2, 1);
        if(pos == 0){
            if(this.docs_being_fetched[hash].length == 0){
                this.unavailable(hash);
            }else{
                this.fetch_top(hash);
            }
        }
    }
}

// document received, broadcast to awaiting
function received(hash, document){
    if(!(hash in this.docs_being_fetched))
        return console.error("Received '"+ hash + "', not being awaited for.");
    var self=this;
    this.docs_being_fetched[hash].awaiting.forEach(function(connection_id){
        process.nextTick(function(){
            self.conmgr.send(connection_id, document);
        });
    });
    delete this.docs_being_fetched[hash];
}

// new connection, add to providers
function new_connection(connection_id){
    for(hash in this.docs_being_fetched){
        this.docs_being_fetched[hash].providers.push(connection_id);
    }
}

// a certain connection notifies it doesn't have a given hash
function not_found(connection_id, hash){
    //remove connection_id from docs_being_fetched[hash]
    var pos = this.docs_being_fetched[hash].providers.indexOf(connection_id);
    if(pos == -1)
        // not there, bail out
        return;

    this.docs_being_fetched[hash].providers.splice(pos, 1);

    if(pos == 0)
        this.fetch_top(hash);
}

function heartbeat(){
    //When a doc has waited long enough for a given connection_id,
    var now = new Date();

    for(hash in this.docs_being_fetched){
        if(this.docs_being_fetched[hash].contacted < 0)
            continue;
        if(this.timeout > now - this.docs_being_fetched[hash].contacted)
            this.not_found(this.docs_being_fetched[hash].providers[0], hash);
    }
}

DocFetcher.prototype.fetch = fetch;
DocFetcher.prototype.fetch_top = fetch_top;
DocFetcher.prototype.disconnect = disconnect;
DocFetcher.prototype.received = received;
DocFetcher.prototype.new_connection = new_connection;
DocFetcher.prototype.heartbeat = heartbeat;
DocFetcher.prototype.unavailable = unavailable;
DocFetcher.prototype.not_found = not_found;

module.exports = DocFetcher;
