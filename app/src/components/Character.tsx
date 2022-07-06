import { useIonModal, useIonAlert, IonPopover, IonIcon, IonFab, IonFabButton, IonLabel, IonList, IonButton, IonSegment, IonSegmentButton, IonFooter, IonToolbar, IonContent, IonItem, IonGrid, IonRow } from '@ionic/react';
import React, { useRef, useState, useEffect, MouseEvent }from 'react';
import { SegmentChangeEventDetail, SegmentCustomEvent } from '@ionic/core';
import { add, trashBin } from 'ionicons/icons';
import { useParams, useHistory, useLocation } from 'react-router';
import { Action } from 'history';
import { Link } from 'react-router-dom';
import { useDoc, usePouch } from 'use-pouchdb';
import {MoveOrder, ColumnDef, ColumnDefs, ColumnData, Cols, PropCols, MoveCols, CharDoc, } from '../types/characterTypes';
import { requiredPropDefs } from '../constants/internalColumns';
import EditCharacter from './EditCharacter';
import MoveOrUniversalProps from './MoveOrUniversalProps';
import { CategoryAndChildRenderer } from './CategoryAndChildRenderer';
import { setTimeout } from 'timers';

//Have child move components that are passed properties.
//Shows universal character properties (health, backdash, speed, etc) at top.
//When editing activated, bring up a modal that lists column vals one by one
//If there's key needed for editing, prompt for it before bringing up interface
type CharProps = {
  doc: CharDoc;
  columnDefs: ColumnDefs,
  universalPropDefs: ColumnDefs,
}


export const Character: React.FC<CharProps> = ({doc, columnDefs, universalPropDefs}) => {
  const moveOrder: MoveOrder[] = doc?.universalProps?.moveOrder || [];

  return (
    <IonGrid>
      <IonRow>
        <IonItem>
          <p>{doc.charName} is the character (DB)</p><br />
          <p>{JSON.stringify(doc)}</p>
        </IonItem>
      </IonRow>
        <MoveOrUniversalProps moveName="universalProps" columns={doc.universalProps} columnDefs={universalPropDefs} editMove={false}/>
        {moveOrder.map((moveOrCat: MoveOrder) => {
          const {name, isCategory, indent} = {...moveOrCat};
          let moveCols = doc.moves[name];
          //console.log("rendering moveorcat:"+JSON.stringify(moveOrCat)+", cols:"+JSON.stringify(moveCols));
          return (
            <CategoryAndChildRenderer key={name} name={name} isCategory={isCategory} >
            {moveCols !== undefined
              ? <MoveOrUniversalProps moveName={name} indentLevel={indent} columns={moveCols} columnDefs={columnDefs} editMove={false}/>
              : <div>No data for move {name}</div>
            }
            </CategoryAndChildRenderer> 
          );
        })}
    </IonGrid>
  );
};

export default Character;
