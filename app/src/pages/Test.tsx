import { IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar, IonInput, IonItem, useIonViewDidEnter, IonButton } from '@ionic/react';
import React, { useState } from 'react';
import { useParams } from 'react-router';
import ExploreContainer from '../components/ExploreContainer';
import './Page.css';
import PouchDB from 'pouchdb';
import { getDB, pullDB, pushDB, syncDB } from '../services/pouch';

//Could extend the router props if wanted to. Pass in db as prop from parent?
type TestProps = {
  propNum: number,
  propStr: string
}

const Test: React.FC<TestProps> = ({propNum, propStr}) => {

  const { name } = useParams<{ name: string; }>(); //router has its own props
  const [text, setText] = useState<string>('default'); //guess this is for my text entry thing
  let db : PouchDB.Database; //this seems to have it undefined 

  function pushButton() {
    setText("Pushed da button!");
    db.allDocs().then((docs : PouchDB.Core.AllDocsResponse<{}>) => {
      if(docs.rows.length > 0) {
        let docInfo = docs.rows[0]; 
        db.get(docInfo.id).then((doc : any ) => {
          console.log(doc['title']);
          pushDB(db);
        });
      }
      console.log('got da thingy :DD');
    }).catch((err) => {
      console.log(err);
    });
  }

  useIonViewDidEnter(() => {
    console.log('ion view did enter event fired');
    db = getDB('test');
    pullDB(db);
  });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>{name}AIIEEEEEE IONIC I KNEEL</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">{name}THIS FILE AINT BEIN USEDJK,S</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonItem>
          <IonInput value={text}></IonInput>
        </IonItem> 
        <IonButton onClick={() => pushButton()}>Push</IonButton>
      </IonContent>
    </IonPage>
  );
};

export default Test;
