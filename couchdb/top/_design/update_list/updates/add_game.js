// Adds a game to game-list. If game with given gameId already present, modifies its displayName.
// Gives error if trying to give two games same displayName.
// Body: {gameId: string, displayName: string}
function(doc, req){
  
  function getResponse(errorMessage, errorCode) {
    if(errorMessage || errorCode) {
      return {'code': errorCode || 500, 'json': {'ok': false, 'reason': errorMessage || "Unspecified update function error"}};
    }
    return {'code': 200, 'json': {'ok': true}};
  }

  let data = JSON.parse(req.body);
  if(!doc) {
    return [null, getResponse('Error, no doc, must pass id of list doc to add_game update function', 400)];
  }
  if(!data || !data.gameId || !data.displayName) {
    return [null, getResponse('Error, request body of add_game update function must contain gameId and displayName', 400)];
  }
  let gameId = data.gameId;
  let displayName = data.displayName;

  let newDbs = doc.dbs;
  if(Array.isArray(newDbs)) {
    const itemWithGameId = newDbs.find((item) => item.gameId === gameId);
    const itemWithDisplayName = newDbs.find((item) => item.displayName === displayName);

    //check that displayName is unique, whether adding or updating item
    if(itemWithDisplayName) {
      return [null, getResponse(`Error, game ${itemWithDisplayName.gameId} already has name ${displayName}`)];
    }

    //update displayName of existing game
    if(itemWithGameId) {
      itemWithGameId.displayName = displayName;
    }
    //add new game
    else {
      newDbs.push({gameId: gameId, displayName: displayName});
    }

    //Sort alphabetically by displayName
    newDbs.sort((a, b) => {
      if(a.displayName < b.displayName) return -1;
      if(a.displayName === b.displayName) return 0;
      if(a.displayName > b.displayName) return 1;
    });
  }
  else {
    return [null, getResponse('Error, game-list.dbs is not array', 400)];
  }

  let newDoc = {
    _id: doc._id,
    _rev: doc._rev,
    dbs: newDbs
  };

  return [newDoc, getResponse()];
}
