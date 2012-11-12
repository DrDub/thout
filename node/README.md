node.js Server for Distributed Document Storage using WebSockets
================================================================

This node.js server has three components:

* Cache Manager (CACHE)
* Fetch Manager (DOCFETCHER)
* Connection Manager (CONMGR)

The CACHE component maintains the table with a TTL.

The DOCFETCHER component maintains a table of documents being fetched
and connections waiting for a document, plus connections that need to
be asked for a particular document.

The CONMGR is aware of all existing connections and notifies the other
components for changes upon them.

CACHE
-----

* find_by_hash(hash): list[connection_id]
* invalidate(connection_id)
* invalidate(connection_id, hash)
* validate(connection_id, hash)
* capacity(connection_id, number_of_slots)
* list(max_number_of_docs): [hash]
  * A random sample of hashes, maybe biased by popularity
* heartbeat()
  * Balance cache and issues DOCFETCHER->fetch(hash, [connection_id]) as needed

DOCFETCHER
----------

* fetch(hash, awaiting: list[connection_id])
  * if hash in docs_being_fetched, add awating to docs_being_fecthed[hash]
  * otherwise: 
    * initialize docs_being_fetched[hash] with CACHE->find_by_hash(hash) + CONMRG->list())
    * send 'fetch' command to top of list
* disconnect(connection_id)
  * remove connection_id from all docs_being_fetched
    * if connection_id was top of list for anyone, send 'fetch' command to next
    * if list is empty, send UNAVAILABLE response
* received(hash, document)
  * send document to all docs_being_fetched[hash]
  * delete docs_being_fetched[hash]
* new_connection(connection_id)
  * add connection_id to the end of all docs_being_fetched
* hearbeat()
  * if a doc has waited long enough for a given connection_id, move to next
  * if list is empty, send UNAVAILABLE response

CONMGR
------

* register_listener(listener)
  * add component to listeners
* new_connection(connection): connection_id
  * add connection and generate an id for it
  * send event new_connection(connection_id) to listeners
* disconnect(connection)
  * send event disconnect(connection_id) to listeners
* send(connection_id, data)
* list(): list[connection_id]

Events
------

* Client with given connection_id sends 'fetch' hash command: 
  * DOCFETCHER->fetch(hash, connection_id)
* Client with given connection_id sends 'register' hash command:
  * CACHE->validate(connection_id, hash)
* Client with given connection_id sends 'available' number_of_slots command:
  * CACHE->capacity(connection_id, number_of_slots)
* Node sends document to client
  * Always succeeds, if the document is correctly received the client will issue a register
* Node issues a heartbeat to CACHE, DOCFETCHER
  * See heartbeat method description for each
* Client with given connection_id sends document
  * Compute hash (maybe asynchronously)
  * CACHE->validate(connection_id, hash)
  * DOCFETCHER->received(hash, document)
* Client disconnects
  * CONMGR->disconnect(client)
* Client connects
  * CONMGR->new_connection(client)
* Client with given connection_id sends 'list' number_of_hashes:
  * send to client 'list' response with CACHE->list(number_of_hashes)


Dependencies
------------

Node dependencies (NPM):

* node-static
* websocket
