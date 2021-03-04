import { IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar, IonInput, IonItem, useIonViewDidEnter, IonButton } from '@ionic/react';
import React, { useState } from 'react';
import { useParams } from 'react-router';
import PouchDB from 'pouchdb';
import * as myPouch from '../services/pouch';
import { Provider, useDoc } from 'use-pouchdb'

//Could extend the router props if wanted to. Pass in db as prop from parent?
type CharProps = {
  charName: string
}

type Move = {
  //universal properties
  category: string,
  moveName: string,
  input: string, //maybe this should be the id
  tags: string[], //will surely be useful for somethin
  columnProps: [{column: string, data: any}],
  outdated: number | boolean, //false for up-to-date, true for mistake, version # for old patch properties
}

enum ColumnDataType { //these mostly determine the editing interface presented
  Int = "INTEGER",
  Num = "NUMBER",
  Str = "STRING",
  Txt = "TEXT"
}

//enfore editing restrictions?
type Column = {
  columnName: string,
  dataType: ColumnDataType,
  defaultShow: boolean,
  cssRegexes: {regex: RegExp, css: string} | null
}

type CharDoc = {
  charName: string,
  //should this have columns for universal stuff like name, input, etc
  defaultColumns: Column[],
  //different sections/categories have different column display options
  categoryColumns: [{category: string, cols: Column[]}], 
  //sorting options? Categories would be intermixed
  moves: Move[],
}

const Character: React.FC<CharProps> = ({charName}) => {
  const { doc, loading, state, error } = useDoc<CharDoc>(charName); 

  useIonViewDidEnter(() => {
    console.log('ion view did enter event fired in character');
  });

  if (state === 'error') {
    return (<span>heckin errorino: {error?.message}</span>);
  }
  if (loading && doc == null) {
    return (<h1> loadin</h1>);
  }
  return (
      <IonItem>
        <p>{charName} is the character</p><br />
        <p>{JSON.stringify(doc)}</p>
      </IonItem>
  );
};

export default Character;
