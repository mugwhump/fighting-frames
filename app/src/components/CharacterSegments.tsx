import { IonContent, IonButton, IonSegment, IonSegmentButton, IonLabel, IonFooter, IonToolbar, } from '@ionic/react';
import React, { useEffect, useState, MouseEvent } from 'react';
import { Route, useParams, useHistory, useLocation } from 'react-router-dom';
import { SegmentChangeEventDetail, SegmentCustomEvent } from '@ionic/core';
//import PouchDB from 'pouchdb';
import { useTrackedCharacterState  } from '../services/CharacterReducer';
import { requiredPropDefs, moveNameColumnDef } from '../constants/internalColumns';
import { Character } from '../components/Character';
import { EditCharacter } from '../components/EditCharacter';
import { ChangeBrowser } from '../components/ChangeBrowser';
import { DesignDoc, ColumnDefs } from '../types/characterTypes';
import * as util from '../services/util';
import { SegmentUrl } from '../types/utilTypes';

type CharacterSegmentsProps = {
  gameId: string,
  columnDefs: ColumnDefs,
  universalPropDefs: ColumnDefs,
}


const CharacterSegments: React.FC<CharacterSegmentsProps> = ({ gameId, columnDefs, universalPropDefs }) => {
  const { character } = useParams<{ character: string; }>(); //router has its own props
  const state = useTrackedCharacterState ();
  const baseUrl = util.getSegmentUri(gameId, character, SegmentUrl.Base);
  const history = useHistory();
  const location: string = useLocation().pathname;
  const currentSegment: SegmentUrl = segmentFromUrl(location);

  //given url expected to contain baseUrl
  //TODO: allow extra url parameters to identify changes or history
  function segmentFromUrl(url: string): SegmentUrl {
    if(url === baseUrl) return SegmentUrl.Base;
    if(url === baseUrl + SegmentUrl.Edit) return SegmentUrl.Edit;
    if(url === baseUrl + SegmentUrl.Changes) return SegmentUrl.Changes;
    if(url === baseUrl + SegmentUrl.History) return SegmentUrl.History;
    console.error("Non-matching url: "+url);
    return SegmentUrl.Base;
  }
  function clickedSegment(e: MouseEvent<HTMLIonSegmentButtonElement>) {
    let url = baseUrl + (e?.currentTarget?.value || '');
    history.push(url);
  }

  // required column definitions are inserted, overwriting whatever might have been in db
  useEffect(() => {
    for(const def of requiredPropDefs) {
      universalPropDefs[def.columnName] = def;
    }
  }, [universalPropDefs]);

  //NOTE: components are not unmounted when segment switches
  return (
    <>
    <IonContent fullscreen>
      {currentSegment === SegmentUrl.Base ?
        <Character columnDefs={columnDefs} universalPropDefs={universalPropDefs} /> 
        : currentSegment === SegmentUrl.Edit ? <EditCharacter gameId={gameId} columnDefs={columnDefs} universalPropDefs={universalPropDefs} />
        : currentSegment === SegmentUrl.Changes ? <ChangeBrowser />
        : <div>History not yet implemented</div>
      }
    </IonContent>

    <IonFooter>
      <IonToolbar>
        <IonSegment value={segmentFromUrl(location)}>
          <IonSegmentButton onClick={clickedSegment} value={SegmentUrl.Base}>
            <IonLabel>Default</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton onClick={clickedSegment} value={SegmentUrl.Edit}>
            <IonLabel>Edit</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton onClick={clickedSegment} value={SegmentUrl.Changes}>
            <IonLabel>Changes</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton onClick={clickedSegment} value={SegmentUrl.History}>
            <IonLabel>History</IonLabel>
          </IonSegmentButton>
        </IonSegment>
      </IonToolbar>
    </IonFooter>
    </>
  );
}

export default CharacterSegments
