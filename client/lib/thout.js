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

    ws_connection.onmessage = function (e) {
        alert('Server: ' + e.data);
    };

    // document is:
    /*
      Content-Type: text/plain
      
      hello thout!
    */
    ws_connection.onopen = function(e) {
//        ws_connection.send(JSON.stringify({'command' : 'REGISTER', 'hash':'33f18381ee266926e1539f2412a0771a72b09d0b039d931348acaeefc682d2e9' }));
    }
}

var doc="Content-Type: text/plain\n\nhello thout!\n";

function tmpsend(){
    var hash = CryptoJS.SHA256(doc);
    
    document.querySelector('#outputhash').innerHTML = hash;

    ws_connection.send(JSON.stringify({'command' : 'REGISTER', 'hash': hash.toString() }));
}


