function (doc) {
  idParts = doc._id.split("/");
  if(idParts.length === 2) {
    emit(doc.charName, doc.updatedAt);
  }
}
