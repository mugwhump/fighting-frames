function (newDoc, oldDoc, userCtx, secObj) {
  let isServerAdmin = userCtx.roles.indexOf('_admin') !== -1;
  let isGameAdmin = userCtx.roles.indexOf(userCtx.db+'-admin') !== -1 || secObj.admins.names.includes(userCtx.name);
  let isGameWriter = userCtx.roles.indexOf(userCtx.db+'-write') !== -1 || secObj.members.names.includes(userCtx.name);
  let regex = new RegExp('/game/[\\w\\-~]+/character/[\\w\\-~]+/changes/[\\w\\-.~]+');
  let isChangeDoc = regex.test(newDoc._id);

  // All users can upload NEW change docs.
  if (isChangeDoc) {
    // but nobody can edit or delete changedocs. Could potentially store hash of changes part and ensure that doesn't change so metadata could be edited.
    // OR could just use an update function for admins/writers to use to update metadata.
    if(oldDoc && !isServerAdmin) {
      throw({
        unauthorized: 'Changedocs cannot be edited except by server admins'
      });
    }
    //TODO: validate gameID
    //TODO: validate timestamp and uploader
    return;
  }
  // Deletions
  else if(newDoc._deleted === true) {
    if (!isServerAdmin && !isGameAdmin) {
      throw({
        unauthorized: 'Only server or game admins may delete documents'
      });
    }
    // Warnings about the dangers of deleting changedocs can be presented client-side
  }
  else if (!isServerAdmin && !isGameAdmin && !isGameWriter) {
    throw({
      unauthorized: 'Please log in as a user with write permissions to upload this document'
    });
  }
}
