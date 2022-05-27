import { IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar, IonInput, IonItem, useIonViewDidEnter, IonButton } from '@ionic/react';
import React, { useState } from 'react';
import { useParams } from 'react-router';
import './Page.css';
import PouchDB from 'pouchdb';
import * as myPouch from '../services/pouch';
import { reduceChanges, resolveMoveOrder } from '../services/merging';
import { remote, getDB, pullDB, pushDB, deleteDBWhichOutdatesDBReferences, remoteWithBasicCreds } from '../services/pouch';
import { ColumnChange, Changes, MoveChanges, MoveChangeList, ChangeDoc, ColumnData, MoveOrder, CharDoc } from '../types/characterTypes';
import { cloneDeep, isEqual } from 'lodash';

//Could extend the router props if wanted to. Pass in db as prop from parent?
type TestProps = {
  propNum: number,
  propStr: string
}

const Test: React.FC<TestProps> = ({propNum, propStr}) => {

  const { name } = useParams<{ name: string; }>(); //router has its own props
  const [text, setText] = useState<string>('default'); //guess this is for my text entry thing
  //let db : PouchDB.Database; //this seems to have it undefined, can't assign in viewEnter?
  //let db : PouchDB.Database = getDB('local-test');
  let db : PouchDB.Database = getDB('sc6');

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

  async function moveOrderTest() {
    //logging into one DB object that initially used basic auth will cause all DB objects for the same remote DB to use session auth
    const pouch1: PouchDB.Database = myPouch.getDB(myPouch.remoteWithBasicCreds+"sc6");
    let talimDoc: CharDoc = await pouch1.get('character/talim');
    //console.log('baseDoc order check:' + JSON.stringify(talimDoc.universalProps.moveOrder));
    let result: MoveOrder[] = [];
    result = getResolvedMoveOrder (talimDoc, undefined, undefined, undefined, null);
    compareMoveOrders( baseOrder , result );
    console.log('^^^^^^^^^^^^^ base goes through, no conflict'); //no way to represent base adding/deleting while you change nothing

    result = getResolvedMoveOrder (talimDoc, undefined, reversedOrder, undefined, null);
    compareMoveOrders( reversedOrder, result );
    console.log('^^^^^^^^^^^^^ Reverse order, no conflict');

    result = getResolvedMoveOrder (talimDoc, undefined, undefined, undefined, null, moveAddK);
    compareMoveOrders( addedKEnd, result );
    console.log('^^^^^^^^^^^^^ stealth add(default end), no order changes or conflict');

    result = getResolvedMoveOrder (talimDoc, undefined, addedK, undefined, null, moveAddK);
    compareMoveOrders( addedK, result );
    console.log('^^^^^^^^^^^^^ you manual insert in middle uncontested, no conflict');

    result = getResolvedMoveOrder (talimDoc, reversedOrder, addedK, undefined, "yours", moveAddK);
    compareMoveOrders( addedK, result );
    console.log('^^^^^^^^^^^^^ you add, base reverses, conflict preferring yours');

    result = getResolvedMoveOrder (talimDoc, reversedOrder, addedK, undefined, "no-op", moveAddK);
    compareMoveOrders( [{"name":"BB","indent":1},{"name":"dishonest moves","isCategory":true},{"name":"AA"},{"name":"K"},{"name":"windy moves","isCategory":true}] , result );
    console.log('^^^^^^^^^^^^^ you add, base reverses, conflict preferring base');

    result = getResolvedMoveOrder (talimDoc, undefined, noBBReverse, undefined, "yours");
    compareMoveOrders( [{"name":"dishonest moves","isCategory":true},{"name":"BB","indent":1},{"name":"AA"},{"name":"windy moves","isCategory":true}] , result );
    console.log('^^^^^^^^^^^^^ base adds BB, you reverse, conflict preferring yours');

    result = getResolvedMoveOrder (talimDoc, undefined, noBBReverse, undefined, "no-op");
    compareMoveOrders( baseOrder, result );
    console.log('^^^^^^^^^^^^^ base adds BB, you reverse, conflict preferring base');

    result = getResolvedMoveOrder (talimDoc, undefined, noBB, undefined, null, moveDelBB);
    compareMoveOrders( noBB, result );
    console.log('^^^^^^^^^^^^^ you delete BB, no conflict');

    result = getResolvedMoveOrder (talimDoc, reversedOrder, noBB, undefined, "yours", moveDelBB);
    compareMoveOrders( noBB, result );
    console.log('^^^^^^^^^^^^^ you delete BB, base reverses, conflict preferring yours');

    result = getResolvedMoveOrder (talimDoc, reversedOrder, noBB, undefined, "no-op", moveDelBB);
    compareMoveOrders( noBBReverse, result );
    console.log('^^^^^^^^^^^^^ you delete BB, base reverses, conflict preferring base');

    result = getResolvedMoveOrder (talimDoc, noBB, undefined, undefined, null);
    compareMoveOrders( noBB , result );
    console.log('^^^^^^^^^^^^^ base without BB, no conflict'); //no way to represent base adding/deleting while you change nothing

    result = getResolvedMoveOrder (talimDoc, noBB, reversedOrder, undefined, "yours");
    compareMoveOrders( noBBReverse , result );
    console.log('^^^^^^^^^^^^^ base deletes BB, you reverse, conflict preferring yours');

    result = getResolvedMoveOrder (talimDoc, noBB, reversedOrder, undefined, "no-op");
    compareMoveOrders( noBB , result );
    console.log('^^^^^^^^^^^^^ base deletes BB, you reverse, conflict preferring base');

    // Merging (a merge where they make no changes can be treated as no-conflict rebase)
    result = getResolvedMoveOrder (talimDoc, undefined, undefined, undefined, null, moveAddK);
    compareMoveOrders( addedKEnd , result );
    console.log('^^^^^^^^^^^^^ merge where stealth addition is theirs (as it must be), put at end, no conflict');

    result = getResolvedMoveOrder (talimDoc, undefined, reversedOrder, baseOrder, null, moveAddK);
    compareMoveOrders( [...reversedOrder, {name: "K"}] , result );
    console.log('^^^^^^^^^^^^^ merge with stealth addition to end, you reverse, no conflict');

    result = getResolvedMoveOrder (talimDoc, undefined, addedK, baseOrder, null, moveAddK);
    compareMoveOrders( addedK , result );
    console.log('^^^^^^^^^^^^^ merge with added K from you, no conflict');

    result = getResolvedMoveOrder (talimDoc, undefined, addedK, reversedOrder, "yours", moveAddK);
    compareMoveOrders( addedK , result );
    console.log('^^^^^^^^^^^^^ merge with added K from you, they reverse, conflict preferring yours');

    result = getResolvedMoveOrder (talimDoc, undefined, addedK, reversedOrder, "theirs", moveAddK);
    compareMoveOrders( [{"name":"BB","indent":1},{"name":"dishonest moves","isCategory":true},{"name":"AA"},{"name":"K"},{"name":"windy moves","isCategory":true}], result );
    console.log('^^^^^^^^^^^^^ merge with added K from you, they reverse, conflict preferring theirs');

    result = getResolvedMoveOrder (talimDoc, undefined, undefined, addedK, "theirs", moveAddK);
    compareMoveOrders( addedK , result );
    console.log('^^^^^^^^^^^^^ merge with added K from them, conflict preferring theirs');

    result = getResolvedMoveOrder (talimDoc, undefined, reversedOrder, addedK, "theirs", moveAddK);
    compareMoveOrders( addedK , result );
    console.log('^^^^^^^^^^^^^ merge with added K from them, you reverse, conflict preferring theirs');

    result = getResolvedMoveOrder (talimDoc, undefined, undefined, noBBReverse, "theirs", moveDelBB);
    compareMoveOrders( noBBReverse , result );
    console.log('^^^^^^^^^^^^^ merge with deleted BB and reversal from them, conflict preferring theirs');

    result = getResolvedMoveOrder (talimDoc, undefined, undefined, noBBReverse, "yours", moveDelBB);
    compareMoveOrders( noBB , result );
    console.log('^^^^^^^^^^^^^ merge with deleted BB and reversal from them, conflict preferring yours');

    result = getResolvedMoveOrder (talimDoc, undefined, noBB, baseOrder, null, moveDelBB);
    compareMoveOrders( noBB , result );
    console.log('^^^^^^^^^^^^^ merge with deleted BB from you, no conflict');

    result = getResolvedMoveOrder (talimDoc, undefined, noBB, reversedOrder, "theirs", moveDelBB);
    compareMoveOrders( noBBReverse , result );
    console.log('^^^^^^^^^^^^^ merge with deleted BB from you, reversal from them, conflict preferring theirs');

    result = getResolvedMoveOrder (talimDoc, undefined, noBB, reversedOrder, "yours", moveDelBB);
    compareMoveOrders( noBB , result );
    console.log('^^^^^^^^^^^^^ merge with deleted BB from you, reversal from them, conflict preferring yours');

    result = getResolvedMoveOrder (talimDoc, undefined, noBBReverse, addedK, "yours", {...moveDelBB, ...moveAddK});
    compareMoveOrders( [{"name":"dishonest moves","isCategory":true},{"name":"AA"},{"name":"K"},{"name":"windy moves","isCategory":true}] , result );
    console.log('^^^^^^^^^^^^^ merge with reversed deleted BB from you, added K from them, conflict preferring yours');

    result = getResolvedMoveOrder (talimDoc, undefined, noBBReverse, addedK, "theirs", {...moveDelBB, ...moveAddK});
    compareMoveOrders( addedK.slice(0,-1) , result );
    console.log('^^^^^^^^^^^^^ merge with reversed deleted BB from you, added K from them, conflict preferring theirs');

    result = getResolvedMoveOrder (talimDoc, threeCategories, undefined, addedK, "theirs", moveAddK);
    compareMoveOrders( [{"name":"windy moves","isCategory":true},{"name":"K"},{"name":"dishonest moves","isCategory":true}] , result );
    console.log('^^^^^^^^^^^^^ merge with added K from them, base is just categories, conflict preferring theirs');

    result = getResolvedMoveOrder (talimDoc, threeCategories, undefined, addedK, "yours", moveAddK);
    compareMoveOrders( [...threeCategories, {name:"K"}] , result );
    console.log('^^^^^^^^^^^^^ merge with added K from them, base is just categories, conflict preferring yours');

    result = getResolvedMoveOrder (talimDoc, threeCategories, threeCategories, addedK, "yours", moveAddK);
    compareMoveOrders( [...threeCategories, {name:"K"}] , result );
    console.log('^^^^^^^^^^^^^ merge with added K from them, yours is just categories, conflict preferring yours');

    result = getResolvedMoveOrder (talimDoc, undefined, undefined, undefined, null, {...moveAddK, ...moveAddKB, ...moveAddKKK});
    compareMoveOrders( [...baseOrder, ...justKSeriesNoIndent] , result );
    console.log('^^^^^^^^^^^^^ merge with K series stealth added by them, no conflict');

    result = getResolvedMoveOrder (talimDoc, undefined, undefined, addedKSeries, "theirs", {...moveAddKB, ...moveAddK, ...moveAddKKK});
    compareMoveOrders( addedKSeries , result );
    console.log('^^^^^^^^^^^^^ merge with K series explicitly added by them in middle, conflict preferring theirs');

    result = getResolvedMoveOrder (talimDoc, undefined, [...threeCategories, ...baseOrder], categoriesAndKs, "yours", {...moveAddKB, ...moveAddK, ...moveAddKKK});
    compareMoveOrders( [...categoriesAndKs, ...baseOrder] , result );
    console.log('^^^^^^^^^^^^^ merge with K series explicitly added with 3 categories, your 3 categories at front, conflict preferring yours');

    result = getResolvedMoveOrder (talimDoc, undefined, [...threeCategories, ...baseOrder], categoriesAndKs, "theirs", {...moveAddKB, ...moveAddK, ...moveAddKKK});
    compareMoveOrders( [{"name":"Category 1","isCategory":true},{"name":"K"},{"name":"Category 2","isCategory":true},{"name":"KB","indent":1},{"name":"Category 3","isCategory":true},{"name":"AA"},{"name":"BB","indent":1},{"name":"KKK","indent":2}] , result );
    console.log('^^^^^^^^^^^^^ merge with K series explicitly added with 3 categories, you add 3 categories at front, conflict preferring theirs');

    result = getResolvedMoveOrder (talimDoc, [...threeCategories, ...baseOrder], [...threeCategories, ...baseOrder].reverse(), categoriesAndKs, "theirs", {...moveAddKB, ...moveAddK, ...moveAddKKK});
    compareMoveOrders(  [{"name":"Category 1","isCategory":true},{"name":"K"},{"name":"Category 2","isCategory":true},{"name":"KB","indent":1},{"name":"BB","indent":1},{"name":"AA"},{"name":"Category 3","isCategory":true},{"name":"KKK","indent":2}], result );
    console.log('^^^^^^^^^^^^^ merge with K series explicitly added with 3 categories, base has 3 categories at front and you reverse it, conflict preferring theirs');

    result = getResolvedMoveOrder (talimDoc, [...threeCategories, ...baseOrder], [...threeCategories, ...baseOrder].reverse(), categoriesAndKs, "yours", {...moveAddKB, ...moveAddK, ...moveAddKKK});
    compareMoveOrders(  [...reversedOrder, {"name":"Category 3","isCategory":true},{"name":"KKK","indent":2},{"name":"Category 2","isCategory":true},{"name":"KB","indent":1},{"name":"Category 1","isCategory":true},{"name":"K"}], result );
    console.log('^^^^^^^^^^^^^ merge with K series explicitly added with 3 categories, base has 3 categories at front and you reverse it, conflict preferring yours');
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

  const baseOrder: MoveOrder[] = [{name:"windy moves","isCategory":true},{name:"AA"},{name:"dishonest moves","isCategory":true},{name:"BB","indent":1}];
  const reversedOrder: MoveOrder[] = [...baseOrder].reverse();
  const addedK: MoveOrder[] = [...baseOrder]; addedK.splice(2,0,{name: "K"});
  const addedKEnd: MoveOrder[] = [...baseOrder]; addedKEnd.push({name: "K"});
  const justKSeries: MoveOrder[] = [{name: "K"},{name: "KB", indent:1},{name: "KKK", indent:2}];
  const justKSeriesNoIndent: MoveOrder[] = [{name: "K"},{name: "KB"},{name: "KKK"}];
  const addedKSeries: MoveOrder[] = [...baseOrder]; addedKSeries.splice(2,0,...justKSeries);
  const threeCategories: MoveOrder[] = [{name:"Category 1","isCategory":true},{name:"Category 2","isCategory":true}, {name:"Category 3","isCategory":true}];
  const categoriesAndKs: MoveOrder[] = [threeCategories[0], justKSeries[0],threeCategories[1], justKSeries[1],threeCategories[2], justKSeries[2]];
  const noBB: MoveOrder[] = baseOrder.slice(0,-1);
  const noBBReverse: MoveOrder[] = [...noBB].reverse();
  const indentedBB: MoveOrder[] = [...noBB, {name:"BB","indent":69}];
  const moveAddK: MoveChangeList = {K: { moveName: {type: "add", new: "K"} }};
  const moveAddKB: MoveChangeList = {KB: { moveName: {type: "add", new: "KB"} }};
  const moveAddKKK: MoveChangeList = {KKK: { moveName: {type: "add", new: "KKK"} }};
  const moveDelBB: MoveChangeList = {BB: { moveName: {type: "delete", old: "BB"} }};
  const talimChanges: Readonly<ChangeDoc> = {
    id: "1-banana",
    previousChange: "0-bonono?",
    updateDescription: "test",
    createdAt: new Date(),
    createdBy: "testyman",
    baseRevision: "",
    universalPropChanges: {
      moveOrder: {type: "modify", 
        new: reversedOrder,
        old: indentedBB}
    },
    moveChanges: {
      AA: { 
        damage: {type: "modify", new: 70, old: 69},
        height: {type: "delete", old: "H"},
      },
      //K: { moveName: {type: "add", new: "K"} }
      //BB: { moveName: {type: "delete", old: "BB"} },
    },
    conflictList: {
      universalProps: {
        moveOrder: {
          theirs: baseOrder,
          yours: reversedOrder,
          baseValue: baseOrder,
          //resolution: "no-op"
          resolution: {type: "modify", 
            new: reversedOrder,
            old: baseOrder}
        }
      }
    }
  }

  function getResolvedMoveOrder (baseDoc: CharDoc, base: MoveOrder[] | undefined, yours: MoveOrder[] | undefined, theirs: MoveOrder[] | undefined, 
                                resolution: null | "yours" | "theirs" | "no-op", extraMoveChanges?: MoveChangeList): MoveOrder[] {
    //uses indentedBB as old moveOrder for each changeDoc, conflicts explicitly specified by resolution
    //in merge, any moves they add/delete get resolved into your move changes
    //Can provide theirs and a null resolution to specify a merge where you change but they don't, leading to no conflicts
    //For a merge where they add+change and you don't change, and your/base order is preferred, yours=undefined and resolution=yours
    if(!base) {
      base = baseDoc.universalProps.moveOrder;
    }
    else {
      // put base order in base document (use shallow copies so original isn't changed)
      baseDoc = {...baseDoc};
      baseDoc.universalProps = {...baseDoc.universalProps, moveOrder: base};
    }
    let changeDoc: ChangeDoc = cloneDeep(talimChanges);

    //Your old doesn't matter, it was only for determining if conflict happened
    if(!yours) {
      delete changeDoc.universalPropChanges;
    }
    else {
      changeDoc!.universalPropChanges!.moveOrder = {type: "modify", new: yours, old: indentedBB}
    }

    if(extraMoveChanges) {
      changeDoc.moveChanges = {...changeDoc.moveChanges, ...extraMoveChanges};
    }
    if(!resolution) {
      delete changeDoc.conflictList;
    }
    else {
      yours = yours || base;
      theirs = theirs || base;
      changeDoc!.conflictList!.universalProps!.moveOrder.yours = yours;
      changeDoc!.conflictList!.universalProps!.moveOrder.theirs = theirs;
      if(resolution === "no-op") {
        changeDoc!.conflictList!.universalProps!.moveOrder!.resolution = "no-op";
      }
      else {
        changeDoc!.conflictList!.universalProps!.moveOrder!.resolution = {type: "modify", new: (resolution === "yours") ? yours! : theirs!, old: base};
      }
    }
    let result: MoveOrder[] = resolveMoveOrder(baseDoc, changeDoc, !!theirs);
    return result;
    //console.log(JSON.stringify(result));
  }
  function compareMoveOrders(expected: MoveOrder[], actual: MoveOrder[]) {
    if(isEqual(expected, actual)) {
      console.log("Returned expected: "+JSON.stringify(expected));
    }
    else {
      console.error("Test failed. Expected: "+JSON.stringify(expected)+", actual: "+JSON.stringify(actual));
    }
  }

  useIonViewDidEnter(() => {
    console.log('ion view did enter event fired');
    moveOrderTest();
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
        <IonButton onClick={() => pushButton()}>Delete test</IonButton>
      </IonContent>
    </IonPage>
  );
};

export default Test;
