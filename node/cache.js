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

function Cache(){
    this.connection_to_hash = {}; // connection to object hash -> notified
    this.hash_to_connection = {}; // hash to list of connection, sort by notified
    this.connection_meta = {}; // connection to object
       // known keys: 'number_of_slots'
    this.DEFAULT_NUMBER_OF_SLOTS = 10; //TODO move to a config
}

// return the list of connection_ids that might have that hash,
// ordered by likelihood of having the hash
function find_by_hash(hash){
    return this.hash_to_connection[hash];    
}

// invalidate a connection_id (or just a hash for a given
// connection_id)
function invalidate(connection_id, hash) {
    if(!(connection_id in this.connection_to_hash))
        return; // shouldn't happen, bail out
    if(!(hash in this.hash_to_connection))
        return; // shouldn't happen, bail out

    if(hash !== undefined){
        delete this.connection_to_hash[connection_id][hash];
        var pos = this.hash_to_connection[hash].indexOf(connection_id);
        if(pos > 0)
            this.hash_to_connection[hash].split(pos,1);
        return;
    }
    // drop all for a given connection_id
    delete this.connection_to_hash[connection_id];
    for(hash in this.hash_to_connection){
        var pos = this.hash_to_connection[hash].indexOf(connection_id);
        if(pos > 0)
            this.hash_to_connection[hash].split(pos,1);
    }
}

// internal function signaling a new connection
function new_connection(connection_id){
    this.connection_to_hash[connection_id]={};
    this.connection_meta[connection_id] = { 
        'number_of_slots' : this.DEFAULT_NUMBER_OF_SLOTS 
    };
}    

// we now know that connection_id has a given hash
function validate(connection_id, hash) {
    if(!(connection_id in this.connection_to_hash))
        this.new_connection(connection_id);

    if(!(hash in this.hash_to_connection))
        this.hash_to_connection[hash] = {};

    this.connection_to_hash[connection_id][hash] = new Date();
    // move connection_id to head
    var pos = this.hash_to_connection[hash].indexOf(connection_id);
    if(pos > 0)
        this.hash_to_connection[hash].split(pos,1);
    this.hash_to_connection[hash].splice(0,0,connection_id);
}

// inform the cache of the capacity of a given node
function capacity(connection_id, number_of_slots) {
    if(!(connection_id in this.connection_to_hash))
        this.new_connection(connection_id);
    this.connection_meta[connection_id].number_of_slots = number_of_slots;
}

// A random sample of hashes, maybe biased by popularity
function list(max_number_of_docs) {
    var result = [];
    var other = [];
    // Fisher-Yates up to max_number_of_docs, this should be much more
    // efficient if max_number_of_docs <~much~smaller~< number of hashes
    for(var i=0; i<max_number_of_docs; i++){
        if(i == this.hash_to_connection.length)
            return result;

        var j = i + parseInt(Math.random() * (this.hash_to_connection.length - i));
        var temp = other[j] === undefined ? this.hash_to_connection[j] : other[j];
        other[j] = other[i] === undefined ? this.hash_to_connection[i] : other[i];
        result[i] = temp;
    }
    return result;
}
   
// Balance cache and issues DOCFETCHER->fetch(hash, [connection_id]) as needed
function heartbeat() {
    //TODO
}

Cache.prototype.find_by_hash = find_by_hash;
Cache.prototype.invalidate = invalidate;
Cache.prototype.validate = validate;
Cache.prototype.new_connection = new_connection;
Cache.prototype.capacity = capacity;
Cache.prototype.list = list;
Cache.prototype.hearbeat = hearbeat;

module.exports = Cache;
