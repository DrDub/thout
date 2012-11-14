/* Copyright (c) 2012 Pablo Duboue

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

function DocFetcher(max_doc_size){
    this.docs_being_fetched = {};
    // need to add a time to docs_being_fetched
    this.max_doc_size = max_doc_size;
    this.cache = undefined;
    this.conmgr = undefined;
}

function fetch(hash, awaiting){
    if(!Array.isArray(awaiting)){
	awaiting = [awaiting];
    }
    if(hash in this.docs_being_fetched){
	var this_awaiting = this.docs_being_fetched[hash].awaiting;
	this_awaiting.push.apply(this_awaiting, awaiting);
    }else{
	var providers = [];
	var known = cache.find_by_hash(hash);
	var all = conmgr.list();
	providers.push.apply(providers, known);
	for(idx in all)
	    if(!(all[idx] in known))
		providers.push(all[idx]);
	
	docs_being_fetched[hash] = 
	    { providers: providers,
	      awaiting: awaiting,
	      contacted: new Date() }
	process.nextTick(function(){
	    this.conmgr.send(providers[0], 
			     JSON.stringify({ 'command' : 'FETCH', 'hash' : hash }));
	});
    }
}
	
function disconnect(connection_id){
    for(idx in this.docs_being_fetched){
	var pos = this.docs_being_fetched[idx].providers.indexOf(connection_id);
	this.docs_being_fetched[idx].providers.splice(pos, 1);
	if(pos == 0){
	    if(this.docs_being_fetched[idx].length == 0){
		this.docs_being_fetched[idx].awaiting.forEach(function(other_id){
		    process.nextTick(function(){
			this.conmgr.send(other_id,
					 JSON.stringify({ 'response' : 'UNAVAILABLE', 
							  'hash' : hash }));
		    });
		});
	    }else{
		process.nextTick(function(){
		    this.conmgr.send(this.docs_being_fetched[idx].providers[0], 
				     JSON.stringify({ 'command' : 'FETCH', 'hash' : hash }));
		});
	    }
	}
    }
}

function received(hash, document){
    if(!(hash in this.docs_being_fetched))
	return console.error("Received '"+ hash + "', not being awaited for.");
    this.docs_being_fetched[hash].awaiting.forEach(function(connection_id){
	process.nextTick(function(){
	    this.conmgr.send(connection_id, document);
	});
    });
    delete this.docs_being_fetched[hash];
}

function new_connection(connection_id){
    this.docs_being_fetched.forEach(function(obj){
	obj.providers.push(connection_id);
    });
}

function not_found(connection_id, hash){
    //TODO remove connection_id from docs_being_fetched[hash] then move to next one and send fetch command
    //TODO if list is empty, send UNAVAILABLE response

}

function heartbeat(){
    //TODO if a doc has waited long enough for a given connection_id, move to next
    //TODO if list is empty, send UNAVAILABLE response
}

DocFetcher.prototype.fetch = fetch;
DocFetcher.prototype.disconnect = disconnect;
DocFetcher.prototype.received = received;
DocFetcher.prototype.new_connection = new_connection;
DocFetcher.prototype.heartbeat = heartbeat;

module.exports = DocFetcher;

