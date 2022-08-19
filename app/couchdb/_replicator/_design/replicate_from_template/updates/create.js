//executed with a call to _replicator/_design/replicate_from_template/_update/create to create new doc. Add "/existing_id" at end to update replication doc.
//Creates a document for continuous replication from game-template db to a new db (created if necessary)
function(doc, req){
  let data = JSON.parse(req.body);
  let username = data.username;
  let password = data.password;
  if(!doc && !data.id) {
    // No existing doc and no id in request
    return [null, 'Error, request must contain "id" field, too bad. Req:' + JSON.stringify(req)]
  }
  if(!username || !password) {
    return [null, 'Error, request body must contain username and password fields to authorize continuous replication. Req:' + JSON.stringify(req)]
  }

  const id = data.id || doc.id;
  const host = 'http://' + req.headers.Host; 
  let newDoc = {
    _id: id,
    source: {
      url: host+'/game-template',
      auth: { basic: { username: username, password: password } }
    },
    target: {
      url: host+'/'+id,
      auth: { basic: { username: username, password: password } }
    },
    doc_ids: ['_design/list', '_design/validate'],
    create_target: true,
    continuous: true
  }

  if (!doc){
    return [newDoc, 'Creating new replication and database for ' + id];
  }
  else { //doc already exists
    newDoc._rev = doc._rev
    return [newDoc, 'Edited replication doc for ' + id];
  }
}
