import React, { useEffect, useRef } from 'react';
import { useIonAlert, IonPopover, IonIcon, IonFab, IonFabButton, IonList, IonButton, IonContent, IonItem, IonLabel, IonGrid, IonRow } from '@ionic/react';
import { add, } from 'ionicons/icons';
import { useDoc, usePouch } from 'use-pouchdb';
import { useParams } from 'react-router-dom';
import { State, useCharacterDispatch, useTrackedCharacterState, EditAction } from '../services/CharacterReducer';
import * as T from '../types/characterTypes';
import * as util from '../services/util';
import CharacterRenderer from './CharacterRenderer';
import NeedPermissions from './NeedPermissions';

type ChangeViewerProps = {
  columnDefs: T.ColumnDefs,
  universalPropDefs: T.ColumnDefs,
}


//TODO: url query param to be "waiting for" change. Display spinner or w/e before it loads, then show "you uploaded this but it needs to be published" thing.
export const ChangeViewer: React.FC<ChangeViewerProps> = ({columnDefs, universalPropDefs}) => {
  const { changeTitle } = useParams<{ changeTitle: string }>(); 
  const state = useTrackedCharacterState();
  const charDoc = state.charDoc;
  const character = state.characterId;
  const dispatch = useCharacterDispatch();
  const changeDocId = util.getChangeId(character, changeTitle);
  const { doc: changeDoc, loading, state: docState, error } = useDoc<T.ChangeDoc>(changeDocId); 
  const [presentAlert, dismissAlert] = useIonAlert(); //TODO: confirmation for merging
  const popOver = useRef<HTMLIonPopoverElement>(null); 

  useEffect(() => {
    return () => {
      dismissPopOver();
    }
  }, [])

  function importChanges() {
    //TODO: forbid if have conflicts
    if(changeDoc) { 
      console.log("Importing changeDoc " + changeDocId);
      dispatch({actionType: "importEdits", editChanges: changeDoc});
      dismissPopOver();
    }
  }

  function publishChanges() {
    dispatch({actionType: "publishChangeList", character: character, title: changeTitle});
    dismissPopOver();
  }

  if (docState === 'error') {
    console.error("heckin errorino in Character: " + error?.message);
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
    <IonFab id="changeFAB" vertical="top" horizontal="end" slot="fixed">
      <IonFabButton><IonIcon icon={add} /></IonFabButton>
    </IonFab>
    <IonPopover ref={popOver} trigger="changeFAB" >
      <IonContent>
        <IonList>
          <IonItem button={true} onClick={importChanges}><IonLabel>Import</IonLabel></IonItem>
          <NeedPermissions permissions="Editor">
            <IonItem button={true} onClick={publishChanges}><IonLabel>Publish</IonLabel></IonItem>
          </NeedPermissions> 
        </IonList>
      </IonContent> 
    </IonPopover>
    </>
  )

  return (
    <>
      {changeFAB}
      <CharacterRenderer charDoc={charDoc} columnDefs={columnDefs} universalPropDefs={universalPropDefs} changes={changeDoc} highlightChanges={true}/>
    </>
  )

};

export default ChangeViewer;
