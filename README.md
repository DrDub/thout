thout
=====

Distributed Document Storage using Web Browser cache for
leaks-oriented sites.

A leaks site that only exists within every reader's Web broswer.


Advantages
----------

* Server hosts no data.
* Single point of failure (server) can be replaced quickly.
* If the server rejects data, the server can be moved someplace else
* Documents that are not being accessed are 'forgotten'
* People wanting to donate bandwidth and disk space can run a Chrome
  extension.


Technical details
-----------------

Three components:

* Regular site client JS (CLIENT)
* NodeJS server (NODE)

When CLIENT access NODE, NODE will check whether CLIENT is coming from
a tor exit node, if not will explain the user the need to use tor and
offer a link to download the tor bundle.

For tor-shielded CLIENTs, the default landing page will contain a list
of the currently-known to the NODE hashes, plus the number of active
connection. The CLIENT will also immediately start downloading
documents through the NODE as the NODE sees fit.

When the CLIENT access a hash, the NODE checks whether it knows an
active connection with that hash. Otherwise it will exhaustively ask
all other connections for the hash, starting with the CHROME clients.

When CLIENT is asked for a document via a hash, it will check whether
the hash is stored and return it, otherwise it will indicate it
doesn't has the document.

Extended CLIENTs could use a Chrome Extension (CHROME) or a full
fledged node.js program that stores all known documents and even
connects multiple servers together (GATEWAY). For example, CHROME
could operate in the background and stores a much larger number of
documents.

NODE is expected to run completely in RAM without storing no logs of
any type. It keeps in RAM a sparse matrix of hashes vs. connections,
distributing documents to connections to enforce a minimum number of
replicated documents.

The documents are replicated fully and have a maximum size. The only
crypto code involved is computing full document hashes.

Indexing and browsing documents is expected to be done on a different
site and are outside of this project.

Protocol
--------

The communication between the CLIENT and NODE:

* From Client: JSON { 'command' : 'FETCH' , 'hash' : hash }
* From Client: JSON { 'command' : 'REGISTER', 'hash' : hash }
* From Client: JSON { 'command' : 'AVAILABLE', 'number_of_slots' : number }
* From Client: JSON { 'command' : 'LIST', 'number_of_hashes' : number }
* From Client: JSON { 'response' : 'UNAVAILABLE', 'hash' : hash }
* From Client: binary data (document)
* From Node: JSON { 'command' : 'FETCH', 'hash' : hash }
* From Node: JSON { 'response' : 'UNAVAILABLE', 'hash' : hash }
* From Node: JSON { 'response' : 'LIST', 'hash' : [ hash ] } 
* From Node: binary data (document)


Related technology
------------------

* FreeNet: https://freenetproject.org/ 
* Tor: https://www.torproject.org/ 
* Tor Flash Proxy: https://crypto.stanford.edu/flashproxy/ 
* Persevere: http://code.google.com/p/persevere-framework/

About the name
--------------

Thout is an alternative spelling for the Egyptian god 'Thoth', which,
among many other things, "served as a mediating power, especially
between good and evil, making sure neither had a decisive victory over
the other" (according to Wikipedia).