# Terminology
## Route Types
- external
- internal
- system

## Node States
connected = true if a socket is open, false if not.
online = true if has connected and had at least one full sync

## Node Health
healthy = node is fully functional, accept all routes
unhealthy = node has conflicts, accepts only system routes
critical = node had conflicts, but could not resolve them

# Node Workflow
- Process starts
- Status is unhealthy
- Attempts to join any previous known nodes
- Attempts to join any specified nodes in options
- Server is started, for system communication only
- Wait until 51% of node are online
- Resolve any conflicts
- Status is healthy
- Server accepts all communication

# Health
When a node comes online, it's default state is "unhealthy".

A node can be in only one of the following states:
- healthy = is online, can communicate and is ready for querying
- unhealthy = is online, can communicate but only for system commands
- fatal = is online, but has conflicts that it's unable to resolve
- offline = is offline and can't do anything

When a node establishes a connection with another node, it learns about any conflicts that node knows about, and adds them to it's own conflict array.

If there are any conflicts, they are resolved (see [conflicts](#conflicts) section). If there are none, or once they are all resolved, the node will broadcast to all other node that it's state is "healthy" during the next sync.

# Conflicts
When a node goes offline, is unresponsive or has some sort of internal error, it's possible for it's data to become out of sync with the cluster.

Every node keeps an inmemory array of all conflicts.

When an external query attempts to mutate a record, but one of the replica nodes fail to respond, it will:
- Add an item to the conflicts array
- Tell all other online nodes about the conflict

If a node learns it has a conflict, from another node or during startup, it will change it's health to 'unhealthy' and attempt to resolve the conflicts.

## Resolutions
When a node learns it has a conflict, it changes it's state to 'unhealthy', therefore refusing to answer any internal or external actions.

A conflict contains a `uuid`, `nodeName`, `method`, `collectionId`, `documentId`, `data` and `timestamp`.

For each conflict, the owning node, will try to sync it's own data with the other nodes.

Conflicts can only be resolved if more than 51% of the cluster is online.

The process is:
1. Replace own data record, or delete, as stated via the `method`
2. Broadcasts the conflict `uuid` has been resolved
3. Each node then removes the conflict

# External Actions

## post /test { color: 'blue' }
- selects 3 nodes
- all 3 nodes respond with STATUS_CREATED

## get /test { color: 'blue }
- receives 1 document out of 3 replications

## put /test { color: 'red' }
### full green
- all 3 nodes respond with STATUS_OK
- put was successful
### partial green
- 2 nodes respond with STATUS_OK
- 1 node does not respond
- adds new conflict [{ method, collectionId, documentId, data, timestamp }]
- other nodes change unresponsive node's health to "unhealthy"
- put was successful
