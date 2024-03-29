import React, { useEffect, useState } from 'react';
import { useIonAlert, IonContent, IonFooter, IonToolbar, IonRow, IonList, IonItem, IonLabel, IonNote, IonInput, IonButton } from '@ionic/react';
import { useHistory } from 'react-router';
import HeaderPage from '../components/HeaderPage';
import NeedPermissions from '../components/NeedPermissions';
import * as myPouch from '../services/pouch';
import * as util from '../services/util';
import { CreateCharacterBody } from '../types/utilTypes';
import CompileConstants from '../constants/CompileConstants';
import { useMyAlert, useLoadingPromise } from '../services/hooks';

type AddCharacterProps = {
  gameId: string;
}

const AddCharacter: React.FC<AddCharacterProps> = ({gameId}) => {
  const [charName, setCharName] = useState<string>(''); 
  const [charNameErr, setCharNameErr] = useState<string | null>(null); 
  const [displayName, setDisplayName] = useState<string>(''); 
  const [displayNameErr, setDisplayNameErr] = useState<string | null>(null); 
  const [serverErr, setServerErr] = useState<string | null>(null); 
  const [presentMyAlert, dismissAlert] = useMyAlert(); 
  const [loadingPromiseWrapper, dismissLoading] = useLoadingPromise(); 
  const history = useHistory();
  const canSubmit = !(charNameErr || displayNameErr);

  function submit() {
    console.log(`Submitting, id = ${charName}, display name = ${displayName}`)
    const [url, method] = util.getApiAddCharacterUrl(gameId);
    const body: CreateCharacterBody = {charName: charName, displayName: displayName};

    loadingPromiseWrapper(
      myPouch.makeApiCall(url, method, body).then((resp) => {
        presentMyAlert(resp.message, [ {text: 'OK', role: 'cancel'},
          {text: 'View Character', handler: () => {
          //navigate to newly created character
          let url = util.getCharacterUrl(gameId, charName);
          history.push(url); 
        }}]);
      }).catch((err) => {
        setServerErr(err.message);
      })
    , {message: "Creating character..."});
  }

  useEffect(() => {
    let charNameMatch = CompileConstants.ALLOWED_CHARACTER_ID_REGEX.test(charName);
    setCharNameErr(charNameMatch ? null : 'Must be between 1-25 characters, which must be lowercase alphanumeric or ~_-. (no spaces)');
  }, [charName]);

  useEffect(() => {
    let displayNameMatch = CompileConstants.ALLOWED_CHARACTER_DISPLAY_NAME_REGEX.test(displayName);
    setDisplayNameErr(displayNameMatch ? null : 'Must be between 1-35 characters, no tabs or line breaks');
  }, [displayName]);

  return (
    <HeaderPage title={"Add new character to "+gameId}>
      <IonContent fullscreen>
        <NeedPermissions permissions={"GameAdmin"}>
          <IonList onKeyPress={(event: any) => {if(canSubmit && event.key === "Enter") submit()}}>

            <IonItem counter={true} className={charNameErr && charName ? 'ion-invalid' : '' }>
              <IonLabel position="floating">Character ID</IonLabel>
              <IonInput name="charName" type="text" required={true} maxlength={25}
                onIonChange={e => setCharName(e.detail.value!)}
              ></IonInput>
              <IonNote slot="error">{charNameErr}</IonNote>
              <IonNote slot="helper">Unique identifier used in URLs and discord commands. Cannot be changed.</IonNote>
            </IonItem>

            <IonItem counter={true} className={displayNameErr && displayName ? 'ion-invalid' : '' }>
              <IonLabel position="floating">Character Display Name</IonLabel>
              <IonInput name="displayName" type="text" required={true} maxlength={35}
                onIonChange={e => setDisplayName(e.detail.value!)}> </IonInput>
              <IonNote slot="helper">Character's name as displayed to users. Can be changed later.</IonNote>
              <IonNote slot="error">{displayNameErr}</IonNote>
            </IonItem>

            {serverErr && 
              <IonItem color="danger">
                {serverErr}
              </IonItem>
            }

          </IonList>
        </NeedPermissions>
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
};

export default AddCharacter;
