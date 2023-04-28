//ServerManager and ServerAdmin are for all databases and thus determined by user role rather than presence of user's name in db's secobj
//uhhh what does a SL server admin even do
//Note that SuperLogin users in the "names" list only have priveleges via the API; from couch's perspective their username is a random string.

export type SecObj = {
  admins?: {
    names?: string[], //GameAdmins
    roles?: string[],
  };
  //For Editors or Uploaders, can add 'public' for anyone, or 'user' for any registered user
  members?: {
    //TODO: enforce that users have >= perms than public? Won't cause problems but does make sense.
    names?: string[], //Editors
    roles?: string[],
  };
  uploaders?: string[]; //Uploaders. 
}

export type PermissionLevel = "Reader" | "Uploader" | "Editor" | "GameAdmin" | "ServerManager" | "ServerAdmin";
export const permissionList = ["Reader", "Uploader", "Editor", "GameAdmin", "ServerManager", "ServerAdmin"] as const;

// true if perm1 >= perm2, aka for (uploader, reader)
export function permissionGTE(perm1: PermissionLevel = "Reader", perm2: PermissionLevel = "Reader"): boolean {
  return permissionList.indexOf(perm1) >= permissionList.indexOf(perm2);
}

//matches shape of LoginInfo but can be used by backend
export function userHasPerms(info: {secObj: SecObj | null, currentUser?: string, roles?: string[]}, permissions: PermissionLevel): boolean {
  let {currentUser, roles, secObj} = info; 
  switch(permissions) {
    case "Reader": {
      return true;
    }
    case "Uploader": {
      return userIsUploaderOrHigher(currentUser, roles, secObj ?? undefined);
    }
    case "Editor": {
      return userIsEditorOrHigher (currentUser, roles, secObj ?? undefined);
    }
    case "GameAdmin": {
      return userIsGameAdminOrHigher(currentUser, roles, secObj ?? undefined);
    }
    case "ServerManager": {
      return userIsServerManagerOrHigher(currentUser, roles, secObj ?? undefined);
    }
    case "ServerAdmin": {
      return userIsServerAdmin(currentUser, roles, secObj ?? undefined);
    }
  }
  throw new Error("Unrecognized permission level: "+permissions);
}

export function userIsUploaderOrHigher(user?: string, roles?: string[], secObj?: SecObj): boolean {
  if(!user) return false;
  //return ( (user === 'public' && permissionGTE(secObj?.publicPerms, "Uploader")) || (isSLUser(roles) && permissionGTE(secObj?.userPerms, "Uploader")) )
  return secObj?.uploaders?.includes('public') 
    || (isSLUser(roles) && secObj?.uploaders?.includes('user'))
    || userIsEditorOrHigher(user, roles, secObj);
}
export function userIsEditorOrHigher (user?: string, roles?: string[], secObj?: SecObj): boolean {
  //return user && secObj?.members?.names && secObj?.members.names.includes(user) 
  if(!user) return false;
  //return ( (user === 'public' && permissionGTE(secObj?.publicPerms, "Editor")) || (isSLUser(roles) && permissionGTE(secObj?.userPerms, "Editor")) )
  return secObj?.members?.names?.includes('public') 
    || (isSLUser(roles) && secObj?.members?.names?.includes('user')) 
    || secObj?.members?.names?.includes(user) 
    || userIsGameAdminOrHigher(user, roles, secObj);
}
export function userIsGameAdminOrHigher(user?: string, roles?: string[], secObj?: SecObj): boolean {
  if(!user) return false;
  return (secObj?.admins?.names && secObj?.admins.names.includes(user)) || userIsServerManagerOrHigher(user, roles, secObj);
}
export function userIsServerManagerOrHigher(user?: string, roles?: string[], secObj?: SecObj): boolean {
  return (roles && roles.includes("server-manager")) || userIsServerAdmin(user, roles, secObj);
}
export function userIsServerAdmin(user?: string, roles?: string[], secObj?: SecObj): boolean {
  return !!roles && roles.includes("_admin");
}

function isSLUser(roles?: string[]) {
  return !!roles && roles.includes("user");
}

//Useful for UI to tell users about functionality that can only be used with an account
export function anySLUserHasPerms(permissions: "Uploader" | "Editor", secObj: SecObj | null | undefined): boolean {
  if(!secObj) return false;
  return userHasPerms({secObj: secObj, currentUser: "user", roles: ["user"]}, permissions);
  //if(permissions === "Uploader") {
    //if(secObj?.uploaders?.includes('user')) return true;
  //}
  //if(permissions === "Editor") {
  //}
}
