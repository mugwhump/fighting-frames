import { IonRouterLink, useIonAlert, IonPopover, IonIcon, IonFab, IonFabButton, IonLabel, IonList, IonButton, IonItem, IonGrid, IonRow, IonCol } from '@ionic/react';
import { thumbsUpOutline } from 'ionicons/icons';
import React, { useEffect }from 'react';
import { useView, useDoc } from 'use-pouchdb'
import * as myPouch from '../services/pouch';
import * as util from '../services/util';
import type { ChangeDocWithMeta } from '../types/characterTypes';
import type { ListChangesViewRow, ListChangesViewRowValue } from '../types/utilTypes'; //==
import { State, useCharacterDispatch, EditAction, useTrackedCharacterState, useCharacterSelector, useMiddleware, selectMoveOrder } from '../services/CharacterReducer';
import { useLoginInfoContext, LoginInfo } from './LoginProvider';
import ChangeViewer from './ChangeViewer';

type ChangeBrowserProps = {
  gameId: string
}

export const ChangeBrowser: React.FC<ChangeBrowserProps> = ({gameId}) => {
  const state = useTrackedCharacterState();
  //const loginInfo = useLoginInfoContext();
  const baseRev = state.charDoc._rev;
  const publishedChanges = state.charDoc.changeHistory;
  //regarding how to match first element of array key: https://stackoverflow.com/questions/9687297/couchdb-search-or-filtering-on-key-array
  const { rows, loading, state: viewState, error } = useView<ListChangesViewRow, ChangeDocWithMeta>("changes/list-changes", {descending: true, startkey: [state.characterId, {}], endkey: [state.characterId]}); 

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

  return (
    <IonGrid>
      {rows.map((row: ListChangesViewRow) => {
        const changeTitle = row.value.updateTitle;
        const changeDescription = row.value.updateDescription; //descriptions are optional
        const changeBasis = row.value.baseRevision;
        const needsRebase = changeBasis !== baseRev;
        const published = publishedChanges.includes(changeTitle);
        const uri = util.getChangeUrl(gameId, state.characterId, changeTitle);
          return (
            <IonRouterLink key={changeTitle} routerLink={uri}>
              <IonRow >
                {published && <IonIcon md={thumbsUpOutline} color="black" />}
                <IonItem color={needsRebase ? "warning" : "primary"}>{changeTitle}</IonItem>
                <IonItem>{changeDescription}</IonItem>
              </IonRow>
            </IonRouterLink>
          );
      })}
    </IonGrid>
  );
}

export default ChangeBrowser;
