
import React, { useEffect, useState } from 'react';
import { useIonAlert, IonContent, IonFooter, IonToolbar, IonRow, IonList, IonItem, IonLabel, IonNote, IonInput, IonButton } from '@ionic/react';
//import { useHistory } from 'react-router';
import { useView } from 'use-pouchdb'
import HeaderPage from '../components/HeaderPage';
import NeedPermissions from '../components/NeedPermissions';
import * as myPouch from '../services/pouch';
import * as util from '../services/util';
import { CharDocWithMeta } from '../types/characterTypes';
import type { ListCharactersViewRow } from '../types/utilTypes'; //==
import { SegmentUrl, CreateCharacterBody } from '../types/utilTypes';

type DeleteCharactersProps = {
  gameId: string;
}

const DeleteCharacters: React.FC<DeleteCharactersProps> = ({gameId}) => {
  const { rows, loading, state, error } = useView<ListCharactersViewRow, CharDocWithMeta>("list/list-chars"); 
  const [serverErr, setServerErr] = useState<string | null>(null); 
  const [presentAlert, dismissAlert] = useIonAlert(); 

  function promptDelete(characterId: string, displayName: string) {
    presentAlert(`Are you sure you want to delete the character ${displayName} (id: ${characterId}) and their entire change history? This is a PERMANENT action and cannot be undone.`, 
      [ {text: 'Cancel', role: 'cancel'},
        {text: 'Delete', role: 'destructive', handler: () => {dismissAlert().then(() => promptDeleteAgain(characterId, displayName)); } },
      ]);
  }

  //Nevermind, can't call presentAlert from inside itself
  function promptDeleteAgain(characterId: string, displayName: string) {
    presentAlert(`Are you SURE you're sure? ${displayName || characterId} will be gone forever. You should only ever do this for newly-created characters where you messed up their ID.`, 
      [ {text: 'Cancel', role: 'cancel'},
        {text: 'Delete', role: 'destructive', handler: () => {dismissAlert().then(() => doDelete(characterId))} },
      ]);
  }

  function doDelete(characterId: string) {
    console.log(`Deleting, id = ${characterId}`)
    const [url, method] = util.getApiDeleteCharacterUrl(gameId, characterId);

    myPouch.makeApiCall(url, method).then((resp) => {
      console.log(JSON.stringify(resp));
      presentAlert(resp.message);
      setServerErr(null);
    }).catch((err) => {
      setServerErr(err.message);
    });
  }

  if (state === 'error') {
    return (<div>Error loading characters: {error?.message}</div>);
  }
  else if (loading && rows.length === 0) {
    return (<h1>Loading characters...</h1>);
  }

  return (
    <HeaderPage title={"Delete characters from "+gameId}>
      <IonContent fullscreen>
        <NeedPermissions permissions={"GameAdmin"}>
          <IonList>
            {rows.map((row: ListCharactersViewRow) => {
              const characterId = row.key;
              const displayName = row.value;
              return (
                <IonItem key={characterId} button onClick={() => promptDelete(characterId, displayName)} >
                  <IonLabel>{displayName} (id: {characterId})</IonLabel>
                </IonItem>
              )
            })}

          </IonList>

          {serverErr && 
            <IonItem color="danger">
              {serverErr}
            </IonItem>
          }

        </NeedPermissions>
      </IonContent>
    </HeaderPage>
  );
}

export default DeleteCharacters;
