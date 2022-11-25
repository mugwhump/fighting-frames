function (newDoc, oldDoc, userCtx, secObj) {
  let userId = userCtx.name;
  if(userCtx.roles[0].startsWith("user:")) { //superlogin users have username as first role in the form of "user:bob"
    userId = userCtx.roles[0].substring(5);
  }
  //log("Happy logging!" + JSON.stringify(secObj)); //set log level to info to see this
  const isServerAdmin = userCtx.roles.indexOf('_admin') !== -1; //includes replicator-guy
  const isReplication = userId === "replication-guy";
  const isGameAdmin = userCtx.roles.indexOf(userCtx.db+'-admin') !== -1 || (secObj.admins.names && secObj.admins.names.includes(userId));
  const isGameWriter = userCtx.roles.indexOf(userCtx.db+'-write') !== -1 || (secObj.members.names && secObj.members.names.includes(userId)); //put public in member list to make anyone a writer
  const regex = new RegExp('character/[\\w\\-~]+/changes/[\\w\\-.~]{3,25}$');
  const isChangeDoc = regex.test(newDoc._id);
  const isDesignDoc = newDoc._id.indexOf("_design/") === 0;

  //TODO: test
  if(isDesignDoc) {
    if (!isServerAdmin) {
      throw({
        unauthorized: 'Only server admins may write design docs'
      });
    }
  }

  //TODO: only server admins can update charDoc?

  if(newDoc._deleted === true) {
    if (!isServerAdmin && !isGameAdmin) {
      throw({
        unauthorized: 'Only server or game admins may delete documents'
      });
    }
    // Warnings about the dangers of deleting changedocs can be presented client-side
  }
  // All users can upload NEW change docs.
  else if (isChangeDoc) {
    // but nobody can edit or delete changedocs. Could potentially store hash of changes part and ensure that doesn't change so metadata could be edited.
    // OR could just use an update function for admins/writers to use to update metadata.

    // Replications ignore these checks
    //if(!isReplication) {
    if(!isServerAdmin) { // Let server admin ignore for testing purposes
      if(oldDoc && !isServerAdmin) {
        throw({
          unauthorized: 'Changedocs cannot be edited except by server admins'
        });
      }
      //TODO: validate character? Can't without API.
      if(newDoc.createdBy !== userId) throw({forbidden: "createdBy field "+newDoc.createdBy+" does not match user "+userId});

      const maxDateDiffMS = 600000; //submitted date must be within 10m of current time
      const dateDiff = new Date() - new Date(newDoc.createdAt);
      if(Math.abs(dateDiff) > maxDateDiffMS) throw({forbidden: "createdAt field "+newDoc.createdAt+" is "+dateDiff+"ms off of current time "+new Date().toString()+". Check your system clock."});

      if(newDoc.conflictList !== undefined) throw({forbidden: "Changelist must not have conflicts"});

      const validator = require('lib/ChangeDocServer-validator').default;
      const result = validator(newDoc);
      if(!result) {
        throw({
          forbidden: JSON.stringify(validator.errors)
        });
      }
    }
    
    return;
  }
  else if (!isServerAdmin && !isGameAdmin && !isGameWriter) {
    throw({
      unauthorized: 'Please log in as a user with write permissions to upload this document'
    });
  }
}
