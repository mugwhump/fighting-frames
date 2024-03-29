import React, { useEffect, useState } from 'react';
import { useIonAlert, useIonLoading, IonContent, IonIcon, IonFooter, IonToolbar, IonRow, IonList, IonItem, IonLabel, IonNote, IonInput, IonButton } from '@ionic/react';
import { useHistory } from 'react-router';
import { warningOutline, warningSharp } from 'ionicons/icons';
import HeaderPage from '../components/HeaderPage';
import NeedPermissions from '../components/NeedPermissions';
import * as myPouch from '../services/pouch';
import * as util from '../services/util';
import { CreateGameBody } from '../types/utilTypes';
import CompileConstants from '../constants/CompileConstants';
import { useMyAlert, useLoadingPromise } from '../services/hooks';

//type AddCharacterProps = {
  //gameId: string;
//}

const AddGame: React.FC<{}> = () => {
  const [gameId, setGameId] = useState<string>(''); 
  const [gameIdErr, setGameIdErr] = useState<string | null>(null); 
  const [displayName, setDisplayName] = useState<string>(''); 
  const [displayNameErr, setDisplayNameErr] = useState<string | null>(null); 
  const [serverErr, setServerErr] = useState<string | null>(null); 
  const [presentAlert, dismissAlert] = useMyAlert(); 
  const [loadingPromiseWrapper, dismissLoading] = useLoadingPromise(); 
  const history = useHistory();
  const canSubmit = !(gameIdErr || displayNameErr);


  function submit() {
    console.log(`Submitting, id = ${gameId}, display name = ${displayName}`)
    const [url, method] = util.getApiAddGameUrl();
    const body: CreateGameBody = {gameId: gameId, displayName: displayName};

    loadingPromiseWrapper(
      myPouch.makeApiCall(url, method, body).then((resp) => {

        presentAlert(resp.message, [ 
          {text: 'OK', role: 'cancel'},
          {text: 'View Game', handler: () => {
            //navigate to newly created game TODO: trigger refresh of top if downloaded
            let url = util.getGameUrl(gameId);
            history.push(url); 
          } }
        ]);

      }).catch((err) => {
        setServerErr(err.message);
      })
    , {message: "Creating database for game...", duration: 20000});
  }


  useEffect(() => {
    let gameNameMatch = CompileConstants.ALLOWED_GAME_ID_REGEX.test(gameId);
    setGameIdErr(gameNameMatch ? null : 'Must be between 1-20 gameacters, which must be lowercase alphanumeric or ~_-. (no spaces). Cannot start with _ or certain reserved words.');
  }, [gameId]);


  useEffect(() => {
    let displayNameMatch = CompileConstants.ALLOWED_GAME_DISPLAY_NAME_REGEX.test(displayName);
    setDisplayNameErr(displayNameMatch ? null : 'Must be between 2-50 characters, no tabs or line breaks');
  }, [displayName]);



  return (
    <HeaderPage title={"Add new game"}>
      <IonContent fullscreen>

        <NeedPermissions permissions={"ServerManager"} ifYes={(

          <IonList onKeyPress={(event: any) => {if(canSubmit && event.key === "Enter") submit()}}>

            <IonItem counter={true} className={gameIdErr && gameId ? 'ion-invalid' : '' }>
              <IonLabel position="floating">Game ID</IonLabel>
              <IonInput name="gameId" type="text" required={true} maxlength={20}
                onIonChange={e => setGameId(e.detail.value!)}
              ></IonInput>
              <IonNote slot="error">{gameIdErr}</IonNote>
              <IonNote slot="helper">Unique identifier used in URLs and discord commands. Cannot be changed.</IonNote>
            </IonItem>

            <IonItem counter={true} className={displayNameErr && displayName ? 'ion-invalid' : '' }>
              <IonLabel position="floating">Game Display Name</IonLabel>
              <IonInput name="displayName" type="text" required={true} maxlength={50}
                onIonChange={e => setDisplayName(e.detail.value!)}> </IonInput>
              <IonNote slot="helper">Game's name as displayed to users. Can be changed later.</IonNote>
              <IonNote slot="error">{displayNameErr}</IonNote>
            </IonItem>

            {serverErr && 
              <IonItem color="danger">
                {serverErr}
              </IonItem>
            }

          </IonList>

        )} ifNo={(

          <IonItem color="danger"><IonIcon slot="start" ios={warningOutline} md={warningSharp} /><span>You do not have permission to access this page</span></IonItem>
          
        )} />

      </IonContent>

      <IonFooter>
        <IonToolbar>
          <IonRow class="ion-justify-content-center">
            <IonButton type="submit" disabled={!canSubmit} onClick={() => submit()}>Submit</IonButton>
          </IonRow>
        </IonToolbar>
      </IonFooter>
    </HeaderPage>
  ) 
}

export default AddGame;
