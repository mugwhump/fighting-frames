import React, { useEffect, useRef, useState, useCallback } from 'react';
import { IonPopover, IonIcon, IonFab, IonFabButton, IonList, IonButton, IonContent, IonItem, IonLabel, IonGrid, IonRow } from '@ionic/react';
import { add, } from 'ionicons/icons';
import { useDoc } from 'use-pouchdb';
import { useParams, useHistory } from 'react-router-dom';
import { State, useCharacterDispatch, useTrackedCharacterState, EditAction } from '../services/CharacterReducer';
import { useQuery, useChangeDocOrReversion, useMyAlert } from '../services/hooks';
import * as T from '../types/characterTypes';
import * as util from '../services/util';
import CharacterRenderer from '../components/CharacterRenderer';
import NeedPermissions from '../components/NeedPermissions';
import HeaderPage from '../components/HeaderPage';

type ChangeViewerProps = {
  gameId: string;
  columnDefs: T.ColumnDefs,
  universalPropDefs: T.ColumnDefs,
}


//TODO: url query param to be "waiting for" change. Display spinner or w/e before it loads, then show "you uploaded this but it needs to be published" thing.
//character/talim/changes/malicious-change?revert=true will display a change rolling back to before malicious-change, which can be uploaded/imported/applied
export const ChangeViewer: React.FC<ChangeViewerProps> = ({gameId, columnDefs, universalPropDefs}) => {
  const { changeTitle } = useParams<{ changeTitle: string }>(); 
  const history = useHistory();
  const query = useQuery();
  const isRevert: boolean = query.get('revert') === 'true';
  const state = useTrackedCharacterState();
  //Could potentially alter charDoc into one representing its state before change was applied to show how change DID change things instead of how it WOULD change things if published
  const charDoc = state.charDoc; 
  const characterId = state.characterId;
  const charDisplayName = charDoc.universalProps.characterDisplayName;
  const userChangeList = state.editChanges;
  const changeDocId = util.getChangeId(characterId, changeTitle);
  //const { doc: changeDoc, loading, state: docState, error } = useDoc<T.ChangeDocServer>(changeDocId); 
  const { doc: changeDoc, loading, state: docState, error } = useChangeDocOrReversion(changeTitle, characterId, isRevert ? charDoc.changeHistory : undefined);
  const dispatch = useCharacterDispatch();
  const [presentMyAlert, dismissAlert] = useMyAlert(); 
  const popOver = useRef<HTMLIonPopoverElement>(null); 
  let changeType: 'history' | 'recent' | 'outdated' | null = null;
  let changeInfoText: string = '';
  let pageTitle: string = '';
  let distanceFromLatest: number = 0;


  if(charDoc.changeHistory.includes(changeTitle)) {
    changeType = 'history';
    distanceFromLatest = charDoc.changeHistory.length - charDoc.changeHistory.indexOf(changeTitle); //1 if most recent

    if(isRevert) {
      changeInfoText = `Previewing ${charDisplayName} as they looked ${distanceFromLatest} changes ago, before change "${changeTitle}" was applied. Click here to view change "${changeTitle}" if it were to be re-applied to ${charDisplayName}'s latest version.`;
      pageTitle = `${charDisplayName} before change ${changeTitle}`
    }

    else {
      changeInfoText = `This is an already-applied change from ${charDisplayName}'s history, ${distanceFromLatest} changes ago. Click here to see how this character looked before change "${changeTitle}" was applied.`;
      pageTitle = `${charDisplayName}'s applied change ${changeTitle}`
    }
  }

  else if(changeDoc) {
    pageTitle = `${charDisplayName}'s unapplied change ${changeTitle}`

    if(changeDoc.baseRevision === charDoc._rev) {
      changeType = 'recent';
      changeInfoText = `Previewing change "${changeTitle}" based on latest version of ${charDisplayName}.`;
    }

    else {
      distanceFromLatest = changeDoc.previousChange 
        ? (charDoc.changeHistory.length - charDoc.changeHistory.indexOf(changeDoc.previousChange)) 
        : charDoc.changeHistory.length; // if this was based on initial, empty charDoc
      changeInfoText = `Previewing change "${changeTitle}" based on version of ${charDisplayName} from ${distanceFromLatest} changes ago and how it would look if applied to the latest version of ${charDisplayName}.`;
      changeType = 'outdated';
    }
  }

  else {
    changeType = null;
    changeInfoText = '';
  }


  function importChanges() {
    if(changeDoc) dispatch({actionType: "promptImportChanges", changes: changeDoc});
    dismissPopOver();
  }

  function promptPublishChanges() {
    if(!changeDoc) return;
    let promptMessage = `Would you like to apply change "${changeTitle}" to character ${charDisplayName}?`;
    if(changeType === 'history') promptMessage = `Would you like to undo change "${changeTitle}" and the ${distanceFromLatest - 1} changes after it, reverting character ${charDisplayName} to the state they were in before those changes were applied? This reversion would be applied as a new change in the character's history.`;

    presentMyAlert(promptMessage, 
      [ {text: 'Cancel', role: 'cancel'},
        {text: 'Yes', handler: () => {
          if(changeType === 'history') {
            //reversion needs baseRevision of latest charDoc
            changeDoc.baseRevision = charDoc._rev;
            dispatch({actionType:'uploadChangeList', character: characterId, changes: changeDoc, publish: true});
          }
          else {
            dispatch({actionType: "publishChangeList", character: characterId, title: changeTitle});
          }
        } },
      ]);
    dismissPopOver();
  }

  if (docState === 'error') {
    console.error("heckin errorino in ChangeViewer: " + error?.message);
    return (<h1>Error loading changes: {error?.message}</h1>);
  }
  // loading is true even after the doc loads
  else if (loading && !changeDoc) {
    return (<h1>Loading...</h1>);
  }
  else if (!changeDoc) {
    return (<h1>ChangeDoc {changeDocId} not found</h1>);
  }

  function dismissPopOver() { popOver.current && popOver.current.dismiss() }

  let changeFAB = (
    <>
    <IonFab id="changeFAB" vertical="bottom" horizontal="end" slot="fixed">
      <IonFabButton><IonIcon icon={add} /></IonFabButton>
    </IonFab>
    <IonPopover ref={popOver} side="top" trigger="changeFAB" >
      <IonContent>
        <IonList>
          <IonItem button={true} onClick={importChanges}><IonLabel>Import & Edit</IonLabel></IonItem>
          {(changeType === 'recent' || (changeType === 'history' && isRevert)) &&
          <NeedPermissions permissions="Editor">
            <IonItem button={true} onClick={promptPublishChanges}><IonLabel>{(isRevert ? "Revert" : "Apply") + " changes"}</IonLabel></IonItem>
          </NeedPermissions> 
          }
        </IonList>
      </IonContent> 
    </IonPopover>
    </>
  )


  return (
    <HeaderPage title={pageTitle}>
      <IonContent fullscreen>
        {changeFAB}
        <IonItem button={changeType === 'history'} color="primary" onClick={changeType === 'history' ? (e) => {
            console.log('cloocked, histype is '+changeType);
            history.push(util.getChangeUrl(gameId, characterId, changeTitle, !isRevert));
          } : undefined}>
          <IonLabel class="ion-text-wrap">{changeInfoText}</IonLabel>
        </IonItem>
        <CharacterRenderer charDoc={charDoc} columnDefs={columnDefs} universalPropDefs={universalPropDefs} changes={changeDoc} highlightChanges={true}/>
      </IonContent>
    </HeaderPage>
  )

};

export default ChangeViewer;
