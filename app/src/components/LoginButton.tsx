import { IonItem, IonIcon, IonButton, IonLabel, IonInput } from '@ionic/react';
import { logInOutline, logInSharp } from 'ionicons/icons';
import React, { useEffect } from 'react';
//import LoginModal from './LoginModal';
import { useLoginInfoContext, LoginInfo } from './LoginProvider';
import CompileConstants from '../constants/CompileConstants';

type LoginButtonProps = {
  
}

const LoginButton: React.FC<LoginButtonProps> = () => {
  const loginInfo: LoginInfo = useLoginInfoContext();
  // What else will render differently depending on who you're logged in as?

  useEffect(() => {
    console.log("LoginButton's loginInfo changed: "+JSON.stringify(loginInfo));
  }, [loginInfo])

  if(loginInfo.currentUser !== null) {
    //If logged in 
    return (
      <>
      <div>Logged in as {loginInfo.currentUser}</div>
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
