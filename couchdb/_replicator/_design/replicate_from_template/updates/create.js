//executed with a call to _replicator/_design/replicate_from_template/_update/create to create new doc. Add "/existing_id" at end to update replication doc.
//Creates a document for continuous replication from game-template db to a new db (created if necessary)
function(doc, req){
  
  function getResponse(errorMessage, errorCode) {
    if(errorMessage || errorCode) { //code becomes statusCode in err obj. json.ok tells nano whether to throw error.
      return {'code': errorCode || 500, 'json': {'ok': false, 'reason': errorMessage || "Unspecified update function error"}};
    }
    return {'code': 200, 'json': {'ok': true}};
  }

  let data = JSON.parse(req.body);
  let username = data.username;
  let password = data.password;
  if(!doc && !data.id) {
    // No existing doc and no id in request
    return [null, getResponse('Error, request must contain "id" field', 400)];
  }
  if(!username || !password) {
    return [null, getResponse('Error, request body must contain username and password fields to authorize continuous replication.', 401)];
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
    // copy all design documents. Design docs deleted from game-template will also be deleted from target.
    "selector": {
      "_id": {
        "$regex": "^_design/"
      }
    },
    create_target: true,
    continuous: true
  };

  if (!doc){
    //return [newDoc, 'Creating new replication and database for ' + id];
    return [newDoc, getResponse()];
  }
  else { //doc already exists
    newDoc._rev = doc._rev;
    //return [newDoc, 'Edited replication doc for ' + id];
    return [newDoc, getResponse()];
  }
}
