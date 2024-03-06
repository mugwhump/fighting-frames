function (doc) {
  idParts = doc._id.split("/");
  //page docs are of the form pages/pageId
  if(idParts.length === 2 && idParts[0] === "pages") {
    emit([false, idParts[1] !== "frontpage", idParts[1]], doc.title);
  }
  //character docs are of the form character/characterName
  if(idParts.length === 2 && idParts[0] === "character") {
    emit([true, true, idParts[1]], doc.universalProps.characterDisplayName);
  }
}
