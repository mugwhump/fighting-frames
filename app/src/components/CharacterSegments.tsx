import { IonContent, IonButton, IonSegment, IonSegmentButton, IonLabel, IonFooter, IonToolbar, } from '@ionic/react';
import React, { useEffect, useState, MouseEvent } from 'react';
import { Route, Switch, useParams, useHistory, useLocation, useRouteMatch } from 'react-router-dom';
import { SegmentChangeEventDetail, SegmentCustomEvent } from '@ionic/core';
//import PouchDB from 'pouchdb';
import { useTrackedCharacterState  } from '../services/CharacterReducer';
import Character from '../pages/Character';
import EditCharacter from '../pages/EditCharacter';
import ChangeBrowser from '../pages/ChangeBrowser';
import ChangeViewer from '../pages/ChangeViewer';
import { DesignDoc, ColumnDefs } from '../types/characterTypes';
import * as util from '../services/util';
import { SegmentUrl } from '../types/utilTypes';
import CompileConstants from '../constants/CompileConstants';

type CharacterSegmentsProps = {
  gameId: string,
  columnDefs: ColumnDefs,
  universalPropDefs: ColumnDefs,
}


// DEPRECATED. No longer using this component for navigation.
const CharacterSegments: React.FC<CharacterSegmentsProps> = ({ gameId, columnDefs, universalPropDefs }) => {
  const { characterId, segment } = useParams<{ characterId: string; segment: string }>(); 
  const state = useTrackedCharacterState ();
  const baseUrl = util.getSegmentUrl(gameId, characterId, SegmentUrl.Base);
  const history = useHistory();
  //const location: string = useLocation().pathname;
  //const currentSegment: SegmentUrl = segmentFromUrl(location);
  const currentSegment: SegmentUrl = segmentFromParam(segment);

  //given url expected to contain baseUrl
  //TODO: allow extra url parameters to identify changes or history
  function segmentFromParam(segmentParam?: string): SegmentUrl {
    if(!segmentParam || segmentParam === "") return SegmentUrl.Base;
    if(segmentParam === SegmentUrl.Edit) return SegmentUrl.Edit;
    if(segmentParam === SegmentUrl.Changes) return SegmentUrl.Changes;
    {/*if(segmentParam === SegmentUrl.History) return SegmentUrl.History;*/}
    console.error("Non-matching segment param: "+segmentParam);
    return SegmentUrl.Base;
  }
  //function segmentFromUrl(url: string): SegmentUrl {
    //if(url === baseUrl) return SegmentUrl.Base;
    //if(url === baseUrl + SegmentUrl.Edit) return SegmentUrl.Edit;
    //if(url === baseUrl + SegmentUrl.Changes) return SegmentUrl.Changes;
    //if(url === baseUrl + SegmentUrl.History) return SegmentUrl.History;
    //console.error("Non-matching url: "+url);
    //return SegmentUrl.Base;
  //}
  function clickedSegment(e: MouseEvent<HTMLIonSegmentButtonElement>) {
    //let url = baseUrl + (e?.currentTarget?.value || '');
    let url = util.getSegmentUrl(gameId, characterId, segmentFromParam(e?.currentTarget?.value));
    history.push(url);
  }


  //NOTE: components are not unmounted when segment switches TODO: check true with routes
  return (
    <>
    <IonContent fullscreen>
      <Switch>
        <Route path={util.getSegmentUrl(gameId, characterId, SegmentUrl.Edit)} >
          <EditCharacter gameId={gameId} columnDefs={columnDefs} universalPropDefs={universalPropDefs} />
        </Route>
        <Route path={util.getSegmentUrl(gameId, characterId, SegmentUrl.Changes)+'/:changeTitle'} >
          <ChangeViewer gameId={gameId} columnDefs={columnDefs} universalPropDefs={universalPropDefs} />
        </Route>
        <Route path={util.getSegmentUrl(gameId, characterId, SegmentUrl.Changes)} >
          <ChangeBrowser gameId={gameId} />
        </Route>
        {/*<Route path={util.getSegmentUrl(gameId, character, SegmentUrl.History)} >*/}
          {/*<div>History not yet implemented</div>*/}
        {/*</Route>*/}
        <Route path={util.getSegmentUrl(gameId, characterId, SegmentUrl.Base)} >
          <Character columnDefs={columnDefs} universalPropDefs={universalPropDefs} /> 
        </Route>
      </Switch>
      {/*{currentSegment === SegmentUrl.Base ?*/}
        {/*<Character columnDefs={columnDefs} universalPropDefs={universalPropDefs} /> */}
        {/*: currentSegment === SegmentUrl.Edit ? <EditCharacter gameId={gameId} columnDefs={columnDefs} universalPropDefs={universalPropDefs} />*/}
        {/*: currentSegment === SegmentUrl.Changes ? <ChangeBrowser gameId={gameId} />*/}
        {/*: <div>History not yet implemented</div>*/}
      {/*}*/}
    </IonContent>

    <IonFooter>
      <IonToolbar>
        <IonSegment value={currentSegment}>
          <IonSegmentButton onClick={clickedSegment} value={SegmentUrl.Base}>
            <IonLabel>Default</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton onClick={clickedSegment} value={SegmentUrl.Edit}>
            <IonLabel>Edit</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton onClick={clickedSegment} value={SegmentUrl.Changes}>
            <IonLabel>Changes</IonLabel>
          </IonSegmentButton>
          {/*<IonSegmentButton onClick={clickedSegment} value={SegmentUrl.History}>*/}
            {/*<IonLabel>History</IonLabel>*/}
          {/*</IonSegmentButton>*/}
        </IonSegment>
      </IonToolbar>
    </IonFooter>
    </>
  );
}

export default CharacterSegments
