
function (doc) {
  // Emits {_id: document_id, key: [characterId, baseRevisionInteger, creationDate], value: {_rev, updateTitle, updateDescription?, baseRevision}} 
  idParts = doc._id.split("/");
  //change docs are of the form character/[charName]/changes/[changeName]
  //fetch changes for a character with {descending: true, startkey: [characterId, {}], endkey: [characterId]}
  if(idParts.length === 4 && idParts[0] === "character" && idParts[2] === "changes") {
    //TODO: _rev string comparisons say "2-" > "100-" > "1-", this won't sort right
    //emit([idParts[1], doc.baseRevision, doc.createdAt ], doc.updateDescription);
    emit([idParts[1], Number.parseInt(doc.baseRevision), doc.createdAt], {_rev: doc._rev, updateTitle: doc.updateTitle, updateDescription: doc.updateDescription, baseRevision: doc.baseRevision});
  }
}
