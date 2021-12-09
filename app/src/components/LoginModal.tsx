import { IonModal, IonItem, IonButton, IonLabel, IonInput } from '@ionic/react';
import React, { useState, useEffect } from 'react';
import { useLocalDispatch, Credentials, Action } from './LocalProvider';
import PouchDB from 'pouchdb';
import { usePouch } from 'use-pouchdb';
import PouchAuth from 'pouchdb-authentication';
PouchDB.plugin(PouchAuth);
//import * as myPouch from '../services/pouch';

type LoginModalProps = {
  db: string, 
  show: boolean;
  creds: Credentials, //if none found, undefined
  onDismiss: () => void; //callbacks defined in caller using this 
  onLogin: (username: string) => void;
}

// Auto-fill with locally stored credentials, present error messages for failed logins
// Assumes db is remote since there's no point logging in to a local db
const LoginModal: React.FC<LoginModalProps> = ({db, show, onDismiss, creds, onLogin}) => {
  const [username, setUsername] = useState<string>(''); 
  const [password, setPassword] = useState<string>(''); 
  const [errorText, setErrorText] = useState<string>('');
  const dispatch = useLocalDispatch();
  //const {data, dispatch}: ContextValueSubType<CredentialStore> = 
      //useLocalDataSelector((contextVal : ContextValue) => {return {data: contextVal.data.credentials, dispatch: contextVal.dispatch}});
  //does returning an object create a new reference every time, making comparator always think stuff's changed, triggering re-render?
  const database: PouchDB.Database = usePouch();

  useEffect(() => {
    //console.log("LoginModal rendered");
  });
  useEffect(() => {
    return () => {
      setErrorText('');
      //console.log("LoginModal unmounted")
    };
  }, []);

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
    if (creds === undefined) {
      console.log("No stored credentials found for " + db);
    }
    else {
      setUsername(creds.username);
      setPassword(creds.password);
    }
  };

  function willDismiss(): void {
    //TODO:this should probably go here instead of effect cleanup, but 
    //saving (or changing state then closing) gives a warning about "cannot perform react state update on an unmounted component"
    //setErrorText(''); 
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
          <IonButton type="submit">Log In</IonButton>
        </IonItem>
      </form>
    </IonModal>
  )
}

export default LoginModal;
