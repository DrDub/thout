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

var ws_connection = null;
var NUMBER_OF_SLOTS = 10;

var cache_docs=[];
var cache_hashes=[];
var cache_index={};
var cache_count=0;

function setup(){
    var i=2;
    var el = document.querySelector("#scr"+i);
    while (el != null){
      el.style.visibility = 'hidden';
      i++;
      el = document.querySelector("#scr"+i);
    }
    $.ajax({
        url: "/status",
        context: document.body
    }).done(function(data) {
        document.querySelector('#serverstats').innerHTML = JSON.stringify(data);
    });

    for(var i=0;i<NUMBER_OF_SLOTS;i++){
        cache_docs.push(null);
        cache_hashes.push(null);
    }
}

function connect(){
    if(ws_connection !== null)
        return;

    document.querySelector("#scr1").style.visibility = 'hidden';
    document.querySelector("#scr2").style.visibility = 'visible';

    ws_connection = new WebSocket('ws://localhost:8080/', ['thout']);

    ws_connection.onerror = function (error) {
        console.log('WebSocket Error ' + error);
    };

    ws_connection.onmessage = function (message) {
        console.log('Message received:');
        console.log(message);
        console.log(message.type);
        console.log(message.data);
        if(message.type === "binary" || message.data.constructor === Blob){
            // document, hash it and store it
            var pos=0;
            if(cache_count === 10)
                pos = parseInt(Math.random()*10);
            else
                while(pos<10){
                    if(cache_hashes[pos] === null)
                        break;
                    pos++;
                }
            if(cache_hashes[pos] != null)
                delete cache_index[cache_hashes[pos]];
            else
                cache_count++;

            var binaryData = message.type === "binary" ? message.binaryData : message.data;
            var f = new FileReader();
            f.onload = function(e) {
                var doc = e.target.result;

                console.log(binaryData);
                console.log("Doc = " + doc);

                var hash = CryptoJS.SHA256(doc).toString();
                cache_hashes[pos] = hash;
                cache_docs[pos] = binaryData;
                cache_index[hash] = pos;
                console.log("Received document hash "+hash);
                setTimeout(function(){
                    ws_connection.send(JSON.stringify({'command' : 'REGISTER', 'hash': hash }));
                }, 0);
            };
            f.readAsText(binaryData);
        
        }else{
            var json = JSON.parse(message.data);
            if(json.command === 'FETCH'){
                if(json.hash in cache_index){
                    console.log("Sending hash "+json.hash);
                    setTimeout(function(){
                        ws_connection.send(cache_docs[cache_index[json.hash]].buffer);
                    }, 0);
                }else{
                    console.log("Hash "+json.hash +" not found");
                    setTimeout(function(){
                        ws_connection.send(JSON.stringify({'response' : 'UNAVAILABLE', 'hash': hash }));
                    }, 0);
                }
            }else if(json.command === 'UNAVAILABLE'){
                //TODO
            }else if(json.command === 'LIST'){
                //TODO
            }else{
                // error
            }
        }
    };

    // document is:
    /*
      Content-Type: text/plain
      
      hello thout!
    */
    ws_connection.onopen = function(e) {
        ws_connection.send(JSON.stringify({'command' : 'AVAILABLE', 'number_of_slots' : NUMBER_OF_SLOTS}));
    }
//        ws_connection.send(JSON.stringify({'command' : 'REGISTER', 'hash':'33f18381ee266926e1539f2412a0771a72b09d0b039d931348acaeefc682d2e9' }));
}

var doc="Content-Type: text/plain\n\nhello thout!\n";

function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint16Array(buf));
}

function str2ab(str) {
  var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
  var bufView = new Uint16Array(buf);
  for (var i=0, strLen=str.length; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

function string2ArrayBuffer(string, callback) {
    //var bb = new BlobBuilder();
    //bb.append(string);
    var f = new FileReader();
    f.onload = function(e) {
        callback(e.target.result);
    }
    f.readAsArrayBuffer(new Blob(string)); //bb.getBlob());
}

function arrayBuffer2String(buf, callback) {
    //var bb = new BlobBuilder();
    //bb.append(buf);
    var f = new FileReader();
    f.onload = function(e) {
        callback(e.target.result)
    }
    f.readAsText(new Blob(buf));//bb.getBlob());
}

function str_to_utf8(str) {
    var buffer = [];
    for(var i=0; i<str.length; i++){
        var c = str.charCodeAt(i);
        var bs = new Array();
        if (c > 0x10000){
            // 4 bytes
            bs[0] = 0xF0 | ((c & 0x1C0000) >>> 18);
            bs[1] = 0x80 | ((c & 0x3F000) >>> 12);
            bs[2] = 0x80 | ((c & 0xFC0) >>> 6);
            bs[3] = 0x80 | (c & 0x3F);
        }else if (c > 0x800){
            // 3 bytes
            bs[0] = 0xE0 | ((c & 0xF000) >>> 12);
            bs[1] = 0x80 | ((c & 0xFC0) >>> 6);
            bs[2] = 0x80 | (c & 0x3F);
        }else if (c > 0x80){
            // 2 bytes
            bs[0] = 0xC0 | ((c & 0x7C0) >>> 6);
            bs[1] = 0x80 | (c & 0x3F);
        }else{
            // 1 byte
            bs[0] = c;
        }
        for(var j=0; j<bs.length; j++){
            var b = bs[j];
            buffer.push(b);
        }
    }
    return buffer;
}
    
function tmpsend(){
    var bytes=str_to_utf8(doc);
    var ui8arr = new Uint8Array(bytes);
    var hash = CryptoJS.SHA256(doc).toString();

    document.querySelector('#outputhash').innerHTML = hash;
    cache_count++;
    cache_docs[0] = ui8arr;
    cache_index[hash] = 0;
    cache_hashes[0] = hash;
    
    ws_connection.send(JSON.stringify({'command' : 'REGISTER', 'hash': hash }));
}


