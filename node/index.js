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



var fs = require("fs"),
torchecker = require("torchecker"),
server = require("./server"),
Controller = require("./controller"),
Cache = require("./cache"),
ConMgr = require("./conmgr"),
DocFetcher = require("./docfetcher");

// read config file


var config_data = fs.readFileSync('./config.json');
var config = JSON.parse(config_data); // might fail

console.assert(config.EXTERNAL_IP);
console.assert(config.MAX_DOC_SIZE);
console.assert(config.MAX_MEM);
console.assert(config.REPLICATION_LEVEL);
console.assert(config.DEFAULT_NUMBER_OF_SLOTS);
console.assert(config.FETCH_TIMEOUT_IN_SECS);

var cache = new Cache(config.MAX_MEM, config.REPLICATION_LEVEL, config.DEFAULT_NUMBER_OF_SLOTS);
var docfetcher = new DocFetcher(config.MAX_DOC_SIZE, config.FETCH_TIMEOUT_IN_SECS);
if(config.DEBUG === undefined || !config.DEBUG)
    torchecker.start(config.EXTERNAL_IP);
else
    torchecker = null;
cache.docfetcher = docfetcher;
var controller = new Controller(cache, docfetcher);
var conmgr = new ConMgr(controller);
conmgr.add_listener(cache);
conmgr.add_listener(docfetcher);
docfetcher.conmgr = conmgr;
docfetcher.cache = cache;

server.start(config.EXTERNAL_IP, conmgr, torchecker);
