
function (doc) {
  idParts = doc._id.split("/");
  //change docs are of the form character/[charName]/changes/[changeName]
  //TODO: _rev string comparisons say "2-" > "100-" > "1-", this won't sort right
  if(idParts.length === 4 && idParts[0] === "character" && idParts[2] === "changes") {
    emit([idParts[1], doc.baseRevision, doc.createdAt ], doc.updateDescription);
  }
}
