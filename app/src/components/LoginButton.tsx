import { IonItem, IonIcon, IonButton, IonLabel, IonInput } from '@ionic/react';
import { logInOutline, logInSharp } from 'ionicons/icons';
import React, { useState } from 'react';
//import LoginModal from './LoginModal';
import { useLoginInfoContext, LoginInfo } from './GameProvider';
import CompileConstants from '../constants/CompileConstants';

type LoginButtonProps = {
  db: string 
}

const LoginButton: React.FC<LoginButtonProps> = ({db}) => {
  const [showModal, setShowModal] = useState(false);
  const loginInfo: LoginInfo = useLoginInfoContext();
  // TODO: Only render at all if using remote db
  // What else will render differently depending on who you're logged in as?

  if(loginInfo.currentCreds.username !== CompileConstants.DEFAULT_CREDENTIALS.username) {
    //If logged in as non-default user
    return (
      <>
      <div>Logged in as {loginInfo.currentCreds.username}</div>
      <IonItem button className="login" onClick={() => loginInfo.logout()}>
        <IonIcon slot="start" ios={logInOutline} md={logInSharp} />
        <IonLabel>Log Out</IonLabel>
      </IonItem>
      </>
    )
  }
  return (
    <>
      <IonItem button className="login" onClick={() => loginInfo.setShowModal(true)}>
        <IonIcon slot="start" ios={logInOutline} md={logInSharp} />
        <IonLabel>Log In</IonLabel>
      </IonItem>
    </>
  )
}

export default LoginButton;
