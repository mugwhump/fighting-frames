function (newDoc, oldDoc, userCtx, secObj) {
  let gameAdmin = userCtx.db + "-admin";
  let gameWrite = userCtx.db + "-write";
  if (userCtx.roles.indexOf('_admin') === -1 && userCtx.roles.indexOf(gameAdmin) === -1 && userCtx.roles.indexOf(gameWrite) === -1) {
    throw({
      unauthorized: 'Admins only.'
    })
  }
}
