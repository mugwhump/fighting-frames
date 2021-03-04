import { IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar, IonInput, IonItem, useIonViewDidEnter, IonButton } from '@ionic/react';
import React, { useState } from 'react';
import { useParams } from 'react-router';
import PouchDB from 'pouchdb';
import { Provider } from 'use-pouchdb'
import * as myPouch from '../services/pouch';
import Character from '../components/Character';

//This component will become the container for a game with corresponding db,
//within which chars/docs will be displayed. Has <Provider> with overriding db

//Could extend the router props if wanted to. Pass in db as prop from parent?
type GameProps = {
  gameName: string
}

const Game: React.FC<GameProps> = ({gameName}) => {
  const { name } = useParams<{ name: string; }>(); //router has its own props
  const localDb : PouchDB.Database = myPouch.getDB("local");
  const remoteDb : PouchDB.Database = myPouch.getDB(myPouch.remote + "sc6");

  useIonViewDidEnter(() => {
    console.log('ion view did enter event fired in game');
  });

  return (
    <Provider default="remote" databases={{local: localDb, remote: remoteDb}}>
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonMenuButton />
            </IonButtons>
            <IonTitle>{gameName} is the game</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonContent fullscreen>
          <Character charName="talim" />
        </IonContent>
      </IonPage>
    </Provider> 
  );
};

export default Game;
