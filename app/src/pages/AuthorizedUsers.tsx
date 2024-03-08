import React, { useEffect, useState, useCallback, useRef } from 'react';
import { IonContent, IonFooter, IonToolbar, IonRow, IonList, IonListHeader, IonItem, IonIcon, IonLabel, IonButton } from '@ionic/react';
import { add, remove, informationCircleOutline, informationCircleSharp } from 'ionicons/icons';
//import { useHistory } from 'react-router';
import { usePouch } from 'use-pouchdb'
import { useMyToast, useMyAlert, useLoadingPromise } from '../services/hooks';
import { useLoginInfoContext } from '../components/LoginProvider';
import HeaderPage from '../components/HeaderPage';
import NeedPermissions from '../components/NeedPermissions';
import * as myPouch from '../services/pouch';
import * as util from '../services/util';
import { SecObj, userHasPerms } from '../services/security';
import { cloneDeep, isEqual, set } from 'lodash';
import CompileConstants from '../constants/CompileConstants';

type PermKey = 'admins' | 'members' | 'uploaders';
type AuthorizedUsersProps = {
  gameId: string;
}

const AuthorizedUsers: React.FC<AuthorizedUsersProps> = ({gameId}) => {
  const db = usePouch('remote');
  const loginInfo = useLoginInfoContext();
  const [serverSecObj, setServerSecObj] = useState<SecObj | null>(null);
  const [workingSecObj, setWorkingSecObj] = useState<SecObj | null>(null); //remember to update with shallow copies
  const [serverErr, setServerErr] = useState<string | null>(null); 
  const serverErrRef = useRef<HTMLIonItemElement>(null);
  const [presentAlert, dismissAlert] = useMyAlert(); 
  const [loadingPromiseWrapper, ] = useLoadingPromise(); 
  const [presentMyToast, ] = useMyToast(); 

  useEffect(() => {
    db.get<SecObj>('_security').then((result) => {
      setServerSecObj(result);
      setWorkingSecObj(cloneDeep<SecObj>(result));
    }).catch((err) => {
      setServerErr(err.message);
    });
  }, [db])


  function getNamesIn(key: PermKey, secObj: SecObj): string[] {
    if(key === 'uploaders') return secObj.uploaders ?? [];
    else if(key === 'members') return secObj.members?.names ?? [];
    else if(key === 'admins') return secObj.admins?.names ?? [];

    else throw new Error(`Unknown key ${key} in getNamesOf`);
  }


  async function submit() {
    if(!workingSecObj) return;

    loadingPromiseWrapper(
      (async function () {
        try {
          // First check that _security wasn't updated while working 
          const result = await db.get<SecObj>('_security');
          if(!isEqual(serverSecObj, result)) { //isEqual cares about order of array items, but not object properties
            console.warn("NO MATCHERINO");
            setServerSecObj(result);
            setWorkingSecObj(cloneDeep<SecObj>(result));
            throw new Error("Someone else updated permissions while you were working! Please re-do your changes.");
          }

          const [url, method] = util.getApiAuthorizedUsersUrl(gameId);

          const apiResult = await myPouch.makeApiCall(url, method, workingSecObj);
          presentMyToast(apiResult.message, "success");
          setServerErr(null);
        }
        catch(err: any) {
          setServerErr(err.message);
          serverErrRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      })()
    , {message: "Updating permissions", duration: 10000});
  }


  function promptUndoChanges() {
    if(!serverSecObj) return;
    presentAlert(`Would you like to undo your changes?`, 
      [ {text: 'Cancel', role: 'cancel'}, 
        {text: 'Undo', role: 'destructive', handler: () => {setWorkingSecObj(cloneDeep<SecObj>(serverSecObj))} },
      ]);
  }


  const promptRemoveNameCallback = useCallback((name: string, key: PermKey) => {
    if(!workingSecObj) return;
    const newSecObj = cloneDeep<SecObj>(workingSecObj);
    const nameArray = getNamesIn(key, newSecObj);
    if(!nameArray || nameArray.length === 0) {
      setServerErr(`No array for ${key}`);
      return;
    }
    let message: string = `Would you like to remove user ${name} from ${roleTitles[key]}s?`;
    //TODO: warn game admins removing selves, unless server admin
    if(key === 'admins' && name === loginInfo.currentUser && !userHasPerms(loginInfo, "ServerManager")) {
      message = "WARNING: you are about to remove your own game admin privileges! If you submit these changes, you won't be able to access this page any more or get your permissions back!"
    }

    presentAlert(message, 
      [ {text: 'Cancel', role: 'cancel'}, 
        {text: 'Remove', role: 'destructive', handler: () => {
          const index = nameArray.findIndex((val) => val === name);
          nameArray.splice(index, 1); //edit in-place to avoid reassignment
          setWorkingSecObj(newSecObj);
        } },
      ]);
  }, [workingSecObj, presentAlert, loginInfo]);


  const promptAddNameCallback = useCallback((key: PermKey) => {
    if(!workingSecObj) return;
    const newSecObj = cloneDeep<SecObj>(workingSecObj);
    const path = (key === 'uploaders') ? 'uploaders' : `${key}.names`;
    const nameArrayToAttach = getNamesIn(key, workingSecObj);

    function addName(name: string) {
      if(!name) return false;

      //notify that 'public' and 'user' can't be admins
      if(key === 'admins' && (name === 'public' || name === 'user')) {
        presentMyToast("Only individual registered users may be admins", "warning");
        return false;
      }

      //check that users aren't added to multiple arrays
      if(getNamesIn('admins', newSecObj).includes(name)
        || getNamesIn('members', newSecObj).includes(name)
        || getNamesIn('uploaders', newSecObj).includes(name)) {
          presentMyToast(`User ${name} already has a role. Only give users one role. 
                        Higher levels automatically grant the privileges of lower levels.`, 'warning');
          return false; 
      }

      //notify that user perms are pointless if public has the same or higher perms
      //TODO: can just add public after user...
      //if(name === 'user' 
         //&& (key === 'uploaders' && getNamesIn('uploaders', newSecObj).concat(getNamesIn('members', newSecObj)).includes('public')
           //|| (key === 'members' && getNamesIn('members', newSecObj).includes('public'))
           //)
        //) {
          //presentMyToast(`No point adding 'user' to ${roleTitles[key]}s, 'public' being in the same or higher permission level means everyone already has
                         //these permissions even without an account`, 'warning');
          //return false; 
      //}

      nameArrayToAttach.push(name);
      set(newSecObj, path, nameArrayToAttach);
      setWorkingSecObj(newSecObj);
      return true;
    }

    presentAlert( {
        header: `Add new ${roleTitles[key]}`,
        inputs: [ {
            type: 'text',
            name: 'name',
            //attributes: { maxLength: 25 },
            attributes: { onKeyPress: (e: any) => { 
              if(e.key === "Enter") {
                if(addName((e?.currentTarget as any)?.value as string || "")) {
                  dismissAlert();
                }
              }
            }},
            placeholder: 'username',
        } ],
        buttons: [
          {text: 'Cancel', role: 'cancel'},
          {text: 'add', role: 'submit', handler: (opts) => { return addName(opts.name) }},
        ]
      })
  }, [workingSecObj, presentAlert, presentMyToast, dismissAlert]);


  if (!workingSecObj) {
    return (<h1>Loading authorized users...</h1>);
  }

  return (
    <HeaderPage title={"Authorize users for "+gameId}>
      <IonContent fullscreen>
        <NeedPermissions permissions={"GameAdmin"}>

          <NameList permKey="admins" names={getNamesIn("admins", workingSecObj)} promptRemoveCallback={promptRemoveNameCallback} promptAddCallback={promptAddNameCallback} />
          <br />
          <NameList permKey="members" names={getNamesIn("members", workingSecObj)} promptRemoveCallback={promptRemoveNameCallback} 
          promptAddCallback={promptAddNameCallback} publicInEditors={workingSecObj?.members?.names?.includes('public')} />
          <br />
          <NameList permKey="uploaders" names={getNamesIn("uploaders", workingSecObj)} promptRemoveCallback={promptRemoveNameCallback} 
          promptAddCallback={promptAddNameCallback} publicInEditors={getNamesIn("members", workingSecObj).includes('public')} />

          {serverErr && 
            <IonItem ref={serverErrRef} color="danger">
              {serverErr}
            </IonItem>
          }

        </NeedPermissions>
      </IonContent>

      <IonFooter>
        <IonToolbar>
          <IonRow class="ion-justify-content-center">
            <IonButton type="reset" onClick={promptUndoChanges}>Undo Changes</IonButton>
            <IonButton type="submit" onClick={submit}>Submit</IonButton>
          </IonRow>
        </IonToolbar>
      </IonFooter>
    </HeaderPage>
  );
}


const roleTitles: Record<PermKey, string> = {
  "admins": "Game Admin",
  "members": "Editor",
  "uploaders": "Uploader",
}
const roleDescription: Record<PermKey, string> = {
  "admins": "These users have all permissions for this game, which includes all Editor and Uploader permissions, adding and deleting characters, changing the game's configuration and column definitions, and the ability to access this page and grant or revoke permissions for this game.",
  "members": "These users can upload changes for a character, and are also able to apply changes that others have uploaded, or revert previously applied changes.",
  "uploaders": "These users can upload changes for a character, but only someone with Editor permissions or higher can apply those changes.",
}

interface NameListProps {
  permKey: PermKey;
  names: string[];
  promptRemoveCallback: (name: string, key: PermKey) => void;
  promptAddCallback: (key: PermKey) => void;
  publicInEditors?: boolean;
}
const NameList: React.FC<NameListProps> = ({permKey, names, promptRemoveCallback, promptAddCallback, publicInEditors}) => {
  const title = roleTitles[permKey];
  const desc = roleDescription[permKey];

  const publicHasPerm = names.includes(CompileConstants.DEFAULT_CREDENTIALS.username);
  let publicPermColor = "primary";
  let publicPermMsg = `Add 'public' to this list to give EVERYONE ${title} permissions, even without creating an account.`
  if(publicHasPerm) {
    publicPermMsg = `'public' being in this list means that EVERYONE has ${title} permissions, even without creating an account.` 
    publicPermColor = "warning";
  }

  const slUserHasPerm = names.includes("user");
  let slUserPermColor = "primary";
  let slUserPermMsg = `Add 'user' to this list to give all registered users ${title} permissions.`;
  if(slUserHasPerm) {
    slUserPermMsg = `'user' being in this list means that all registered users have ${title} permissions.`;
    slUserPermColor = "warning";
    if(publicInEditors || (permKey === 'uploaders' && names.includes('public'))) {
      slUserPermMsg = "No point in 'user' being in this list, since 'public' having greater or equal permissions means everyone already has these permissions even without an account";
      slUserPermColor = "danger";
    }
  }

  return (
    <IonList>

      <IonListHeader>
        <IonLabel>
          <h1>{title}s</h1>
          <h2>{desc}</h2>
        </IonLabel>
      </IonListHeader>

      {(permKey === "members" || permKey === "uploaders") && (
        <>
        <IonItem key="_public" className="ion-text-wrap" color="light" lines="none" >
          <IonLabel className="ion-text-wrap" >{publicPermMsg}</IonLabel>
          <IonIcon slot="start" color={publicPermColor} ios={informationCircleOutline} md={informationCircleSharp} />
        </IonItem>
        <IonItem key="_user" color="light" >
          <IonLabel className="ion-text-wrap" >{slUserPermMsg}</IonLabel>
          <IonIcon slot="start" color={slUserPermColor} ios={informationCircleOutline} md={informationCircleSharp} />
        </IonItem>
        </>
      )
      }

      {names.map((name) => {
        return (
          <IonItem key={name} >
          {/*<IonItem key={name} button onClick={() => console.log(`Uhh uu clicked ${name}`)} >*/}
            <IonLabel>{name}</IonLabel>
            <IonButton slot="end" color="danger" onClick={() => promptRemoveCallback(name, permKey)} >
              <IonIcon icon={remove} />
            </IonButton>
          </IonItem>
        )
      }) }

      <IonItem key="_add-name" button onClick={() => promptAddCallback(permKey)} >
        <IonLabel className="ion-text-wrap">{(names.length === 0) && `This game has no ${title}s. `}Click to add {title}</IonLabel>
        <IonIcon slot="start" color="success" icon={add} />
      </IonItem>

    </IonList>
  )
}

export default AuthorizedUsers;
