
function (doc) {
  idParts = doc._id.split("/");
  //change docs are of the form character/[charName]/changes/[changeName]
  if(idParts.length === 4 && idParts[0] === "character" && idParts[2] === "changes") {
    emit([idParts[1], doc.createdAt], doc.updateDescription);
  }
}
