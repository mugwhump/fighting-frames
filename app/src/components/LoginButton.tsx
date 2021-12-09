import { IonItem, IonIcon, IonButton, IonLabel, IonInput } from '@ionic/react';
import { logInOutline, logInSharp } from 'ionicons/icons';
import React, { useState } from 'react';
import LoginModal from './LoginModal';
import { withLocalContext, Credentials, CredentialStore, LocalData, Action, Preferences } from './LocalProvider';

type LoginButtonProps = {
  db: string 
}

const LoginButton: React.FC<LoginButtonProps> = ({db}) => {
  const [showModal, setShowModal] = useState(false);
  // TODO: Only render login button if not logged in, otherwise offer logout
  // TODO: Only render at all if using remote db
  // What else will render differently depending on who you're logged in as?

  //Wrapper seems to unmount before the modal does
  const WrappedLoginModal = withLocalContext((state) => {return {creds: state.credentials[db]}})(LoginModal);

  function onLogin(): void {
    setShowModal(false);
  }

  function showModalFunc(e: React.MouseEvent<HTMLElement>): void { //doing this only because an arrow function in onClick is recreated every render
    setShowModal(true);
  }

  return (
    <>
      <WrappedLoginModal db={db} show={showModal} onDismiss={() => setShowModal(false)} onLogin={onLogin} />
      <IonItem button className="login" onClick={showModalFunc}>
        <IonIcon slot="start" ios={logInOutline} md={logInSharp} />
        <IonLabel>Log In</IonLabel>
      </IonItem>
    </>
  )
}

export default LoginButton;
