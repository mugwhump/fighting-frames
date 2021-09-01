import { IonModal, IonItem, IonButton, IonLabel, IonInput } from '@ionic/react';
import React, { useState, useEffect } from 'react';
import { useLocalSubset, useLocalDispatch, Credentials, CredentialStore, LocalData, Action, Preferences } from './LocalProvider';
import PouchDB from 'pouchdb';
import { usePouch } from 'use-pouchdb';
import PouchAuth from 'pouchdb-authentication';
PouchDB.plugin(PouchAuth);
//import * as myPouch from '../services/pouch';

type LoginModalProps = {
  db: string, 
  show: boolean;
  onDismiss: () => void; //callbacks defined in caller using this 
  onLogin: (username: string) => void;
}

// Auto-fill with locally stored credentials, present error messages for failed logins
// Assumes db is remote since there's no point logging in to a local db
const LoginModal: React.FC<LoginModalProps> = ({db, show, onDismiss, onLogin}) => {
  const [username, setUsername] = useState<string>(''); 
  const [password, setPassword] = useState<string>(''); 
  const [errorText, setErrorText] = useState<string>('');
  const credStore: CredentialStore = useLocalSubset<CredentialStore>("credentials");
  const prefs: Preferences = useLocalSubset<Preferences>("preferences"); //FOR TESTING
  const dispatch = useLocalDispatch();
  //const {data, dispatch}: ContextValueSubType<CredentialStore> = 
      //useLocalDataSelector((contextVal : ContextValue) => {return {data: contextVal.data.credentials, dispatch: contextVal.dispatch}});
  //does returning an object create a new reference every time, making comparator always think stuff's changed, triggering re-render?
  const database: PouchDB.Database = usePouch();

  useEffect(() => {
    console.log("LoginModal rendered");
  });

  function login(e: any): void {
    e.preventDefault(); //need this or page reloads
    e.stopPropagation();
    database.logIn(username, password).then((response) => {
      console.log("Login response: " + JSON.stringify(response));
      //TODO: only store if new creds are actually different
      const action: Action = {actionType: 'updateCredentials', db: db, creds: {username: username, password: password}};
      dispatch(action);
      setErrorText('');
      onLogin(response.name);
    }).catch((error) => {
      console.error("Login error: " + JSON.stringify(error));
      loginFailure(error);
    });
  }

  function loginFailure(error: any): void {
    setErrorText(error?.error + ': ' + error?.reason);
  }

  function willPresent() {
    console.log("ionModalWillPresent fired");
    let creds: Credentials = credStore[db];
    if (creds === undefined) {
      console.log("No stored credentials found for " + db);
    }
    else {
      setUsername(creds.username);
      setPassword(creds.password);
    }
  };

  function willDismiss(): void {
    setErrorText('');
  }

  function testToggleAutoDownload() {
    console.log(`toggling autodownload from ${prefs.autoDownload} to ${!prefs.autoDownload}`);
    const current = prefs.autoDownload;
    const action: Action = {actionType: "changePreferences", preferences: {...prefs, autoDownload: !current}};
    dispatch(action);
  }

  return (
    <IonModal isOpen={show} onWillPresent={willPresent} onWillDismiss={willDismiss}>
      <form action="#" onSubmit={login}>
        <IonItem>
          <IonLabel>Username</IonLabel>
          <IonInput type="text" required={true} value={username} 
            onIonChange={e => setUsername(e.detail.value!)}></IonInput>
        </IonItem>
        <IonItem>
          <IonLabel>Password</IonLabel>
          <IonInput type="password" required={true} value={password} 
            onIonChange={e => setPassword(e.detail.value!)}></IonInput>
        </IonItem>
        <IonItem class='error'>
          {errorText}
        </IonItem>
        <IonItem>
          <input type="submit" style={{display: "none"}}/> {/* enables enter key submission. TODO: test on mobile */}
          <IonButton type="button" onClick={() => onDismiss()}>Close</IonButton>
          <IonButton type="button" onClick={() => testToggleAutoDownload()}>TEST TOGGLE</IonButton>
          <IonButton type="submit">Log In</IonButton>
        </IonItem>
      </form>
    </IonModal>
  )
}

export default LoginModal;
