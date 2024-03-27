import { IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar, IonInput, IonItem, useIonViewDidEnter, IonButton } from '@ionic/react';
import React, { useState } from 'react';
import { useParams } from 'react-router';
import './Page.css';
import PouchDB from 'pouchdb';
import * as myPouch from '../services/pouch';
import * as E from '../constants/exampleData';
import { reduceChanges, resolveMoveOrder, rebaseChangeDoc, mergeChangeDocs, getMergeConflicts, getRebaseConflicts, applyResolutions, autoResolveConflicts } from '../services/merging';
import { getDB, pullDB, pushDB, remote } from '../services/pouch';
//import { ColumnChange, Modify, Changes, Conflict, ConflictMoveOrder, ConflictMoveOrderMergeBothChange, ConflictMoveOrderMergeTheyChange, ConflictMoveOrderRebaseBothChange, MoveChanges, MoveChangeList, ChangeDoc, ColumnData, MoveOrder, CharDoc } from '../types/characterTypes';
import type * as T from '../types/characterTypes'; //==
import * as util from '../services/util';
import { cloneDeep, isEqual } from 'lodash';

//Could extend the router props if wanted to. Pass in db as prop from parent?
type TestProps = {
  propNum: number,
  propStr: string
}

const Test: React.FC<TestProps> = ({propNum, propStr}) => {

  const { name } = useParams<{ name: string; }>(); //router has its own props
  const [text, setText] = useState<string>('default'); //guess this is for my text entry thing
  //let db : PouchDB.Database = getDB('local-test');
  let db : PouchDB.Database = getDB('sc6');
  let remote : PouchDB.Database = getDB(myPouch.remote+'_users');

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

  //TODO: this functionality will be moved to the API. Then it should use replication-guy as the user.
  async function replicatorUpdate(newDbName: string) {
    const name = myPouch.remote+'_replicator/_design/replicate_from_template/_update/create';
    console.log("======$$$$$$$$$$$$$ BEGIN REPLICATOR UPDATE TEST");
    let fetchPromise = myPouch.makeRequest(name, 'admin', 'password', "POST", {id: 'sc6', username: 'admin', password: 'password'});
    fetchPromise.then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.text(); //my update function returns text, but it could return JSON
    })
    .then((data) => {
      console.log("Returned data = " + JSON.stringify(data));
    }).catch((err) => {
      console.log("YA BEEFED IT KID" + err);
    });
  }

  async function testUpdateFun() {
    const name = myPouch.remote+'test/_design/testdesign/_update/updateFun';
    //const name = myPouch.remote+'test/_design/testdesign/_update/testExternal'; //yeah can't use libs from other design docs
    console.log("======$$$$$$$$$$$$$ BEGIN UPDATE FUNC TEST");
    let fetchPromise = myPouch.makeRequest(name, 'admin', 'password', "POST", {id: 'sc6', username: 'admin', password: 'password'});
    fetchPromise.then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.text(); //my update function returns text, but it could return JSON
    })
    .then((data) => {
      console.log("Returned data = " + JSON.stringify(data));
    }).catch((err) => {
      console.log("YA BEEFED IT KID" + err);
    });
  }

  //Example function creating sec obj for given database
  async function setupDbSecurity(newDbName: string) {
    const name = myPouch.remote+`${newDbName}/_security`;
    console.log("======$$$$$$$$$$$$$ BEGIN SECURITY SETUP TEST");
    let fetchPromise = myPouch.makeRequest(name, 'admin', 'password', "PUT", {"members":{"roles":["read"],"names":[]},"admins":{"roles":["_admin"]}});
    fetchPromise.then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("Returned data = " + JSON.stringify(data));
    }).catch((err) => {
      console.log("YA BEEFED IT KID" + err);
    });
  }

  async function apiTest() {
    let fetchPromise = myPouch.makeRequest("http://localhost:3000/api/v1/test", 'admin', 'password', "GET");
    fetchPromise.then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.text();
    })
    .then((data) => {
      console.log("Returned data = " + JSON.stringify(data));
    }).catch((err) => {
      console.log("YA BEEFED IT KID" + err);
    });
  }

  async function noPublicPasswordChange() {
    remote.logIn("public", "password").then((resp) => {
      console.log("Logged in as public/password, changing password");
      remote.changePassword("public", "newPasword").then((resp2) => {
        console.log("Changed password");
      }).catch((err) => {
        console.log("error changing password: " + JSON.stringify(err));
      });
    }).catch((err) => {
      console.log("error logging in: " + JSON.stringify(err));
    });
  }

  async function superLoginTest() {
    let sl = myPouch.superlogin;
    let session = await sl.login({username:'joesmith2', password:'bigsecret'});
    console.log("Logged in as joe, " + JSON.stringify(session));
    //let db = new PouchDB(myPouch.remoteWithBasicCreds+'samsho', {
    let db = new PouchDB(myPouch.remote+'samsho', {
        fetch: function (url, opts) {
          if(!opts?.headers) {
            throw new Error('No opts.headers, opts' + JSON.stringify(opts)); 
          }
          const head: Headers = opts.headers as Headers;
          //head.set('Authorization', `Bearer ${session.token}:${session.password}`);
          head.set('Authorization', `Basic ${btoa(unescape(encodeURIComponent(session.token + ':' + session.password)))}`);
          return PouchDB.fetch(url, opts);
        }
    });
    const charDoc = db.get('character/kyoshiro');
    console.log("Character doc = " + JSON.stringify(charDoc));
    //myPouch.makeRequest(myPouch.remote+'sc6/character%2Ftalim', session.token, session.password, "GET");
    
    //let axios = sl.getHttp(); //this POS isn't even adding the auth header
    //try {
      //let resp = await axios.get(myPouch.remote+'sc6/character/talim');
      //console.log('u getted ' + JSON.stringify(resp));
    //} catch (error) {
      //console.log(`u suck ${JSON.stringify(error)}`);
    //}
  }

  //function validatorTest() {
    ////Validator.default()
    //let doc: T.CharDoc = E.CharDocs.baseDoc;
    //delete doc.displayName;
    //let result = Validator({banana: 1});
    //if(result) console.log("Validateded! Validator = " + JSON.stringify(Validator));
    //else console.log("Validation failed: " + JSON.stringify(Validator));
  //}


  useIonViewDidEnter(() => {
    console.log('ion view did enter event fired');
    moveOrderTest();
    //mergeTest();
    //rebaseTest();
    resolutionTest();
    //pullDB("test");
    //replicatorUpdate('muhDeeBee');
    //setupDbSecurity('testo');
    //apiTest();
    //getDocById("_design/testdesign", (doc) => {
      //setText(doc.title);
    //});
  });

  async function pushButton() {
    setText("Pushed da button!");
    //noPublicPasswordChange();
    //superLoginTest();
    //validatorTest();
    testUpdateFun();
    //await deleteTest();
    //console.log("Baleet finito");
    //getFirstDoc((doc) => {
      //console.log(doc['title'] + ", new title: " + text);
      ////doc.title = text; //no worky?
      ////db.put(doc);
      //db.put({_id: doc._id, _rev: doc._rev, title: text});
      //pushDB(db);
      //console.log('got da thingy :DD');
    //});
  }

  async function pushButton2() {
    let user = await remote.getSession();
    console.log("Session = " + JSON.stringify(user));
  }

  //async function deleteTest() {
    //await deleteDBWhichOutdatesDBReferences("test");
    //deletion invalidates the old db reference, must make new one
    //db = getDB('local-test');
    //console.log("Baleet ACTUALLY finito");
  //}

  async function loginTest() {
    //logging into one DB object that initially used basic auth will cause all DB objects for the same remote DB to use session auth
    const pouch1: PouchDB.Database = myPouch.getDB(myPouch.remote+"sc6");
    let result = await pouch1.logIn("public","password");
    const pouch2: PouchDB.Database = myPouch.getDB(myPouch.remote+"sc6");
    let result2 = await pouch2.getSession();
    console.log(`pouch1 login: ${JSON.stringify(result)}`);
    console.log(`pouch2 login: ${JSON.stringify(result2)}`);
  }

  async function mapSerializationTest() {
    let changeAdd = {
      type: "add", 
      new: "green" as T.ColumnData,
      old: null 
    } as T.ColumnChange;
    let changeModify = {
      type: "modify", 
      new:  70 as T.ColumnData,
      old: 69 as T.ColumnData,
    } as T.ColumnChange;
    let changes: T.Changes = {} as T.Changes;
    changes.boogers = changeAdd;
    changes.damage = changeModify;
    let putDoc: PouchDB.Core.PutDocument<Object> = changes; 
    putDoc._id = "changesTest";
    putDoc._rev = (await db.get<T.Changes>("changesTest"))?._rev ?? undefined;
    await db.put(putDoc);
    let readDoc = await db.get<T.Changes>('changesTest');
    // As long as Changes isn't the top-level document, _id and _rev won't fuck up the object entries
    let deSerialized: T.Changes = readDoc;
    console.log("Stored and read dem changes, " + JSON.stringify(deSerialized));
  }


  function moveOrderTest() {
    let result: T.MoveOrder[] = [];
    result = getResolvedMoveOrder (undefined, undefined, undefined, null);
    compareResults( E.Order.baseOrder , result );
    console.log('^^^^^^^^^^^^^ base goes through, no conflict'); //no way to represent base adding/deleting while you change nothing

    result = getResolvedMoveOrder (undefined, E.Order.reversedOrder, undefined, null);
    compareResults( E.Order.reversedOrder, result );
    console.log('^^^^^^^^^^^^^ Reverse order, no conflict');

    result = getResolvedMoveOrder (undefined, undefined, undefined, null, E.MoveListChanges.addK );
    compareResults( E.Order.addedKEnd, result );
    console.log('^^^^^^^^^^^^^ stealth add(default end), no order changes or conflict');

    result = getResolvedMoveOrder (undefined, E.Order.addedK, undefined, null, E.MoveListChanges.addK );
    compareResults( E.Order.addedK, result );
    console.log('^^^^^^^^^^^^^ you manual insert in middle uncontested, no conflict');

    result = getResolvedMoveOrder (E.Order.reversedOrder, E.Order.addedK, undefined, "yours", E.MoveListChanges.addK );
    compareResults( E.Order.addedK, result );
    console.log('^^^^^^^^^^^^^ you add, base reverses, conflict preferring yours');

    result = getResolvedMoveOrder (E.Order.reversedOrder, E.Order.addedK, undefined, "theirs", E.MoveListChanges.addK );
    compareResults( [{"name":"BB","indent":1},{"name":"dishonest moves","isCategory":true},{"name":"AA"},{"name":"K"},{"name":"windy moves","isCategory":true}] , result );
    console.log('^^^^^^^^^^^^^ you add, base reverses, conflict preferring base');

    result = getResolvedMoveOrder (undefined, E.Order.noBBReverse, undefined, "yours");
    compareResults( [{"name":"dishonest moves","isCategory":true},{"name":"BB","indent":1},{"name":"AA"},{"name":"windy moves","isCategory":true}] , result );
    console.log('^^^^^^^^^^^^^ base adds BB, you reverse, conflict preferring yours');

    result = getResolvedMoveOrder (undefined, E.Order.noBBReverse, undefined, "theirs");
    compareResults( E.Order.baseOrder, result );
    console.log('^^^^^^^^^^^^^ base adds BB, you reverse, conflict preferring base');

    result = getResolvedMoveOrder (undefined, E.Order.noBB, undefined, null, E.MoveListChanges.delBB);
    compareResults( E.Order.noBB, result );
    console.log('^^^^^^^^^^^^^ you delete BB, no conflict');

    result = getResolvedMoveOrder (E.Order.reversedOrder, E.Order.noBB, undefined, "yours", E.MoveListChanges.delBB);
    compareResults( E.Order.noBB, result );
    console.log('^^^^^^^^^^^^^ you delete BB, base reverses, conflict preferring yours');

    result = getResolvedMoveOrder (E.Order.reversedOrder, E.Order.noBB, undefined, "theirs", E.MoveListChanges.delBB);
    compareResults( E.Order.noBBReverse, result );
    console.log('^^^^^^^^^^^^^ you delete BB, base reverses, conflict preferring base');

    result = getResolvedMoveOrder (E.Order.noBB, undefined, undefined, null);
    compareResults( E.Order.noBB , result );
    console.log('^^^^^^^^^^^^^ base without BB, no conflict'); //no way to represent base adding/deleting while you change nothing

    result = getResolvedMoveOrder (E.Order.noBB, E.Order.reversedOrder, undefined, "yours");
    compareResults( E.Order.noBBReverse , result );
    console.log('^^^^^^^^^^^^^ base deletes BB, you reverse, conflict preferring yours');

    result = getResolvedMoveOrder (E.Order.noBB, E.Order.reversedOrder, undefined, "theirs");
    compareResults( E.Order.noBB , result );
    console.log('^^^^^^^^^^^^^ base deletes BB, you reverse, conflict preferring base');

    // Merging (a merge where they make no changes can be treated as no-conflict rebase)
    result = getResolvedMoveOrder (undefined, undefined, undefined, null, E.MoveListChanges.addK );
    compareResults( E.Order.addedKEnd , result );
    console.log('^^^^^^^^^^^^^ merge where stealth addition is theirs (as it must be), put at end, no conflict');

    //result = getResolvedMoveOrder (undefined, E.Order.reversedOrder, E.Order.baseOrder, null, E.MoveListChanges.addK );
    //compareResults( [...E.Order.reversedOrder, {name: "K"}] , result );
    //console.log("^^^^^^^^^^^^^ merge with stealth addition to end, you reverse, no conflict (can't happen if theirs was rebased, that does a pass through order resolution favoring theirs)");
    result = getResolvedMoveOrder (undefined, E.Order.reversedOrder, E.Order.addedKEnd, "yours", E.MoveListChanges.addK );
    compareResults( [{"name":"BB","indent":1},{"name":"K"},{"name":"dishonest moves","isCategory":true},{"name":"AA"},{"name":"windy moves","isCategory":true}] , result );
    console.log("^^^^^^^^^^^^^ merge with their 'stealth' addition to end rebased to explicit change, you reverse, conflict preferring yours");

    result = getResolvedMoveOrder (undefined, E.Order.reversedOrder, E.Order.addedKEnd, "theirs", E.MoveListChanges.addK );
    compareResults( E.Order.addedKEnd , result );
    console.log("^^^^^^^^^^^^^ merge with their 'stealth' addition to end rebased to explicit change, you reverse, conflict preferring theirs");

    result = getResolvedMoveOrder (undefined, E.Order.addedK, E.Order.baseOrder, null, E.MoveListChanges.addK );
    compareResults( E.Order.addedK , result );
    console.log('^^^^^^^^^^^^^ merge with added K from you, no conflict');

    result = getResolvedMoveOrder (undefined, E.Order.addedK, E.Order.reversedOrder, "yours", E.MoveListChanges.addK );
    compareResults( E.Order.addedK , result );
    console.log('^^^^^^^^^^^^^ merge with added K from you, they reverse, conflict preferring yours');

    result = getResolvedMoveOrder (undefined, E.Order.addedK, E.Order.reversedOrder, "theirs", E.MoveListChanges.addK );
    compareResults( [{"name":"BB","indent":1},{"name":"dishonest moves","isCategory":true},{"name":"AA"},{"name":"K"},{"name":"windy moves","isCategory":true}], result );
    console.log('^^^^^^^^^^^^^ merge with added K from you, they reverse, conflict preferring theirs');

    result = getResolvedMoveOrder (undefined, undefined, E.Order.addedK, "theirs", E.MoveListChanges.addK );
    compareResults( E.Order.addedK , result );
    console.log('^^^^^^^^^^^^^ merge with added K from them, conflict preferring theirs');

    result = getResolvedMoveOrder (undefined, E.Order.reversedOrder, E.Order.addedK, "theirs", E.MoveListChanges.addK );
    compareResults( E.Order.addedK , result );
    console.log('^^^^^^^^^^^^^ merge with added K from them, you reverse, conflict preferring theirs');

    result = getResolvedMoveOrder (undefined, E.Order.reversedOrder, E.Order.addedK, "yours" );
    compareResults( E.Order.reversedOrder , result );
    console.log('^^^^^^^^^^^^^ merge with added K from them which you reject, you reverse, conflict preferring yours');

    result = getResolvedMoveOrder (undefined, E.Order.reversedOrder, E.Order.addedK, "theirs" );
    compareResults( E.Order.baseOrder, result );
    console.log('^^^^^^^^^^^^^ merge with added K from them which you reject, you reverse, conflict preferring theirs');

    result = getResolvedMoveOrder (undefined, undefined, E.Order.noBBReverse, "theirs", E.MoveListChanges.delBB);
    compareResults( E.Order.noBBReverse , result );
    console.log('^^^^^^^^^^^^^ merge with deleted BB and reversal from them, conflict preferring theirs');

    result = getResolvedMoveOrder (undefined, undefined, E.Order.noBBReverse, "yours", E.MoveListChanges.delBB);
    compareResults( E.Order.noBB , result );
    console.log('^^^^^^^^^^^^^ merge with deleted BB and reversal from them, conflict preferring yours');

    result = getResolvedMoveOrder (undefined, E.Order.noBB, E.Order.baseOrder, null, E.MoveListChanges.delBB);
    compareResults( E.Order.noBB , result );
    console.log('^^^^^^^^^^^^^ merge with deleted BB from you, no conflict');

    result = getResolvedMoveOrder (undefined, E.Order.noBB, E.Order.reversedOrder, "theirs", E.MoveListChanges.delBB);
    compareResults( E.Order.noBBReverse , result );
    console.log('^^^^^^^^^^^^^ merge with deleted BB from you, reversal from them, conflict preferring theirs');

    result = getResolvedMoveOrder (undefined, E.Order.noBB, E.Order.reversedOrder, "yours", E.MoveListChanges.delBB);
    compareResults( E.Order.noBB , result );
    console.log('^^^^^^^^^^^^^ merge with deleted BB from you, reversal from them, conflict preferring yours');

    result = getResolvedMoveOrder (undefined, E.Order.noBBReverse, E.Order.addedK, "yours", {...E.MoveListChanges.delBB, ...E.MoveListChanges.addK });
    compareResults( [{"name":"dishonest moves","isCategory":true},{"name":"AA"},{"name":"K"},{"name":"windy moves","isCategory":true}] , result );
    console.log('^^^^^^^^^^^^^ merge with reversed deleted BB from you, added K from them, conflict preferring yours');

    result = getResolvedMoveOrder (undefined, E.Order.noBBReverse, E.Order.addedK, "theirs", {...E.MoveListChanges.delBB, ...E.MoveListChanges.addK });
    compareResults( E.Order.addedK.slice(0,-1) , result );
    console.log('^^^^^^^^^^^^^ merge with reversed deleted BB from you, added K from them, conflict preferring theirs');

    result = getResolvedMoveOrder (E.Order.threeCategories, undefined, E.Order.addedK, "theirs", E.MoveListChanges.addK );
    compareResults( [{"name":"windy moves","isCategory":true},{"name":"K"},{"name":"dishonest moves","isCategory":true}] , result );
    console.log('^^^^^^^^^^^^^ merge with added K from them, base is just categories, conflict preferring theirs');

    result = getResolvedMoveOrder (E.Order.threeCategories, undefined, E.Order.addedK, "yours", E.MoveListChanges.addK );
    compareResults( [...E.Order.threeCategories, {name:"K"}] , result );
    console.log('^^^^^^^^^^^^^ merge with added K from them, base is just categories, conflict preferring yours');

    result = getResolvedMoveOrder (E.Order.threeCategories, E.Order.threeCategories, E.Order.addedK, "yours", E.MoveListChanges.addK );
    compareResults( [...E.Order.threeCategories, {name:"K"}] , result );
    console.log('^^^^^^^^^^^^^ merge with added K from them, yours is just categories, conflict preferring yours');

    result = getResolvedMoveOrder (undefined, undefined, undefined, null, {...E.MoveListChanges.addK , ...E.MoveListChanges.addKB , ...E.MoveListChanges.addKKK});
    compareResults( [...E.Order.baseOrder, ...E.Order.justKSeriesNoIndent] , result );
    console.log('^^^^^^^^^^^^^ merge with K series stealth added by them, no conflict');

    result = getResolvedMoveOrder (undefined, undefined, E.Order.addedKSeries, "theirs", {...E.MoveListChanges.addKB , ...E.MoveListChanges.addK , ...E.MoveListChanges.addKKK});
    compareResults( E.Order.addedKSeries , result );
    console.log('^^^^^^^^^^^^^ merge with K series explicitly added by them in middle, conflict preferring theirs');

    result = getResolvedMoveOrder (undefined, [...E.Order.threeCategories, ...E.Order.baseOrder], E.Order.categoriesAndKs, "yours", {...E.MoveListChanges.addKB , ...E.MoveListChanges.addK , ...E.MoveListChanges.addKKK});
    compareResults( [...E.Order.categoriesAndKs, ...E.Order.baseOrder] , result );
    console.log('^^^^^^^^^^^^^ merge with K series explicitly added with 3 categories, your 3 categories at front, conflict preferring yours');

    result = getResolvedMoveOrder (undefined, [...E.Order.threeCategories, ...E.Order.baseOrder], E.Order.categoriesAndKs, "theirs", {...E.MoveListChanges.addKB , ...E.MoveListChanges.addK , ...E.MoveListChanges.addKKK});
    compareResults( [{"name":"Category 1","isCategory":true},{"name":"K"},{"name":"Category 2","isCategory":true},{"name":"KB","indent":1},{"name":"Category 3","isCategory":true},{"name":"AA"},{"name":"BB","indent":1},{"name":"KKK","indent":2}] , result );
    console.log('^^^^^^^^^^^^^ merge with K series explicitly added with 3 categories, you add 3 categories at front, conflict preferring theirs');

    result = getResolvedMoveOrder ([...E.Order.threeCategories, ...E.Order.baseOrder], [...E.Order.threeCategories, ...E.Order.baseOrder].reverse(), E.Order.categoriesAndKs, "theirs", {...E.MoveListChanges.addKB , ...E.MoveListChanges.addK , ...E.MoveListChanges.addKKK});
    compareResults(  [{"name":"Category 1","isCategory":true},{"name":"K"},{"name":"Category 2","isCategory":true},{"name":"KB","indent":1},{"name":"BB","indent":1},{"name":"AA"},{"name":"Category 3","isCategory":true},{"name":"KKK","indent":2}], result );
    console.log('^^^^^^^^^^^^^ merge with K series explicitly added with 3 categories, base has 3 categories at front and you reverse it, conflict preferring theirs');

    result = getResolvedMoveOrder ([...E.Order.threeCategories, ...E.Order.baseOrder], [...E.Order.threeCategories, ...E.Order.baseOrder].reverse(), E.Order.categoriesAndKs, "yours", {...E.MoveListChanges.addKB , ...E.MoveListChanges.addK , ...E.MoveListChanges.addKKK});
    compareResults(  [...E.Order.reversedOrder, {"name":"Category 3","isCategory":true},{"name":"KKK","indent":2},{"name":"Category 2","isCategory":true},{"name":"KB","indent":1},{"name":"Category 1","isCategory":true},{"name":"K"}], result );
    console.log('^^^^^^^^^^^^^ merge with K series explicitly added with 3 categories, base has 3 categories at front and you reverse it, conflict preferring yours');
  }

  function getResolvedMoveOrder (base: T.MoveOrder[] | undefined, yours: T.MoveOrder[] | undefined, theirs: T.MoveOrder[] | undefined, 
                                resolution: null | "yours" | "theirs", extraMoveChanges?: T.MoveChangeList): T.MoveOrder[] {
    //uses indentedBB as old moveOrder for each changeDoc, conflicts explicitly specified by resolution
    //in merge, any moves they add/delete get resolved into your move changes
    //Can provide theirs and a null resolution to specify a merge where you change but they don't, leading to no conflicts
    //For a merge where they have uncontested changes and you prefer to reject them, yours=undefined and resolution=yours
    if(!base) {
      base = E.Order.baseOrder;
    }
    let changeDoc: T.ChangeDoc = cloneDeep(E.ChangeDocs.talimChanges);
    let conflict: T.ConflictMoveOrder | undefined; //undefined if no resolution provided

    //Your old doesn't matter, it was only for determining if conflict happened
    if(!yours) {
      delete changeDoc.universalPropChanges;
    }
    else {
      changeDoc!.universalPropChanges!.moveOrder = {type: "modify", new: yours, old: E.Order.indentedBB}
    }

    if(extraMoveChanges) {
      changeDoc.moveChanges = {...changeDoc.moveChanges, ...extraMoveChanges};
    }
    if(!resolution) {
      delete changeDoc.conflictList;
    }
    else {
      let yourChange: T.Modify<T.MoveOrder[]> | "no-op" = (yours) ? changeDoc!.universalPropChanges!.moveOrder! : "no-op"; //noop when merging their uncontested changes
      let theirChange: T.Modify<T.MoveOrder[]> | "no-op" = "no-op"; //theirs is no-op in rebase
      if(theirs) { //merge
        theirChange = {type: "modify", new: theirs, old: E.Order.indentedBB} as T.Modify<T.MoveOrder[]>;
        conflict = {yours: yourChange, theirs: theirChange, resolution: resolution};
      }
      else { //rebase
        if(yourChange === "no-op") throw new Error("Your change can't be no-op in moveOrder rebase");
        conflict = {yours: yourChange, theirs: theirChange, resolution: resolution};
      }
    }
    let result: T.MoveOrder[] = resolveMoveOrder(base, changeDoc, !!theirs, conflict);
    return result;
    //console.log(JSON.stringify(result));
  }


  function mergeTest() {
    doMergeTest("both changed", {damage: E.Con.c1_2v3 }, E.MoveChanges.damage13, E.MoveChanges.damage12);

    doMergeTest("both changed, redundant", null, E.MoveChanges.damage13, E.MoveChanges.damage13);

    doMergeTest("only they changed, autoresolve", {damage: E.Con.c1_3_AR }, E.MoveChanges.damage13);

    doMergeTest("both changed damage and height", E.MoveCons.m_dmgHeight , 
                {...E.MoveChanges.damage13, ...E.MoveChanges.heightHL}, 
                {...E.MoveChanges.damage12, ...E.MoveChanges.heightHM});

    doMergeTest("only they add BB w/ damage, autoresolve", E.MoveCons.m_addBBDamage , {...E.MoveChanges.moveAddBB, ...E.MoveChanges.damage13});

    doMergeTest("only they delete BB w/ damage, autoresolve", E.MoveCons.m_delBBDamage , {...E.MoveChanges.moveDelBB, ...E.MoveChanges.damageDel1});

    doMergeTest("they delete BB, you change damage", E.MoveCons.m_delBBDamageCon , {...E.MoveChanges.moveDelBB, ...E.MoveChanges.damageDel1}, E.MoveChanges.damage12);

    doMergeTest("they delete BB, you add damage", E.MoveCons.m_delBBDamageAdd , E.MoveChanges.moveDelBB, E.MoveChanges.damageAdd3);

    doMergeTest("you delete BB, they change damage and add height", E.MoveCons.m_youDelTheyChangeDamageAddHeight , 
                {...E.MoveChanges.damage13, ...E.MoveChanges.heightAddL}, 
                {...E.MoveChanges.moveDelBB, ...E.MoveChanges.damageDel1});

    doMergeTest("you delete BB, they change damage and ignore height, conflicts for all columns", E.MoveCons.m_youDelTheyChangeDamage , 
                {...E.MoveChanges.damage13}, 
                {...E.MoveChanges.moveDelBB, ...E.MoveChanges.damageDel1, ...E.MoveChanges.heightDelH});

    doMergeTest("both deleted, redundant", null, {...E.MoveChanges.moveDelBB, ...E.MoveChanges.damageDel1}, {...E.MoveChanges.moveDelBB, ...E.MoveChanges.damageDel1});

    doMergeTest("both added same, redundant", null, {...E.MoveChanges.moveAddBB, ...E.MoveChanges.damageAdd3}, {...E.MoveChanges.moveAddBB, ...E.MoveChanges.damageAdd3});

    //Can't do test for only you changing, never makes conflicts
  }
  function doMergeTest(testName: string, expected: T.Conflicts | null, theirs: T.MoveChanges, yours?: T.MoveChanges) {
    let conflicts: T.Conflicts | null = getMergeConflicts(theirs, yours);
    //if(util.keys(conflicts).length===0) conflicts = null;
    compareResults(expected, conflicts && {...conflicts});
    console.log("^^^^^^^^^^ " + testName); 
  }


  function rebaseTest() {
    doRebaseTest("you change, base doesn't, no conflict", null, {...E.MoveChanges.damage12, ...E.MoveChanges.heightHM}, E.Vals.dmgHeight);

    doRebaseTest("redundant change to damage and height", E.MoveCons.r_dmgHeight_redundant, {...E.MoveChanges.damage12, ...E.MoveChanges.heightHM}, E.Vals.dmgHeight2);

    doRebaseTest("both modified damage and height", E.MoveCons.r_dmgHeight, {...E.MoveChanges.damage12, ...E.MoveChanges.heightHM}, E.Vals.dmgHeight3);

    doRebaseTest("modify damage, base deletes", {damage: E.MoveCons.rebCon(E.ColChange.add2)}, E.MoveChanges.damage12, E.Vals.height);

    doRebaseTest("you modify damage on move base lacks, stealth add", E.MoveCons.r_dmg_stealth_add, {...E.MoveChanges.damage12});

    doRebaseTest("you add height on move base lacks, stealth add", E.MoveCons.r_height_stealth_add, {...E.MoveChanges.heightAddM});

    doRebaseTest("you modify damage, add height on move base lacks, stealth add", E.MoveCons.r_dmgHeight_stealth_add, {...E.MoveChanges.damage12, ...E.MoveChanges.heightAddM});

    doRebaseTest("you delete damage, add height on move base lacks, stealth add", E.MoveCons.r_delDmg_modHeight_stealth_add, {...E.MoveChanges.damageDel1, ...E.MoveChanges.heightHM});

    doRebaseTest("redundant move add", E.MoveCons.r_moveName_redundant, E.MoveChanges.moveAddBB, E.Vals.dmgHeight2);

    doRebaseTest("redundant move add, height add rebased to modify", {...E.MoveCons.r_moveName_redundant, height: {yours: E.ColChange.modHM, theirs: "no-op"}}, 
                 {...E.MoveChanges.moveAddBB, ...E.MoveChanges.heightAddM}, E.Vals.dmgHeight);

    doRebaseTest("redundant move delete", E.MoveCons.r_moveName_redundant, E.MoveChanges.moveDelBB);

    doRebaseTest("redundant move+height delete", {moveName: E.Con.cAutoNoop, height: E.Con.cAutoNoop}, 
                 {...E.MoveChanges.moveDelBB, ...E.MoveChanges.heightDelH});

    doRebaseTest("uncontested move+damage add", null, {...E.MoveChanges.moveAddBB, ...E.MoveChanges.damageAdd2});

    doRebaseTest("uncontested move+damage+height delete", null, {...E.MoveChanges.moveDelBB, ...E.MoveChanges.heightDelH, ...E.MoveChanges.damageDel1}, E.Vals.dmgHeight);

    doRebaseTest("you del move+height but not dmg, conflict to delete", {...E.MoveCons.r_delBB, damage: {yours: E.ColChange.del1, theirs: "no-op"}, height: {yours: E.ColChange.delH, theirs:"no-op"}}, {...E.MoveChanges.moveDelBB, ...E.MoveChanges.heightDelH}, E.Vals.dmgHeight);

    doRebaseTest("you del move+damage+height, base altered both", {...E.MoveCons.r_delBB, damage: {yours: E.ColChange.del2, theirs: "no-op"}, height: {yours: E.ColChange.delM, theirs: "no-op"}}, 
                 {...E.MoveChanges.moveDelBB, ...E.MoveChanges.heightDelH, ...E.MoveChanges.damageDel1}, E.Vals.dmgHeight2);
  }
  function doRebaseTest(testName: string, expected: T.Conflicts | null, yours: T.MoveChanges, baseVals?: T.Cols) {
    let conflicts: T.Conflicts | null = getRebaseConflicts("BB", yours, baseVals);
    //if(util.keys(conflicts).length===0) conflicts = null;
    compareResults(expected, conflicts && {...conflicts});
    console.log("^^^^^^^^^^ " + testName); 
  }

  function resolutionTest() {
    doResolutionTest("Rebase, you have contested AA and BB changes, resolve yours", E.ChangeDocs.modAA_dmgBB32, "yours",
                     E.ChangeDocs.modAA32_dmgBB12, undefined, E.CharDocs.baseDoc);
    doResolutionTest("Rebase, you have uncontested AA and BB changes, no conflicts", E.ChangeDocs.modAA_dmgBB32, "no-resolve",
                     E.ChangeDocs.modAA_dmgBB32, undefined, E.CharDocs.baseDoc);

    //Rebase updates metadata and prevChange
    doResolutionTest("Rebase, you have uncontested AA changes, you stealth add BB by changing damage, don't resolve", E.ChangeDocs.modAA_stealthBB_conflicts, "no-resolve",
                     E.ChangeDocs.modAA_dmgBB, undefined, E.CharDocs.noBB);
    doResolutionTest("Rebase, you have uncontested AA changes, you stealth add BB by changing damage, resolve yours", E.ChangeDocs.modAA_stealthBB_yours, "yours",
                     E.ChangeDocs.modAA_dmgBB, undefined, E.CharDocs.noBB);
    doResolutionTest("Rebase, you have uncontested AA changes, you stealth add BB by changing damage, resolve theirs (aka reject all)", E.ChangeDocs.modAA_stealthBB_theirs, "theirs",
                     E.ChangeDocs.modAA_dmgBB, undefined, E.CharDocs.noBB);

    //rebase mergedoc to no changes
    doResolutionTest("Merge, theirs rebases to nothing by deleting BB+changing AA to base, you change AA+BB, resolve theirs (which is yours since they have no changes)", 
                     E.ChangeDocs.modAA_dmgBB , "theirs", E.ChangeDocs.modAA_dmgBB , E.ChangeDocs.old_modAAtoBase_delBB , E.CharDocs.noBB);

    //rebase mergedoc
    doResolutionTest("Merge, theirs rebases to stealth adding BB and reverses order and changes AA to 3, you mod AA add BB, prefer theirs", E.ChangeDocs.modAA3_dmgBB_reverse_theirs, "theirs", 
                     E.ChangeDocs.modAA_addBB, E.ChangeDocs.old_modAA3_dmgBB_reverse, E.CharDocs.noBB);
    doResolutionTest("Merge, theirs rebases to stealth adding BB and reverses order and changes AA to 3, you mod AA add BB, prefer yours", E.ChangeDocs.modAA3_dmgBB_reverse_yours, "yours", 
                     E.ChangeDocs.modAA_addBB, E.ChangeDocs.old_modAA3_dmgBB_reverse, E.CharDocs.noBB);

    //apply resolutions to noop all. Isn't that just selecting theirs in rebase?

    //resolve prop changes

    //explicit moveOrder change gets nooped out by resolution choices
    doResolutionTest("Merge, they del BB add K, you make no changes and reject theirs", 
                     E.ChangeDocs.unchanged , "yours", E.ChangeDocs.unchanged , E.ChangeDocs.delBBaddK, undefined);
    doResolutionTest("Merge, they del BB add K, you make no changes and accept theirs", 
                     E.ChangeDocs.delBBaddK, "theirs", E.ChangeDocs.unchanged , E.ChangeDocs.delBBaddK, undefined);
    //Resolve some theirs, some yours
    doResolutionTest("Merge, they del BB add K, you reverse order and accept your order but their movechanges", 
                     E.ChangeDocs.delBBaddKReverse, {"universalProps": "yours", "BB": "theirs", "K": "theirs"}, E.ChangeDocs.reverseOrder, E.ChangeDocs.delBBaddK, undefined);
    //unresolved moveOrder conflict
    doResolutionTest("Merge, they del BB add K, you reverse order and accept their movechanges, no order resolution", 
                     E.ChangeDocs.delBBaddKReverseUnresolvedOrder, {"BB": "theirs", "K": "theirs"}, E.ChangeDocs.reverseOrder, E.ChangeDocs.delBBaddK, undefined);
  }
  type ResOptions = "yours" | "theirs" | "no-resolve";
  function doResolutionTest(testName: string, expected: T.ChangeDoc, resolution: ResOptions | {[moveName: string]: ResOptions}, yours: T.ChangeDoc | undefined, theirs: T.ChangeDoc | undefined, base?: T.CharDocWithMeta) {
    //Do merge if theirs is provided. If theirs has a lower rev than provided baseDoc, it'll be rebased
    //Uses baseDoc if yours not provided
    yours = cloneDeep<T.ChangeDoc>(yours ?? E.ChangeDocs.talimChanges);
    if(!base) base = cloneDeep<T.CharDocWithMeta>(E.CharDocs.baseDoc);
    if(!theirs) {
      //if(yours.baseRevision >= base._rev) {
        //base._rev = "999"; //quick workaround for "this rebase is unnecessary" check
      //}
      rebaseChangeDoc(base, yours, true);
    }
    else {
      mergeChangeDocs(theirs, yours, base);
    }
    if(resolution !== "no-resolve" && yours.conflictList) {
      if(typeof resolution === 'object') {
        for(const [move, conflicts] of util.keyVals(yours.conflictList)) {
          if(!conflicts || !resolution[move]) continue;
          for(const [col, conflict] of util.keyVals(conflicts)) {
            const res = resolution[move];
            if(!conflict ||  res === "no-resolve") continue;
            conflict.resolution = res;
          }
        }
      }
      else {
        autoResolveConflicts(yours, resolution);
      }
    }
    applyResolutions(yours, !!theirs);
    delete yours.rebaseSource;
    delete yours.mergeSource;
    compareResults(expected, yours, true);
    console.log("^^^^^^^^^^ " + testName); 
  }

  function compareResults<X>(expected: X, actual: X, printWrongProps: boolean = false) {
    if(isEqual(expected, actual)) {
      console.log("Returned expected: "+JSON.stringify(expected));
    }
    else {
      console.error("Test failed. \nExpected: "+JSON.stringify(expected)+"\n  actual: "+JSON.stringify(actual));
      if(printWrongProps) console.error(util.recursiveCompare('', expected, actual));
    }
  }
  //function printDifferencesRecursive(propName: string, expected: unknown, actual: unknown) {
    //if(typeof expected === 'object' && expected && typeof actual === 'object' && actual) {
      //let keyUnion: Set<string> = new Set(util.keys(expected).concat(util.keys(actual)));
      //for(const key of keyUnion) {
        //let expectedVal = expected[key as keyof typeof expected];
        //let actualVal = actual[key as keyof typeof actual]
        //printDifferencesRecursive(propName+'.'+key, expectedVal, actualVal);
      //}
    //}
    //else {
      //if(expected !== actual) {
        //console.error(`Error in ${propName}: Expected: ${JSON.stringify(expected)} Actual: ${JSON.stringify(actual)}`)
      //}
    //}
  //}

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
          <IonInput value={text} onIonChange={e => setText(e.detail.value!)}></IonInput>
        </IonItem> 
        <IonButton onClick={() => pushButton()}>Do test</IonButton>
        <IonButton onClick={() => pushButton2()}>Do other test</IonButton>
      </IonContent>
    </IonPage>
  );
};

export default Test;
