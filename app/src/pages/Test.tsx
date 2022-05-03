import { IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar, IonInput, IonItem, useIonViewDidEnter, IonButton } from '@ionic/react';
import React, { useState } from 'react';
import { useParams } from 'react-router';
import './Page.css';
import PouchDB from 'pouchdb';
import * as myPouch from '../services/pouch';
import { remote, getDB, pullDB, pushDB, deleteDBWhichOutdatesDBReferences /*syncDB, remote */} from '../services/pouch';
import { ColumnChange, Changes, ColumnData } from '../types/characterTypes';

//Could extend the router props if wanted to. Pass in db as prop from parent?
type TestProps = {
  propNum: number,
  propStr: string
}

const Test: React.FC<TestProps> = ({propNum, propStr}) => {

  const { name } = useParams<{ name: string; }>(); //router has its own props
  const [text, setText] = useState<string>('default'); //guess this is for my text entry thing
  //let db : PouchDB.Database; //this seems to have it undefined, can't assign in viewEnter?
  let db : PouchDB.Database = getDB('local-test');

  /*
  useEffect(() => {
    console.log(gameId+"~~useEffect, called only on initial render if empty array given for watch variables");
    return () => console.log("~~useEffect cleanup fun called on unmount");
  }, [] ); //if no empty array, called on EVERY RENDER
  useEffect(() => {
    console.log(gameId+"~~useEffect, called on every render");
  });
  */


  function getFirstDoc(callback: (doc: any) => void) : void {
    db.allDocs().then((docs : PouchDB.Core.AllDocsResponse<{}>) => {
      if(docs.rows.length > 0) {
        let docInfo = docs.rows[0]; 
        db.get(docInfo.id).then((doc : any ) => {
          callback(doc);
        });
      }
      console.log('got da thingy :DD');
    }).catch((err) => {
      console.log(err);
    });
  }

  function getDocById(id: string, callback: (doc: any) => void) : void {
    db.get(id).then((doc : any ) => {
      callback(doc);
      console.log('got specific doc');
    }).catch((err) => {
      console.log(err);
    });
  }

  async function pushButton() {
    setText("Pushed da button!");
    await deleteTest();
    console.log("Baleet finito");
    getFirstDoc((doc) => {
      console.log(doc['title'] + ", new title: " + text);
      //doc.title = text; //no worky?
      //db.put(doc);
      db.put({_id: doc._id, _rev: doc._rev, title: text});
      pushDB(db);
      console.log('got da thingy :DD');
    });
  }

  async function deleteTest() {
    await deleteDBWhichOutdatesDBReferences("test");
    //deletion invalidates the old db reference, must make new one
    //db = getDB('local-test');
    console.log("Baleet ACTUALLY finito");
  }

  async function loginTest() {
    //logging into one DB object that initially used basic auth will cause all DB objects for the same remote DB to use session auth
    const pouch1: PouchDB.Database = myPouch.getDB(myPouch.remoteWithBasicCreds+"sc6");
    let result = await pouch1.logIn("public","password");
    const pouch2: PouchDB.Database = myPouch.getDB(myPouch.remote+"sc6");
    let result2 = await pouch2.getSession();
    console.log(`pouch1 login: ${JSON.stringify(result)}`);
    console.log(`pouch2 login: ${JSON.stringify(result2)}`);
  }

  async function mapSerializationTest() {
    let changeAdd = {
      type: "add", 
      new: "green" as ColumnData,
      old: null 
    } as ColumnChange;
    let changeModify = {
      type: "modify", 
      new:  70 as ColumnData,
      old: 69 as ColumnData,
    } as ColumnChange;
    let changes: Changes = {} as Changes;
    changes.boogers = changeAdd;
    changes.damage = changeModify;
    let putDoc: PouchDB.Core.PutDocument<Object> = changes; 
    putDoc._id = "changesTest";
    putDoc._rev = (await db.get<Changes>("changesTest"))?._rev ?? undefined;
    await db.put(putDoc);
    let readDoc = await db.get<Changes>('changesTest');
    // As long as Changes isn't the top-level document, _id and _rev won't fuck up the object entries
    let deSerialized: Changes = readDoc;
    console.log("Stored and read dem changes, " + JSON.stringify(deSerialized));
  }

  useIonViewDidEnter(() => {
    console.log('ion view did enter event fired');
    mapSerializationTest();
    //pullDB("test");
    //getDocById("_design/testdesign", (doc) => {
      //setText(doc.title);
    //});
  });

  const mapToMap = new Map([[1,'one'],[2,'two']])

  return (
    <IonPage>
    {mapToMap.forEach((v,k)=>{return(<span>v</span>)})}
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
          <IonInput value={text} onIonChange={e => setText(e.detail.value!)}></IonInput>
        </IonItem> 
        <IonButton onClick={() => pushButton()}>Push</IonButton>
      </IonContent>
    </IonPage>
  );
};

export default Test;
