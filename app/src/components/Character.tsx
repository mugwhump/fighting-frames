import { IonItem, useIonViewDidEnter, IonGrid, IonRow } from '@ionic/react';
import React from 'react';
import { useParams } from 'react-router';
import { useDoc } from 'use-pouchdb';
import {Move, ColumnDef, UniversalPropDef, CharDoc } from '../types/characterTypes';
import MoveComponent from './MoveComponent';

//Have child move components that are passed properties 
//Universal character properties (health, backdash, speed, etc)
//When editing activated, bring up a modal that lists column vals one by one
//If there's key needed for editing, prompt for it before bringing up interface
type CharProps = {
  columns: ColumnDef[],
  universalProps: UniversalPropDef[],
}

const Character: React.FC<CharProps> = ({columns, universalProps}) => {
  const { character } = useParams<{ character: string; }>(); //router has its own props
  const { doc, loading, state, error } = useDoc<CharDoc>('character/'+character); 

  useIonViewDidEnter(() => {
    console.log('ion view did enter event fired in character character/'+character);
  });

  if (state === 'error') {
    console.error("heckin errorino in Character: " + error?.message);
    return (<span>heckin errorino: {error?.message}</span>);
  }
  if (loading && doc == null) {
    return (<h1> loadin</h1>);
  }
  return (
    <IonGrid>
      <IonRow>
        <IonItem>
          <p>{doc!.charName} is the character (DB)</p><br />
          <p>{JSON.stringify(doc)}</p>
        </IonItem>
      </IonRow>
      {doc!.moves.map((move: Move) => (
        <MoveComponent key={move.moveName} move={move} columns={columns} />
      ))}
    </IonGrid>
  );
};

export default Character;
