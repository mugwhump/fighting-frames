import { IonModal, IonTitle, IonItem, IonText, IonToolbar, IonButton, IonLabel, IonInput, useIonModal } from '@ionic/react';
import React, { useState, useEffect } from 'react';
import { useLocalDispatch, Action } from './LocalProvider';
import { Credentials } from '../types/utilTypes';
import Registration from './Registration';

type LoginModalProps = {
  show: boolean;
  storedCredentials: Credentials | null, 
  onDismiss: () => void; 
  logInModalCallback : (username: string, password: string) => Promise<PouchDB.Authentication.LoginResponse>;
}

// Auto-fill with locally stored credentials, present error messages for failed logins
// Assumes db is remote since there's no point logging in to a local db
const LoginModal: React.FC<LoginModalProps> = ({show, storedCredentials, onDismiss, logInModalCallback }) => {
  const [username, setUsername] = useState<string>(''); 
  const [password, setPassword] = useState<string>(''); 
  const [errorText, setErrorText] = useState<string>('');
  const [showRegistration, dismissRegistration] = useIonModal(Registration, {closeIfModal: ()=>dismissRegistration()});
  const dispatch = useLocalDispatch();

  useEffect(() => {
    return () => { //called when modal destroyed (aka when return to home)
      setErrorText('');
    };
  }, []);

  function loginClick(e: any): void {
    e.preventDefault(); //need this or page reloads
    e.stopPropagation();
    logInModalCallback (username, password).then((response) => {
      // Only update stored credentials if these ones have write perms for this db. EHHH doesn't make sense in superlogin perm model where users are added to sec obj
      //if(response.roles && (response.roles.includes(db+"-write") || response.roles.includes(db+"-admin"))) {
      const action: Action = {actionType: 'updateCredentials', creds: {username: username, password: password}};
      dispatch(action);
      //}
      setErrorText('');
    }).catch((error) => {
      setErrorText(error?.error + ': ' + (error?.reason || error?.message));
    });
  }

  function willPresent() {
    if (storedCredentials === null) {
      console.log("No stored credentials found");
    }
    else {
      setUsername(storedCredentials.username);
      setPassword(storedCredentials.password);
    }
  };

  function forgetCreds() {
    dispatch({actionType: 'resetCredentials'});
    setUsername('');
    setPassword('');
  }

  function willDismiss(): void {
    setErrorText(''); 
    setUsername('');
    setPassword('');
    onDismiss();
  }

  return (
    <IonModal isOpen={show} onWillPresent={willPresent} onWillDismiss={willDismiss}>
      <IonToolbar>
        <IonTitle>Log In</IonTitle>
      </IonToolbar>
      <form action="#" onSubmit={loginClick}>
        <IonItem>
          <IonLabel position="floating">Username</IonLabel>
          <IonInput type="text" required={true} value={username} 
            onIonChange={e => setUsername(e.detail.value!)}></IonInput>
        </IonItem>
        <IonItem>
          <IonLabel position="floating">Password</IonLabel>
          <IonInput type="password" required={true} value={password} 
            onIonChange={e => setPassword(e.detail.value!)}></IonInput>
        </IonItem>
        {errorText !== '' && 
          <IonItem class='error'>
            {errorText}
          </IonItem>
        }
        <IonItem>
          <input type="submit" style={{display: "none"}}/> {/* enables enter key submission. TODO: test on mobile */}
          <IonButton type="button" onClick={() => onDismiss()}>Close</IonButton>
          <IonButton type="button" onClick={forgetCreds}>Forget</IonButton>
          <IonButton type="submit">Log In</IonButton>
        </IonItem>
      </form>
      <IonItem>
        <IonText>No account? Click here to  </IonText>
        <IonButton expand="block" size="small" fill="outline" type="button" onClick={() => showRegistration()}>Register</IonButton>
      </IonItem>
    </IonModal>
  )
}

export default LoginModal;
