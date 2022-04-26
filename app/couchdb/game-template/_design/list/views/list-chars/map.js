function (doc) {
  idParts = doc._id.split("/");
  if(idParts.length === 2 && idParts[0] === "character") {
    emit(doc.charName, doc.updatedAt);
  }
}
