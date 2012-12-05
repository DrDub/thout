node.js Client for Distributed Document Storage
===============================================

Components:

* Controller (handles communication with server)
* Doc Manager (manages docs hosted/requested)
* Interface Engine (provides services to user through browser)

CONTROLLER
----------

* Handles communication with the server

Pseudo-code

- open websocket
- connect to server (where to get IP?)
- tell server number of slots
- wait for directions from server
- wait for directions from user

DOCMANAGER
----------

* Maintains a list of documents currently hosted by the client
* Juggles documents hosted when new ones are added, within number_of_slots and MAX_MEM
* Loads documents into memory from hard disk for local sources

UIENGINE
--------

* Provide various functions to the user
