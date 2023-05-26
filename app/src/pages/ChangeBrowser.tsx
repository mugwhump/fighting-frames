import { IonContent, IonAccordion, IonAccordionGroup, IonRouterLink, useIonAlert, IonIcon, IonLabel, IonList, IonButton, IonItem, IonGrid, IonRow, IonCol } from '@ionic/react';
import { thumbsUpOutline, arrowUndoOutline, arrowUndoSharp } from 'ionicons/icons';
import React, { useEffect, useCallback }from 'react';
import { useView, useDoc } from 'use-pouchdb'
import * as myPouch from '../services/pouch';
import * as util from '../services/util';
import type { ChangeDocWithMeta } from '../types/characterTypes';
import type { ListChangesViewRow, ListChangesViewRowValue } from '../types/utilTypes'; //==
import { State, useCharacterDispatch, EditAction, useTrackedCharacterState } from '../services/CharacterReducer';
import { useLoginInfoContext, LoginInfo } from '../components/LoginProvider';
import HeaderPage from '../components/HeaderPage';

type ChangeBrowserProps = {
  gameId: string
}

export const ChangeBrowser: React.FC<ChangeBrowserProps> = ({gameId}) => {
  const state = useTrackedCharacterState();
  const characterId = state.characterId;
  const baseRev = state.charDoc._rev;
  const publishedChanges = state.charDoc.changeHistory;
  //regarding how to match first element of array key: https://stackoverflow.com/questions/9687297/couchdb-search-or-filtering-on-key-array
  const { rows, loading, state: viewState, error } = useView<ListChangesViewRow, ChangeDocWithMeta>("changes/list-changes", {descending: true, startkey: [characterId, {}], endkey: [characterId]}); 

  useEffect(() => {
    console.log(`Dem rows: ${JSON.stringify(rows)}`);
  },[rows]);


  if (viewState === 'error') {
    return (<div>Error loading change list: {error?.message}</div>);
  }
  // loading is true even after the doc loads
  else if (loading && rows.length === 0) {
    return (<h1>Loading...</h1>);
  }

  if(rows.length === 0) {
    return(
      <IonItem color={"primary"}>There are no changes for this character. Go to the Edit section to submit changes.</IonItem>
    );
  }

  const publishedChangeRows: ListChangesViewRow[] = [];
  const recentChangeRows: ListChangesViewRow[] = [];
  const outdatedChangeRows: ListChangesViewRow[] = [];

  let row: ListChangesViewRow;
  for(row of rows) {
    if(publishedChanges.includes(row.value.updateTitle)) {
      publishedChangeRows.push(row);
    }
    else if(baseRev === row.value.baseRevision) {
      recentChangeRows.push(row);
    }
    else {
      outdatedChangeRows.push(row);
    }
  }

  return (
    <HeaderPage title={"Changes for " + state.characterDisplayName}>
      <IonContent fullscreen>
        <IonAccordionGroup>

          <IonAccordion>
            <IonItem slot="header" color="light">
              <IonLabel>Change History</IonLabel>
            </IonItem>

            <div slot="content">
              {publishedChangeRows.length === 0 
                ? <IonItem color={"primary"}>No changes have been applied for this character. If there are submitted changes below, 
                    they can be applied by someone with Editor permissions.</IonItem>
                : <ChangeGrid rows={publishedChangeRows} type="history" gameId={gameId} characterId={characterId} />
              }
            </div>
          </IonAccordion>

          <IonAccordion>
            <IonItem slot="header" color="light">
              <IonLabel>Recent Unapplied Changes</IonLabel>
            </IonItem>

            <div slot="content">
              {recentChangeRows.length === 0 
                ? <IonItem color={"primary"}>This character has no changes that are based on the latest version.
                    Go to the Edit section to submit changes.</IonItem>
                : <ChangeGrid rows={recentChangeRows} type="recent" gameId={gameId} characterId={characterId} />
              }
            </div>
          </IonAccordion>

          <IonAccordion>
            <IonItem slot="header" color="light">
              <IonLabel>Older Unapplied Changes</IonLabel>
            </IonItem>

            <div slot="content">
              {outdatedChangeRows.length === 0 
                ? <IonItem color={"primary"}>This character has no changes that are based on the older versions.</IonItem>
                : <ChangeGrid rows={outdatedChangeRows} type="recent" gameId={gameId} characterId={characterId} />
              }
            </div>
          </IonAccordion>
        </IonAccordionGroup>
      </IonContent>
    </HeaderPage>
  );
}


interface ChangeGridProps {
  rows: ListChangesViewRow[];
  type: 'history' | 'recent' | 'outdated';
  gameId: string;
  characterId: string;
}
function ChangeGrid({rows, type, gameId, characterId}: ChangeGridProps) {
  return(
    <IonGrid>
    {rows.map((row) => {
      const changeTitle = row.value.updateTitle;
      const uploader = row.value.createdBy;
      const changeDescription = row.value.updateDescription; //descriptions are optional
      const versionString = row.value.updateVersion ? '(v'+row.value.updateVersion+')'  : ''; //versions are optional
      const createdAt = new Date(row.key[2]).toLocaleDateString();
      const url = util.getChangeUrl(gameId, characterId, changeTitle, type === 'history');
      
      return (
        <IonRow key={changeTitle}>
          <IonCol size="12">
            <IonRouterLink routerLink={url}>
              <IonItem>
                <IonLabel class="ion-text-wrap">
                  <h2>{changeTitle} {versionString} - <i>{createdAt}</i></h2>
                  <p>{changeDescription}</p>
                  <p><i>Uploaded by {uploader}</i></p>
                </IonLabel>
              </IonItem>
            </IonRouterLink>
          </IonCol>
        </IonRow>
      );
    })}
    </IonGrid>
  );
}

export default ChangeBrowser;
