import { IonRouterLink, IonLabel, IonButton, IonSegment, IonSegmentButton, IonFooter, IonToolbar, IonContent, IonItem, useIonViewDidEnter, IonGrid, IonRow } from '@ionic/react';
import React, { useRef, useState, useEffect, MouseEvent }from 'react';
import { SegmentChangeEventDetail, SegmentCustomEvent } from '@ionic/core';
import { useParams, useHistory, useLocation } from 'react-router';
import { Action } from 'history';
import { Link } from 'react-router-dom';
import { useDoc, usePouch } from 'use-pouchdb';
import {Move, ColumnDef, UniversalPropDef, CharDoc, UniversalPropData } from '../types/characterTypes';
import MoveComponent from './MoveComponent';
import { setTimeout } from 'timers';

//Have child move components that are passed properties.
//Shows universal character properties (health, backdash, speed, etc) at top.
//When editing activated, bring up a modal that lists column vals one by one
//If there's key needed for editing, prompt for it before bringing up interface
type CharProps = {
  gameId: string,
  columns: ColumnDef[],
  universalProps: UniversalPropDef[],
}

//these are suffixes that go at the end of the url
enum SegmentUrl {
  Base = '',
  Edit = '/local-edit',
  Versions = '/versions'
}

export const Character: React.FC<CharProps> = ({gameId, columns, universalProps}) => {
  const { character } = useParams<{ character: string; }>(); //router has its own props
  const baseUrl = "/game/"+gameId+"/character/"+character;
  //const [segmentValue, setSegmentValue] = useState<string>(baseUrl);
  const history = useHistory();
  const location: string = useLocation().pathname;
  const currentSegment: SegmentUrl = segmentFromUrl(location);
  const docEditId = 'character/'+character+SegmentUrl.Edit;
  const { doc, loading, state, error } = useDoc<CharDoc>('character/'+character); 
  const { doc: editDoc, loading: editLoading, state: editState, error: editError } = useDoc<CharDoc>(docEditId, {db: "local"}); 
  const currentDoc: CharDoc | null = (currentSegment === SegmentUrl.Edit) ? editDoc : doc;
  const localDatabase: PouchDB.Database = usePouch('local');

  //given url expected to contain baseUrl
  function segmentFromUrl(url: string): SegmentUrl {
    if(url === baseUrl) return SegmentUrl.Base;
    if(url === baseUrl + SegmentUrl.Edit) return SegmentUrl.Edit;
    if(url === baseUrl + SegmentUrl.Versions) return SegmentUrl.Versions;
    console.error("Non-matching url: "+url);
    return SegmentUrl.Base;
  }

  function clickedSegment(e: MouseEvent<HTMLIonSegmentButtonElement>) {
    let url = baseUrl + (e?.currentTarget?.value || '');
    history.push(url);
  }

  async function writeEditDoc(docExists: boolean = true) {
    //if(!state.preferences.localEnabled) {
      //console.log("Not saving local data since local disabled");
      //return; //compiler wraps in immediately-resolved promise
    //}
    if(!doc) {
      throw new Error(`Base document for ${character} not yet loaded.`);
    }
    const putDoc: PouchDB.Core.PutDocument<CharDoc> = doc; 
    putDoc._id = docEditId; 
    if(docExists) {
      const currentDoc = await localDatabase.get<CharDoc>(docEditId);
      putDoc._rev = currentDoc._rev;
    }
    else {
      putDoc._rev = undefined;
    }
    if(editDoc) {
      putDoc._rev = editDoc._rev;
    }
    return await localDatabase.put(putDoc).then(() => {
      console.log("Successful write to edit doc");
    }).catch((err) => {
      if(err.name === "conflict") { //if one write starts while another's in progress, 409 immediate conflict.
        console.log(`conflict writing edit, retrying: ` + JSON.stringify(err));
        writeEditDoc();
      }
      else {
        throw(err);
      }
    });
  }
 

  //useEffect(()=>{
  if (editState === 'error') {
    if(currentSegment === SegmentUrl.Edit) {
      if(editError?.message === "missing") {
        console.log(`Local editing doc ${docEditId} not found, creating.`);
        writeEditDoc(false).then(() => {
          //console.log("Called writeEditDoc");
        }).catch((err) => {
          console.error(err);
          return(<span>Error loading local edit doc: {editError?.message}</span>);
        });
      }
      else {
        console.error("heckin errorino editing Character: " + editError?.message);
        return(<span>Error loading local edit doc: {editError?.message}</span>);
      }
    }
  }
  //}, [stateEdit, errorEdit, currentSegment]);
  if (state === 'error') {
    console.error("heckin errorino in Character: " + error?.message);
    return (<span>heckin errorino: {error?.message}</span>);
  }
  if ((loading && doc == null) || (editLoading && editDoc == null)) {
    return (<h1> loadin</h1>);
  }
  return (
    <>
    <IonContent fullscreen>
      <IonGrid>
        <IonRow>
          <IonItem>
            <p>{currentDoc!.charName} is the character (DB)</p><br />
            <p>{JSON.stringify(doc)}</p>
          </IonItem>
        </IonRow>
        {currentDoc!.universalProps.map((prop: UniversalPropData) => {
          const keys = Object.keys(prop);
          return (
            <div key={prop.propName}>{prop.propName}: {prop.data}</div>
          )
        })}
        {currentDoc!.moves.map((move: Move) => (
          <MoveComponent key={move.moveName} move={move} columns={columns} />
        ))}
      </IonGrid>
    </IonContent>

    <IonFooter>
      <IonToolbar>
        <IonSegment value={segmentFromUrl(location)}>
        {/*<IonSegment onIonChange={changeSegment}>*/}
        {/*<IonSegment>*/}
        {/*<Link to={baseUrl}>*/}
          <IonSegmentButton onClick={clickedSegment} value={SegmentUrl.Base}>
            <IonLabel>Default</IonLabel>
          </IonSegmentButton>
          {/*</Link>*/}
        {/*<Link to={baseUrl+"/local-edit"}>*/}
          <IonSegmentButton onClick={clickedSegment} value={SegmentUrl.Edit}>
            <IonLabel>Edit</IonLabel>
          </IonSegmentButton>
          {/*</Link>*/}
        {/*<Link to={baseUrl+"/versions"}>*/}
          <IonSegmentButton onClick={clickedSegment} value={SegmentUrl.Versions}>
            <IonLabel>Versions</IonLabel>
          </IonSegmentButton>
          {/*</Link>*/}
        </IonSegment>
      </IonToolbar>
    </IonFooter>
    </>
  );
};

//export default Character;
