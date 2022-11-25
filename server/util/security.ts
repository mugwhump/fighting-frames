import * as CouchAuthTypes from '@perfood/couch-auth/lib/types/typings';

export type SecObj = {
  admins?: {
    names?: string[],
    roles?: string[],
  };
  members?: {
    names?: string[],
    roles?: string[],
  };
}

//Similar, but not identical, to the functions in myPouch in the app
export function userIsWriterOrHigher(user: CouchAuthTypes.SlRequestUser, secObj: SecObj): boolean {
  return (secObj.members?.names && user._id && secObj.members.names.includes(user._id)) || userIsGameAdminOrHigher(user, secObj);
}
export function userIsGameAdminOrHigher(user: CouchAuthTypes.SlRequestUser, secObj: SecObj): boolean {
  return (secObj.admins?.names && user._id && secObj.admins.names.includes(user._id)) || userIsServerManagerOrHigher(user);
}
export function userIsServerManagerOrHigher(user: CouchAuthTypes.SlRequestUser): boolean {
  return user.roles?.includes("server-manager") || userIsServerAdmin(user);
}
export function userIsServerAdmin(user: CouchAuthTypes.SlRequestUser): boolean {
  return user.roles?.includes("_admin") || false;
}

//export default;
