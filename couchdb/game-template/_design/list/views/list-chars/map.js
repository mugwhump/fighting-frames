function (doc) {
  idParts = doc._id.split("/");
  //character docs are of the form character/characterName
  if(idParts.length === 2 && idParts[0] === "character") {
    emit(doc.charName, doc.universalProps.characterDisplayName);
  }
}
