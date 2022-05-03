import { useIonModal, useIonAlert, IonPopover, IonIcon, IonFab, IonFabButton, IonLabel, IonList, IonButton, IonSegment, IonSegmentButton, IonFooter, IonToolbar, IonContent, IonItem, IonGrid, IonRow } from '@ionic/react';
import React, { useRef, useState, useEffect, MouseEvent }from 'react';
import { SegmentChangeEventDetail, SegmentCustomEvent } from '@ionic/core';
import { add, trashBin } from 'ionicons/icons';
import { useParams, useHistory, useLocation } from 'react-router';
import { Action } from 'history';
import { Link } from 'react-router-dom';
import { useDoc, usePouch } from 'use-pouchdb';
import {MoveOrder, ColumnDef, ColumnDefs, ColumnData, Cols, PropCols, MoveCols, CharDoc, } from '../types/characterTypes';
import { requiredPropDefs } from '../types/internalColumns';
import EditCharacter from './EditCharacter';
import MoveOrUniversalProps from './MoveOrUniversalProps';
import { CategoryAndChildRenderer } from './CategoryAndChildRenderer';
import { setTimeout } from 'timers';

//Have child move components that are passed properties.
//Shows universal character properties (health, backdash, speed, etc) at top.
//When editing activated, bring up a modal that lists column vals one by one
//If there's key needed for editing, prompt for it before bringing up interface
type CharProps = {
  gameId: string,
  columnDefs: ColumnDefs,
  universalPropDefs: ColumnDefs,
}

//these are suffixes that go at the end of the url
export enum SegmentUrl {
  Base = '',
  Edit = '/local-edit',
  Versions = '/versions'
}

//TODO: sorting by some column, probably not in editing view?
export const Character: React.FC<CharProps> = ({gameId, columnDefs, universalPropDefs}) => {
  const { character } = useParams<{ character: string; }>(); //router has its own props
  const baseUrl = "/game/"+gameId+"/character/"+character;
  const history = useHistory();
  const location: string = useLocation().pathname;
  const currentSegment: SegmentUrl = segmentFromUrl(location);
  const { doc, loading, state, error } = useDoc<CharDoc>('character/'+character); 
  const moveOrder: MoveOrder[] = doc?.universalProps?.moveOrder || [];
  addRequiredDefs();
  console.log("doc's ID:" + doc?._id);

  // required column definitions are inserted, overwriting whatever might have been in db
  function addRequiredDefs() {
    for(const def of requiredPropDefs) {
      universalPropDefs[def.columnName] = def;
    }
  }

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


  if (state === 'error') {
    console.error("heckin errorino in Character: " + error?.message);
    return (<span>heckin errorino: {error?.message}</span>);
  }
  if (loading && doc == null) {
    return (<h1> loadin</h1>);
  }
  //TODO: this doesn't fly for freshly-made docs... then again, latter two should be empty objects which are truthy...
  if(!(doc?.charName && doc?.universalProps && doc?.moves)) {
    return (<h1> Incomplete document</h1>);
  }

  let baseContent = (
    <IonGrid>
      <IonRow>
        <IonItem>
          <p>{doc.charName} is the character (DB)</p><br />
          <p>{JSON.stringify(doc)}</p>
        </IonItem>
      </IonRow>
      {/*
        doc.universalProps.map((prop: ColumnData) => {
          const keys = Object.keys(prop);
          return (
            <div key={prop.columnName}>{prop.columnName}: {prop.data}</div>
          )
        })
        */}
        <MoveOrUniversalProps moveName="universalProps" columns={doc.universalProps} columnDefs={universalPropDefs} />
        {moveOrder.map((moveOrCat: MoveOrder) => {
          const {name, isCategory, indent} = {...moveOrCat};
          let moveCols = doc.moves[name];
          //console.log("rendering moveorcat:"+JSON.stringify(moveOrCat)+", cols:"+JSON.stringify(moveCols));
          return (
            <CategoryAndChildRenderer key={name} name={name} isCategory={isCategory} >
            {moveCols !== undefined
              ? <MoveOrUniversalProps moveName={name} indentLevel={indent} columns={moveCols} columnDefs={columnDefs} />
              : <div>No data for move {name}</div>
            }
            </CategoryAndChildRenderer> 
          );
        })}
    </IonGrid>
  );

  return (
    <>
    <IonContent fullscreen>
      {currentSegment === SegmentUrl.Base ?
        baseContent :
        <EditCharacter gameId={gameId} charDoc={doc} columnDefs={columnDefs} universalPropDefs={universalPropDefs} />
      }
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
