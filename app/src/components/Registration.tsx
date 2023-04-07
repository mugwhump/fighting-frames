import { useIonAlert, IonContent, IonTitle, IonText, IonToolbar, IonItem, IonButton, IonLabel, IonNote, IonInput } from '@ionic/react';
import React, { useState, useEffect } from 'react';
//import { useLocalDispatch, Credentials, Action } from './LocalProvider';
import PouchDB from 'pouchdb';
import PouchAuth from 'pouchdb-authentication';
import * as myPouch from '../services/pouch';

type RegistrationProps = {
  closeIfModal?: () => void; //If this is a modal, this function closes it
  //registerCallback : (username: string, password: string) => Promise<any>;
}

// Keep this unaware of whether it's in a modal or its own page
const Registration: React.FC<RegistrationProps> = ({closeIfModal}) => {
  const [username, setUsername] = useState<string>(''); 
  const [email, setEmail] = useState<string>(''); 
  const [password, setPassword] = useState<string>(''); 
  const [confirmPassword, setConfirmPassword] = useState<string>(''); 
  const [errorText, setErrorText] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<{[fieldKey: string]: string[]} | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  //const [presentAlert, dismissAlert] = useIonAlert(); //used for deletion confirmation, new move conflicts, other

  useEffect(() => {
    return () => { //called when modal destroyed (aka when return to home)
      clearErrors();
    };
  }, []);

  function clearErrors() {
    setErrorText('');
    setValidationErrors(null);
  }

  function registerClick(e: any): void {
    e.preventDefault(); //need this or page reloads
    e.stopPropagation();
    let reg = {
      username: username,
      email: email,
      password: password,
      confirmPassword: confirmPassword
    }
    clearErrors();
    myPouch.superlogin.register(reg).then((response) => {
      console.log("Registration response: " + JSON.stringify(response));
      setSuccess(true);
    }).catch((error) => {
      //TODO: this doesn't appear to catch errors with sending confirmation emails (and in that case the account is still made in sl-users db)
      //^^in fact, a mail error (eg for wrong mailer creds) crashes api lol. Submitted an issue, hopefully they update it to return error if email not sent.
      console.log("Registration error: " + JSON.stringify(error));
      setErrorText(error.error);
      if(error.validationErrors) {
        setValidationErrors(error.validationErrors);
      }
    });
  }

  if(success) {
    return (
      <IonContent>
        <IonToolbar>
          <IonTitle>Registration successful!</IonTitle>
        </IonToolbar>
        <IonItem>
          <IonText>Your account has been created. Please check your email at {email} for a link to verify your account.</IonText>
        </IonItem>
        <IonItem>
          {closeIfModal !== undefined && <IonButton type="button" onClick={closeIfModal}>Close</IonButton>}
        </IonItem>
      </IonContent>
    )
  }
  else {
    return (
      <IonContent>
      <IonToolbar>
        <IonTitle>Register</IonTitle>
      </IonToolbar>
        <form action="#" onSubmit={registerClick}>
          <IonItem className={validationErrors?.username ? 'ion-invalid' : '' }>
            <IonLabel position="floating">Username</IonLabel>
            <IonInput name="username" type="text" required={true}
              onIonChange={e => setUsername(e.detail.value!)}></IonInput>
            <IonNote slot="error">{validationErrors?.username?.join('\n')}</IonNote>
          </IonItem>
          <IonItem className={validationErrors?.email ? 'ion-invalid' : '' }>
            <IonLabel position="floating">Email</IonLabel>
            <IonInput name="email" type="text" autocomplete="email" required={true} 
              onIonChange={e => setEmail(e.detail.value!)}></IonInput>
            <IonNote slot="error">{validationErrors?.email?.join('\n')}</IonNote>
          </IonItem>
          <IonItem className={validationErrors?.password ? 'ion-invalid' : '' }>
            <IonLabel position="floating">Password</IonLabel>
            <IonInput name="password" type="password" required={true} 
              onIonChange={e => setPassword(e.detail.value!)}></IonInput>
            <IonNote slot="error">{validationErrors?.password?.join('\n')}</IonNote>
          </IonItem>
          <IonItem className={validationErrors?.confirmPassword ? 'ion-invalid' : '' }>
            <IonLabel position="floating">Confirm Password</IonLabel>
            <IonInput name="confirmPassword" type="password" required={true} 
              onIonChange={e => setConfirmPassword(e.detail.value!)}></IonInput>
            <IonNote slot="error">{validationErrors?.confirmPassword?.join('\n')}</IonNote>
          </IonItem>
          {errorText !== '' && 
            <IonItem class='error'>
              {errorText}
            </IonItem>
          }
          <IonItem>
            <input type="submit" style={{display: "none"}}/> {/* enables enter key submission. TODO: test on mobile */}
            {closeIfModal !== undefined && <IonButton type="button" onClick={closeIfModal}>Close</IonButton>}
            <IonButton expand="block" type="submit">Register</IonButton>
          </IonItem>
        </form>
      </IonContent>
    )
  }
}

export default Registration;
