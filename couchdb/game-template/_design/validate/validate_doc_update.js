function (newDoc, oldDoc, userCtx, secObj) {
  //log("Happy logging!" + JSON.stringify(secObj)); //set log level to info to see this
  const isServerAdmin = userCtx.roles.indexOf('_admin') !== -1; //includes replicator user

  // All creates, deletions, and updates are done through API or replicator, which are couch admins
  if (!isServerAdmin) {
    throw({
      unauthorized: 'Only server admins can modify the database'
    });
  }

}
