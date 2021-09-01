import { IonItem, IonIcon, IonButton, IonLabel, IonInput } from '@ionic/react';
import { logInOutline, logInSharp } from 'ionicons/icons';
import React, { useState } from 'react';
import LoginModal from './LoginModal';

type LoginButtonProps = {
  db: string 
}

const LoginButton: React.FC<LoginButtonProps> = ({db}) => {
  const [showModal, setShowModal] = useState(false);
  // TODO: Only render login button if not logged in, otherwise offer logout
  // TODO: Only render at all if using remote db
  // What else will render differently depending on who you're logged in as?

  function onLogin(): void {
    setShowModal(false);
  }

  return (
    <>
      <LoginModal db={db} show={showModal} onDismiss={() => setShowModal(false)} onLogin={onLogin} />
      <IonItem button className="login" onClick={() => setShowModal(true)}>
        <IonIcon slot="start" ios={logInOutline} md={logInSharp} />
        <IonLabel>Log In</IonLabel>
      </IonItem>
    </>
  )
}

export default LoginButton;
