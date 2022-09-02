
function (doc) {
  idParts = doc._id.split("/");
  //change docs are of the form /game/[gameName]/character/[charName]/changes/[changeName]
  if(idParts.length === 7 && idParts[1] === "game" && idParts[3] === "character" && idParts[5] === "changes") {
    emit([idParts[4], doc.createdAt], doc.updateDescription);
  }
}
