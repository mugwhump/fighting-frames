import React, { useEffect, useState } from 'react';
import { IonContent, IonIcon, IonFooter, IonToolbar, IonRow, IonList, IonItem, IonLabel, IonNote, IonInput, IonButton } from '@ionic/react';
import { useHistory } from 'react-router';
import { warningOutline, warningSharp } from 'ionicons/icons';
import HeaderPage from '../components/HeaderPage';
import NeedPermissions from '../components/NeedPermissions';
import * as myPouch from '../services/pouch';
import * as util from '../services/util';
import CompileConstants from '../constants/CompileConstants';
import { useMyAlert, useLoadingPromise } from '../services/hooks';


const DeleteGame: React.FC<{}> = () => {
  const [gameId, setGameId] = useState<string>(''); 
  const [gameIdErr, setGameIdErr] = useState<string | null>(null); 
  const [serverErr, setServerErr] = useState<string | null>(null); 
  const [presentMyAlert, dismissAlert] = useMyAlert(); 
  const [loadingPromiseWrapper, dismissLoading] = useLoadingPromise(); 
  const history = useHistory();
  const canSubmit = !gameIdErr;


  function promptDelete(gameId: string) {
    presentMyAlert(`Are you sure you want to remove the game ${gameId}?`, 
      [ {text: 'Cancel', role: 'cancel'},
        {text: 'Remove', role: 'destructive', handler: () => {dismissAlert().then(() => deleteGame(gameId)); } },
      ]);
  }

  function deleteGame(gameId: string) {
    const [url, method] = util.getApiDeleteGameUrl(gameId);

    loadingPromiseWrapper(
        myPouch.makeApiCall(url, method).then((resp) => {
          presentMyAlert('Game removed. View its admin-only url?', [ 
            {text: 'OK', role: 'cancel'},
            {text: 'View Game', handler: () => {
              //navigate to hidden url TODO: trigger refresh of top if downloaded
              let url = util.getGameDeletedUrl(gameId);
              history.push(url); 
            } }
          ]);
        }).catch((err) => {
          console.log(`Error deleting game, ${JSON.stringify(err)}`);
          setServerErr(err.message);
        })
    , {message: 'Removing game...', duration: 20000});
  }


  useEffect(() => {
    let gameNameMatch = CompileConstants.ALLOWED_GAME_ID_REGEX.test(gameId);
    setGameIdErr(gameNameMatch ? null : 'Invalid game id. Use the id from its url, not its displayed name.');
  }, [gameId]);


  return (
    <HeaderPage title={"Remove a game"}>
      <IonContent fullscreen>

        <NeedPermissions permissions={"ServerManager"} ifYes={(

          <>
          <div>{"Enter the id of the game you want to mark for deletion. The game will be moved to a new hidden url of the form '/game/internal-[game id]-deleted' and will only be visible to server managers. Its database will be fully removed after a month. Contact the superadmin if you wish to cancel this deletion during that time."}</div>

          <IonList onKeyPress={(event: any) => {if(canSubmit && event.key === "Enter") promptDelete(gameId)}}>

            <IonItem counter={true} className={gameIdErr && gameId ? 'ion-invalid' : '' }>
              <IonLabel position="floating">Game ID</IonLabel>
              <IonInput name="gameId" type="text" required={true} maxlength={20}
                onIonChange={e => setGameId(e.detail.value!)}
              ></IonInput>
              <IonNote slot="error">{gameIdErr}</IonNote>
              <IonNote slot="helper">Unique identifier used in URLs and discord commands. Cannot be changed.</IonNote>
            </IonItem>

            {serverErr && 
              <IonItem color="danger">
                {serverErr}
              </IonItem>
            }

          </IonList>
          </>

        )} ifNo={(

          <IonItem color="danger"><IonIcon slot="start" ios={warningOutline} md={warningSharp} /><span>You do not have permission to access this page</span></IonItem>
          
        )} />

      </IonContent>

      <IonFooter>
        <IonToolbar>
          <IonRow class="ion-justify-content-center">
            <IonButton type="submit" disabled={!canSubmit} onClick={() => promptDelete(gameId)}>Remove</IonButton>
          </IonRow>
        </IonToolbar>
      </IonFooter>
    </HeaderPage>
  ) 
}

export default DeleteGame;

