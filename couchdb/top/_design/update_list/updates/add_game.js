// Adds a charcter to game-list
// Body: {gameId: string, displayName: string}
function(doc, req){
  let data = JSON.parse(req.body);
  if(!doc) {
    return [null, 'Error, no doc, must pass id of list doc to add_char update function'];
  }
  if(!data || !data.gameId || !data.displayName) {
    return [null, 'Error, request body of add_char update function must contain gameId and displayName'];
  }
  let gameId = data.gameId;
  let displayName = data.displayName;

  let newDbs = doc.dbs;
  if(Array.isArray(newDbs)) {
    newDbs.push({gameId: gameId, displayName: displayName});
    //Sort alphabetically
    newDbs.sort((a, b) => {
      if(a.displayName < b.displayName) return -1;
      if(a.displayName === b.displayName) return 0;
      if(a.displayName > b.displayName) return 1;
    });
  }
  else {
    return [null, 'Error, game-list.dbs is not array'];
  }

  let newDoc = {
    _id: doc._id,
    _rev: doc._rev,
    dbs: newDbs
  };

  return [newDoc, `Added game '${gameId}' to game-list with name '${displayName}'`];
}
