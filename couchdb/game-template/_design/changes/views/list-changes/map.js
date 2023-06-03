
function (doc) {
  // Emits {_id: document_id, key: [characterId, baseRevisionInteger, creationDate], value: {_rev, baseRevision, createdBy, updateTitle, updateDescription?, updateVersion?}} 
  idParts = doc._id.split("/");
  //change docs are of the form character/[charName]/changes/[changeName]
  //fetch changes for a character with {descending: true, startkey: [characterId, {}], endkey: [characterId]}
  if(idParts.length === 4 && idParts[0] === "character" && idParts[2] === "changes") {
    //emit([idParts[1], doc.baseRevision, doc.createdAt ], doc.updateDescription);
    emit(
      [idParts[1], Number.parseInt(doc.baseRevision), doc.createdAt], 
      {_rev: doc._rev, baseRevision: doc.baseRevision, createdBy: doc.createdBy, updateTitle: doc.updateTitle, updateDescription: doc.updateDescription, updateVersion: doc.updateVersion}
    );
  }
}
