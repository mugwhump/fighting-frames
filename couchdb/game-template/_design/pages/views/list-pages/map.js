function (doc) {
  idParts = doc._id.split("/");
  //page docs are of the form pages/pageId
  if(idParts.length === 2 && idParts[0] === "pages") {
    emit(idParts[1], doc.title);
  }
}
