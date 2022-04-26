import { useIonModal, useIonAlert, IonPopover, IonIcon, IonFab, IonFabButton, IonLabel, IonList, IonButton, IonSegment, IonSegmentButton, IonFooter, IonToolbar, IonContent, IonItem, IonGrid, IonRow } from '@ionic/react';
import React, { useRef, useState, useEffect, useCallback, MouseEvent }from 'react';
import { SegmentChangeEventDetail, SegmentCustomEvent } from '@ionic/core';
import { add, trashBin } from 'ionicons/icons';
import { useParams, useHistory, useLocation } from 'react-router';
import { Action } from 'history';
import { Link } from 'react-router-dom';
import { useDoc, usePouch } from 'use-pouchdb';
import {Move, MoveOrProps, ColumnDef, ColumnData, ColumnChange, CharDoc, ChangeList, MoveChanges, MoveConflicts } from '../types/characterTypes';
import { getChangesByMoveName, getConflictsByMoveName } from '../services/util';
import MoveOrUniversalProps from './MoveOrUniversalProps';
import { SegmentUrl } from './Character';
import { cloneDeep } from 'lodash';

type CharDocWithMeta = PouchDB.Core.Document<CharDoc> & PouchDB.Core.IdMeta & PouchDB.Core.GetMeta;
type ChangeListDocWithMeta = PouchDB.Core.Document<ChangeList> & PouchDB.Core.IdMeta & PouchDB.Core.GetMeta;

type EditCharProps = {
  gameId: string,
  charDoc: CharDocWithMeta, //TODO: any special handling if <Character> passes null?
  columnDefs: ColumnDef[],
  universalPropDefs: ColumnDef[],
}

const testChangeList: ChangeList = {
  updateDescription: "test",
  createdAt: new Date(),
  createdBy: "testyman",
  baseRevision: "",
  moveChanges: {
    "AA": { 
      "damage": {type: "modify", new: {columnName: "damage", data: 70}, old: {columnName: "damage", data: 69}},
      "cupsize": {type: "add", new: {columnName: "cupsize", data: "AAA"}},
      "height": {type: "delete", old: {columnName: "height", data: "H"}},
      //modified: [ { 
        //new: {columnName: "damage", data: 70},
        //old: {columnName: "damage", data: 69}
      //}],
      //added: [{columnName: "cup suze", data: "AAA"}],
      //deleted: [{columnName: "height", data: "H"}],
    }
  }
}

export const EditCharacter: React.FC<EditCharProps> = ({gameId, charDoc, columnDefs, universalPropDefs}) => {
  const { character } = useParams<{ character: string; }>(); //router has its own props
  const baseUrl = "/game/"+gameId+"/character/"+character;
  //const [segmentValue, setSegmentValue] = useState<string>(baseUrl);
  //const location: string = useLocation().pathname;
  const docEditId = baseUrl + SegmentUrl.Edit;
  //const { doc: editDoc, loading: editLoading, state: editState, error: editError } = useDoc<CharDoc>(docEditId, {db: "local"}); 
  const { doc: storedChanges, loading, state, error } = useDoc<ChangeList>(docEditId, {db: "localPersonal"}); //not created until there's changes to store
  const [ changeList, setChangeList ] = useState<ChangeList>(testChangeList); //setter called once when clone of storedChanges made
  const [ loadedChangeList, setLoadedChangeList ] = useState<boolean>(false); //loads changelist from storedChanges when available
  const [ conflicts, setConflicts ] = useState<MoveConflicts[]>([]); //empty list means no conflicts presently. TODO: check upon load
  //references to change+conflicts lists don't change generally. Keep in mind if something in this component needs to re-render. 
  //keep individual moveChanges and moveConflicts pure, though.
  //TODO: just use existing local db with no revisions or conflict? Need some changes to Local Provider then...
  const localPersonalDatabase: PouchDB.Database = usePouch('localPersonal'); 
  const [presentDeleteAlert, dismissDeleteAlert] = useIonAlert();
  const popOver = useRef<HTMLIonPopoverElement>(null); //there's also a usePopover hook
  const history = useHistory();

  function emptyChangeList(): ChangeList {
    return {
      updateDescription: "",
      createdAt: new Date(),
      createdBy: "",
      baseRevision: charDoc._rev,
      moveChanges: {},
    } as ChangeList;
  }

   //TODO: receive MoveChanges, add to changeList (parse out deleted or new moves), write to local
   //Validate (ensure moveName isn't empty, is unique)
   //resets are just when newData === oldData? No, resets should be when moveChanges is empty.
   //Order followups after their parent
  function editMove(moveChanges: MoveChanges) { 
    console.log("Edited move:" + JSON.stringify(moveChanges));
  }
   //TODO: every MoveOrProps is rerendering 10 times because it says editMove has changed... callback stops that, but then rerenders are caused by parent
  const editMoveCallback = useCallback<(moveChanges: MoveChanges)=>void>((moveChanges) => {
    //editMove(moveChanges);
    console.log("Edited move in callback:" + JSON.stringify(moveChanges));
  }, []);

  async function writeChangeList(docExists: boolean = true) {
    //TODO: only do if local enabled. Also hide segments if not.
    if(!charDoc) {
      throw new Error(`Base document for ${character} not yet loaded.`);
    }
    //TODO: This is NOT a copy, same in-memory JSON obj. changeList now has a runtime _id field (though typescript won't let you use it)
    const putDoc: PouchDB.Core.PutDocument<ChangeList> = changeList; 
    putDoc._id = docEditId; 
    if(docExists) {
      const currentDoc = await localPersonalDatabase.get<ChangeList>(docEditId);
      putDoc._rev = currentDoc._rev;
    }
    else {
      putDoc._rev = undefined;
    }
    if(storedChanges) { //TODO: wait what was the point of this considering the above checks
      putDoc._rev = storedChanges._rev;
    }
    return await localPersonalDatabase.put(putDoc).then(() => {
      console.log("Successful write to edit doc");
    }).catch((err) => {
      if(err.name === "conflict") { //if one write starts while another's in progress, 409 immediate conflict.
        console.log(`conflict writing edit, retrying: ` + JSON.stringify(err));
        writeChangeList();
      }
      else {
        throw(err);
      }
    });
  }
  /*
  async function writeEditDoc(docExists: boolean = true) {
    //TODO: only do if local enabled. Also hide segments if not.
    if(!charDoc) {
      throw new Error(`Base document for ${character} not yet loaded.`);
    }
    //TODO: This is NOT a copy, same in-memory JSON obj. Seemingly gets reset next render cycle, but be careful.
    const putDoc: PouchDB.Core.PutDocument<CharDoc> = charDoc; 
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
  */
 
  async function deleteLocal(e: any) {
    if(!storedChanges) return;
    console.log("BALEET local :D");
    try {
      console.log("Deleted local edit");
      await dismissDeleteAlert();
      if(popOver.current) {
        await popOver.current.dismiss(); //popover must be destroyed before navigating away or react freaks out
      }
      history.push(baseUrl); //Go back to base page or local-edit will be re-created
      await localPersonalDatabase.remove(docEditId, storedChanges._rev);
    } catch(err) {
      console.error("Error deleting local edits: " + err);
    }
  }

  let editFAB = (
    <>
    <IonFab id="editFAB" vertical="top" horizontal="end" slot="fixed">
      <IonFabButton><IonIcon icon={add} /></IonFabButton>
    </IonFab>
    <IonPopover ref={popOver} trigger="editFAB">
      <IonContent>
        <IonList>
          <IonItem button={true} detail={false} onClick={()=>presentDeleteAlert(
            {
              header: "Confirm deletion",
              message: "You have unuploaded changes, are you sure you want to delete your local edits of this character's frame data?",
              buttons: [
                { text: 'Cancel', role: 'cancel' },
                { text: 'Delete', handler: deleteLocal }
              ]
              , onDidDismiss: (e) => { console.log("Dismissed deletion alert"); 
                if(popOver.current) {
                  popOver.current.dismiss();
                }
              },
            }
          )}>
            <IonLabel>Delete</IonLabel>
          </IonItem>
          <IonItem button={true} detail={false}>
            <IonLabel>Upload</IonLabel>
          </IonItem>
        </IonList>
      </IonContent> 
    </IonPopover>
    </>
  )


  // create stored changelist if it's missing and there's changes to store
  if (state === 'error') {
    if(error?.message === "missing" && changeList.moveChanges.length > 0) { //TODO: with objects, could check if equal to the empty changelist
      console.log(`Local editing doc ${docEditId} not found despite changes being made, creating JK NOT CREATING USING TEST CHANGELIST.`);
      //writeChangeList(false).then(() => {
        //console.log("Called writeEditDoc");
      //}).catch((err) => {
        //console.error(err);
        //return(<span>Error loading local edit doc: {error?.message}</span>);
      //});
    }
    else {
      console.error("heckin errorino editing Character: " + error?.message);
      return(<span>Error loading local edit doc: {error?.message}</span>);
    }
  }
  else if(storedChanges && !loadedChangeList) {
    console.log("Loading stored changes");
    setChangeList(cloneDeep<ChangeList>(storedChanges));
    setLoadedChangeList(true);
  }

  if (loading && storedChanges == null) {
    return (<h1> loadin</h1>);
  }
  //TODO: as it is, there's no way to add the data if it's somehow missing!
  if(!(charDoc?.charName && charDoc?.universalProps && charDoc?.moves)) {
    return (<h1> Incomplete document</h1>);
  }

  return (
    <>
      {editFAB}
      <IonGrid>
        <IonRow>
          <IonItem>
            <p>{charDoc.charName} is the character (DB)</p><br />
            <p>{JSON.stringify(charDoc)}</p>
          </IonItem>
        </IonRow>
        <MoveOrUniversalProps key="universalProps" moveOrProps={charDoc.universalProps} columnDefs={universalPropDefs} 
          editMove={editMove} moveChanges={getChangesByMoveName("universalProps", changeList.moveChanges)} moveConflicts={getConflictsByMoveName("universalProps", conflicts)} />
        {charDoc.moves.map((move: Move) => ( 
          <MoveOrUniversalProps key={move.moveName} moveOrProps={move} columnDefs={columnDefs} 
          editMove={editMoveCallback} moveChanges={getChangesByMoveName(move.moveName, changeList.moveChanges)} moveConflicts={getConflictsByMoveName(move.moveName, conflicts)} />
        ))}
      </IonGrid>
    </>
  );
};

export default EditCharacter;
//{
  //editDoc.universalProps.map((prop: ColumnData) => {
  //const keys = Object.keys(prop);
  //return (
    //<div key={prop.columnName}>{prop.columnName}: {prop.data}</div>
  //)
//})}
