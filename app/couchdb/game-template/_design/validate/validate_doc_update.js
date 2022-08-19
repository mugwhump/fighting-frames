function (newDoc, oldDoc, userCtx, secObj) {
  let gameAdmin = userCtx.db + "-admin";
  let gameWrite = userCtx.db + "-write";
  function isChangeDoc(id) {
    const regex = new RegExp('/game/[\w-~]+/character/[\w-~]+/changes/[\w-.~]+');
  }
  if (userCtx.name === 'public')
  if (userCtx.roles.indexOf('_admin') === -1 && userCtx.roles.indexOf(gameAdmin) === -1 && userCtx.roles.indexOf(gameWrite) === -1) {
    throw({
      unauthorized: 'Admins only.'
    })
  }
}
