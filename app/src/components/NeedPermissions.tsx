//import { IonItem, IonIcon, IonButton, IonLabel, IonInput } from '@ionic/react';
import React, { useEffect } from 'react';
//import LoginModal from './LoginModal';
import * as myPouch from '../services/pouch';
import { useLoginInfoContext, LoginInfo } from './LoginProvider';

type NeedPermissionsProps = {
  children?: React.ReactNode,
  permissions: myPouch.PermissionLevel,
  ifYes?: React.ReactNode,
  ifNo?: React.ReactNode,
}

// Conditionally render children only if user has necessary perms. 
// Or pass components to then & else props to render one or the other.
// Just for presentation logic, actual permission checks are server-side.
const NeedPermissions: React.FC<NeedPermissionsProps> = ({children, permissions, ifYes, ifNo}) => {
  const loginInfo: LoginInfo = useLoginInfoContext();
  const hasPerms: boolean = myPouch.userHasPerms(loginInfo, permissions);
  if((!ifYes || !ifNo) && ifYes !== ifNo) throw new Error("Must provide both ifYes and ifNo to NeedPermission if using either");
  if(!!children && !!ifYes) throw new Error("Either use children with NeedPermission or the ifYes+ifNo props, not both");

  if(ifYes === undefined) {
    if(hasPerms) {
      return (
        <>
        {children}
        </>
      );
    }
    else return (null);
  }
  else {
    if(hasPerms) {
      return (<>{ifYes}</>); 
    }
    else {
      return (<>{ifNo}</>); 
    }
  }
}

export default NeedPermissions;
