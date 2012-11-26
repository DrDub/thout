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
dsincluded in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.  
*/

function Cache(maxmem /* ignored */, replication_level, default_number_of_slots){
    this.hashes = []; // a list of all hashes
    this.connections = []; // a list of all hashes

    this.connection_to_hash = {}; // connection to list of hash
    this.connection_to_hash_time = {}; // connection to object hash -> notified
    this.connection_meta = {}; // connection to object
       // known keys: 
       //  'number_of_slots'
       //  'last_validated'
       //  'number_of_hashes'
    this.hash_to_connection = {}; // hash to list of connection, sort by notified
    
    this.DEFAULT_NUMBER_OF_SLOTS = default_number_of_slots;
    this.REPLICATION_LEVEL = replication_level;
    this.docfetcher = null;
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
        var pos;
        pos = this.connection_to_hash[connection_id].indexOf(hash);
        if(pos > 0)
            this.connection_to_hash[connection_id].splice(pos,1);
        delete this.connection_to_hash_time[connection_id][hash];
        this.connection_meta[connection_id].number_of_hashes--;
        pos = this.hash_to_connection[hash].indexOf(connection_id);
        if(pos > 0)
            this.hash_to_connection[hash].splice(pos,1);
        pos = this.connections.indexOf(connection_id);
        if(pos > 0)
            this.connections.splice(pos,1);
        return;
    }
    // drop all for a given connection_id
    delete this.connection_to_hash[connection_id];
    delete this.connection_to_hash_time[connection_id];
    for(hash in this.hash_to_connection){
        var pos = this.hash_to_connection[hash].indexOf(connection_id);
        if(pos > 0)
            this.hash_to_connection[hash].split(pos,1);
    }
    var pos = this.connections.indexOf(connection_id);
    if(pos > 0)
        this.connections.splice(pos,1);
}

// internal function for signaling a new connection
function new_connection(connection_id){
    this.connection_to_hash[connection_id] = [];
    this.connection_to_hash_time[connection_id] = {};
    this.connection_meta[connection_id] = { 
        'number_of_slots' : this.DEFAULT_NUMBER_OF_SLOTS,
        'last_validated' : new Date(),
        'number_of_hashes' : 0
    };
}    

// internal function for signaling a new hash
function new_hash(hash) {
    this.hash_to_connection[hash] = {};
    this.hashes.push(hash);
}    

// we now know that connection_id has a given hash
function validate(connection_id, hash) {
    if(!(connection_id in this.connection_to_hash))
        this.new_connection(connection_id);

    if(!(hash in this.hash_to_connection))
        this.new_hash(hash);

    var pos;
    pos = this.connection_to_hash[connection_id].indexOf(hash);
    if(pos > 0)
        this.connection_to_hash[connection_id].splice(pos,1);
    else
        this.connection_meta[connection_id].number_of_hashes++;

    this.connection_to_hash[connection_id].push(hash); // most recent hashes at the end
    this.connection_to_hash_time[connection_id][hash] = new Date();
    this.connection_meta[connection_id].last_validated = new Date();

    // move connection_id to head
    pos = this.hash_to_connection[hash].indexOf(connection_id);
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
    //TODO bias this by popularity

    var result = [];
    var other = [];
    // Fisher-Yates up to max_number_of_docs, this should be much more
    // efficient if max_number_of_docs <~much~smaller~< number of hashes
    for(var i=0; i<max_number_of_docs; i++){
        if(i == this.hashes.length)
            return result;

        var j = i + parseInt(Math.random() * (this.hashes.length - i));
        var temp = other[j] === undefined ? this.hashes[j] : other[j];
        other[j] = other[i] === undefined ? this.hashes[i] : other[i];
        result[i] = temp;
    }
    return result;
}
   
// Balance cache and issues DOCFETCHER->fetch(hash, [connection_id]) as needed
function heartbeat() {
    // the following code assumes it'll be called fairly often with
    // huge tables of hashes and connections so it just checks a few
    // connections and hashes

    var checked = {};
    var under_represented = [];
    var now = new Date();
    // find under-represented
    for(var i=0; i<50; i++){
        var hash = this.hashes[parseInt(Math.random() * this.hashes.length)];
        if(hash in checked)
            continue;
        checked[hash] = 1;
        if(this.hash_to_connection[hash].length < this.REPLICATION_LEVEL)
            under_represented.push(hash);
        else{
            // take the times to compute a timed average
            var expected = 0.0;
            for(connection_id in this.hash_to_connection[hash]){
                expected += 600000. / (now - this.connection_to_hash[connection_id][hash]);
                if(expected > this.REPLICATION_LEVEL)
                    // note that this will hold with only one document recent enough
                    break;
            }
            if(expected < this.REPLICATION_LEVEL)
                under_represented.push(hash);
        }
    }

    // find connections with available slots
    checked = {};
    for(var i=0; i<50; i++){
        var connection_id = this.connections[parseInt(Math.random() * this.connections.length)];
        if(connections in checked)
            continue;
        var should_send = false;
        if(this.connection_to_hash[connection_id].length <  this.connection_meta[connection_id].number_of_slots)
            should_send = true;
        else if(now - this.connection_meta[connection_id].last_validated > 3600000)
            should_send = true;
        if(should_send)
            for(var j=0; j<under_represented.length; j++){
                if(this.connection_to_hash_time[connection_id][under_presented] === undefined){
                    this.docfetcher.fetch(hash, connection_id);
                    under_represented.splice(j,1);
                    break;
                }
            }
    }
}

Cache.prototype.find_by_hash = find_by_hash;
Cache.prototype.invalidate = invalidate;
Cache.prototype.validate = validate;
Cache.prototype.new_connection = new_connection;
Cache.prototype.capacity = capacity;
Cache.prototype.list = list;
Cache.prototype.heartbeat = heartbeat;

module.exports = Cache;
