import { useIonModal, useIonAlert, IonPopover, IonIcon, IonFab, IonFabButton, IonLabel, IonList, IonButton, IonSegment, IonSegmentButton, IonFooter, IonToolbar, IonContent, IonItem, IonGrid, IonRow } from '@ionic/react';
import React, { useRef, useState, useEffect, useCallback, MouseEvent }from 'react';
import { SegmentChangeEventDetail, SegmentCustomEvent } from '@ionic/core';
import { add, trashBin } from 'ionicons/icons';
import { useParams, useHistory, useLocation } from 'react-router';
import { Action } from 'history';
import { Link } from 'react-router-dom';
import { useDoc, usePouch } from 'use-pouchdb';
import {MoveOrder, MoveCols, ColumnDef, ColumnDefs, ColumnData, ColumnChange, CharDoc, ChangeDoc, MoveChanges, Changes, NewMoveChanges, PropChanges, Modify, MoveConflicts } from '../types/characterTypes';
import type { FieldError } from '../types/utilTypes'; //==
import { moveNameColumnDef } from '../types/internalColumns';
import { getConflictsByMoveName, getChangeListMoveOrder, keys, deleteMoveChange, addMoveChange } from '../services/util';
import { reduceChanges } from '../services/merging';
import MoveOrUniversalProps from './MoveOrUniversalProps';
import NewMoveButton from './NewMoveButton';
import CategoryAndChildRenderer  from './CategoryAndChildRenderer';
import MoveOrdererModal from './MoveOrdererModal';
import { SegmentUrl } from './Character';
import { cloneDeep } from 'lodash';

type CharDocWithMeta = PouchDB.Core.Document<CharDoc> & PouchDB.Core.IdMeta & PouchDB.Core.GetMeta;
type ChangeListDocWithMeta = PouchDB.Core.Document<ChangeDoc> & PouchDB.Core.IdMeta & PouchDB.Core.GetMeta;

type EditCharProps = {
  gameId: string,
  charDoc: CharDocWithMeta, //TODO: any special handling if <Character> passes null?
  columnDefs: ColumnDefs,
  universalPropDefs: ColumnDefs,
}

const testChangeList: ChangeDoc = {
  id: "1-banana",
  previousChange: "0-bonono?",
  updateDescription: "test",
  createdAt: new Date(),
  createdBy: "testyman",
  baseRevision: "",
  moveChanges: {
    "AA": { 
      "damage": {type: "modify", new: 70, old: 69},
      //"cupsize": {type: "add", new: "AAA"},
      "height": {type: "delete", old: "H"},
    }
  }
}

export const EditCharacter: React.FC<EditCharProps> = ({gameId, charDoc, columnDefs, universalPropDefs}) => {
  const { character } = useParams<{ character: string; }>(); //router has its own props
  const baseUrl = "/game/"+gameId+"/character/"+character;
  const history = useHistory();
  const docEditId = baseUrl + SegmentUrl.Edit;
  const { doc: storedChanges, loading, state, error } = useDoc<ChangeDoc>(docEditId, {db: "localPersonal"}); //not created until there's changes to store
  const emptyChangeList = useRef<ChangeDoc>({ updateDescription: "",
    createdAt: new Date(),
    createdBy: "",
    baseRevision: charDoc._rev,
    //universalPropChanges: {}, both optional
    //moveChanges: {},
  } as ChangeDoc);
  const [ changeList, setChangeList ] = useState<ChangeDoc>(testChangeList); //setter called once when clone of storedChanges made
  const [ loadedChangeList, setLoadedChangeList ] = useState<boolean>(false); //loads changelist from storedChanges when available
  const [ conflicts, setConflicts ] = useState<MoveConflicts[]>([]); //empty list means no conflicts presently. TODO: check upon load
  //move order drawn first from the changelist if it's updated, then from the base document
  const moveOrder: MoveOrder[] =  getChangeListMoveOrder(changeList) || charDoc.universalProps.moveOrder || []; 
  //references to change+conflicts lists don't change generally. Keep in mind if something in this component needs to re-render. 
  //keep individual moveChanges and moveConflicts pure, though.
  //TODO: just use existing local db with no revisions or conflict? Need some changes to Local Provider then... and can't sync in future... use conflicty one?
  const localPersonalDatabase: PouchDB.Database = usePouch('localPersonal'); 
  const [presentAlert, dismissAlert] = useIonAlert(); //used for deletion confirmation, new move conflicts, other
  const popOver = useRef<HTMLIonPopoverElement>(null); //there's also a usePopover hook
  const [presentMoveOrder, dismissMoveOrder] = useIonModal(MoveOrdererModal, {
      moveOrder: moveOrder,
      changeMoveOrder: changeMoveOrder,
      onDismiss: triggerMoveOrderDismissal
  });

  function isEmptyChangeList(): boolean {
    return changeList === emptyChangeList.current;
  }

   //TODO: receive MoveChanges, add to changeList, write to local
   //Validate (ensure moveName isn't empty, is unique)
   //resets are when moveChanges is null, don't want empty object
   //TODO: every MoveOrProps is rerendering 10 times because it says editMove has changed... callback stops that, but then rerenders are caused by parent
  const editMoveCallback = useCallback<(moveName: string, moveChanges: Changes | null, isDeletion?: boolean)=>void> ((moveName, moveChanges, isDeletion=false) => {
    // Check if we need to change moveOrder due to deletion or addition of move
    // Consolidation of addition->deletion is handled in Modal.
    //TODO: does new move interface also specify move position? Or add to bottom and manually move it after? Both options must change moveOrder anyway...
    if(isDeletion) {

    }
    if(moveChanges === null) {
      if(moveName === "universalProps" && changeList.universalPropChanges) {
        delete changeList.universalPropChanges;
      }
      else deleteMoveChange(changeList, moveName);
    }
    else {
      if(moveName === "universalProps") {
        changeList.universalPropChanges = moveChanges;
      }
      else {
        addMoveChange(changeList, moveName, moveChanges);
      }
    }

    //if changeList is now empty, set it to emptyChangeList
    //TODO:  Test alla this change deletion shit.
    if(!changeList.universalPropChanges && ! changeList.moveChanges) {
      setChangeList(emptyChangeList.current);
    }
    else {
      setChangeList({...changeList}); // let react know to re-render
    }
    console.log(`Edited ${moveName} in callback:` + JSON.stringify(moveChanges));
  }, [changeList]);


  //const addMoveCallback = useCallback<(moveName: string, moveChanges: MoveChanges)=> void> ((moveName, moveChanges) => {
  const addMoveCallback = useCallback<(moveChanges: NewMoveChanges)=> void> ((moveChanges) => {
    const moveName = moveChanges.moveName.new;
    delete moveChanges.moveName;
    //consolidate deletion->addition into modification, check for existing changes and merge them. Addition->deletion handled in Modal... or maybe not?
    const oldChanges: MoveChanges | null = changeList?.moveChanges?.[moveName] || null;
    const newOrMergedChanges: Changes | null = oldChanges ? reduceChanges(oldChanges, moveChanges) : moveChanges;

    if(!newOrMergedChanges) {
      //if re-adding deleted move, no change. Still prompt to re-add to moveOrder though.
      console.warn("No changes to move.");
      deleteMoveChange(changeList, moveName);
    }
    // Prompt for new move position+indentation
    console.log(`Adding new move ${moveName} with changes ${JSON.stringify(newOrMergedChanges)}`);

    // add to the bottom of moveOrder with a change to universalProps
    let newMoveOrder = cloneDeep<MoveOrder[]>(moveOrder);
    newMoveOrder.push({name: moveName});
    let moveOrderChange: Modify<MoveOrder[]> = {type: "modify", new: newMoveOrder, old: changeList.universalPropChanges?.moveOrder?.old ?? moveOrder};
    let newUniversalPropChange: PropChanges = {...changeList.universalPropChanges, moveOrder: moveOrderChange};
    //TODO: if this addition is actually a no-op, probably want to delete here...
    addMoveChange(changeList, moveName, newOrMergedChanges ?? moveChanges);
    changeList.universalPropChanges = newUniversalPropChange;
    setChangeList({...changeList});
    presentAlert(
      {
        header: "Reorder move",
        message: "Would you like to reorder this move?",
        buttons: [
          { text: 'No', role: 'cancel' },
          { text: 'Yes', handler: presentMoveOrder }
        ], 
        onDidDismiss: (e) => { 
          if(popOver.current) {
            popOver.current.dismiss();
          }
        },
      }
    );

  }, [changeList, moveOrder, presentAlert, presentMoveOrder]);


  // Return column definitions with an added initial definition for movename, which includes currently existing moves as forbidden values
  function getAddMoveColumnDefs(): ColumnDefs {
    let moveNameDef = {...moveNameColumnDef};
    if(!moveNameDef.forbiddenValues) return columnDefs;
    let forbidden = [...moveNameDef.forbiddenValues];
    for(const item of moveOrder) {
      if(!item.isCategory) {
        forbidden.push(item.name);
      }
    }
    moveNameDef.forbiddenValues = forbidden;
    return {moveName: moveNameDef, ...columnDefs};
  }

  function changeMoveOrder(newMoveOrder: MoveOrder[]) {
    console.log("MoveOrder changed: "+JSON.stringify(moveOrder));
    //let newMoveOrder = cloneDeep<MoveOrder[]>(moveOrder); already gets cloned
    //newMoveOrder.push({name: moveName}); already added don't need
    let moveOrderChange: Modify<MoveOrder[]> = {type: "modify", new: newMoveOrder, old: moveOrder};
    let newUniversalPropChange: PropChanges = {...changeList.universalPropChanges, moveOrder: moveOrderChange};
    changeList.universalPropChanges = newUniversalPropChange;
    setChangeList({...changeList});
  }
  function triggerMoveOrderDismissal() {
    dismissMoveOrder();
    dismissAlert();
  }


  async function writeChangeList(docExists: boolean = true) {
    //TODO: only do if local enabled. Also hide segments if not.
    if(!charDoc) {
      throw new Error(`Base document for ${character} not yet loaded.`);
    }
    //TODO: This is NOT a copy, same in-memory JSON obj. changeList now has a runtime _id field (though typescript won't let you use it)
    const putDoc: PouchDB.Core.PutDocument<ChangeDoc> = changeList; 
    putDoc._id = docEditId; 
    if(docExists) {
      const currentDoc = await localPersonalDatabase.get<ChangeDoc>(docEditId);
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
 
  async function deleteLocal(e: any) {
    if(!storedChanges) return;
    console.log("BALEET local :D");
    try {
      console.log("Deleted local edit");
      await dismissAlert();
      if(popOver.current) {
        await popOver.current.dismiss(); //popover must be destroyed before navigating away or react freaks out
      }
      history.push(baseUrl); //Go back to base page or local-edit will be re-created
      await localPersonalDatabase.remove(docEditId, storedChanges._rev);
      setChangeList(emptyChangeList.current);
      setLoadedChangeList(false);
    } catch(err) {
      console.error("Error deleting local edits: " + err);
    }
  }

  function dismissPopOver() { popOver.current && popOver.current.dismiss() }
  let editFAB = (
    <>
    <IonFab id="editFAB" vertical="top" horizontal="end" slot="fixed">
      <IonFabButton><IonIcon icon={add} /></IonFabButton>
    </IonFab>
    <IonPopover ref={popOver} trigger="editFAB" >
      <IonContent>
        <IonList>
          <IonItem button={true} detail={false} onClick={()=>presentAlert(
            {
              header: "Confirm deletion",
              message: "You have unuploaded changes, are you sure you want to delete your local edits of this character's frame data?",
              buttons: [
                { text: 'Cancel', role: 'cancel' },
                { text: 'Delete', handler: deleteLocal }
              ], 
              onDidDismiss: (e) => { 
                if(popOver.current) {
                  popOver.current.dismiss();
                }
              },
            }
          )}>
            <IonLabel>Delete</IonLabel>
          </IonItem>
          <NewMoveButton getColumnDefs={getAddMoveColumnDefs} addMove={addMoveCallback} dismissPopOver={dismissPopOver} />
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
    if(error?.message === "missing") {
      if(!isEmptyChangeList()) { 
        console.log(`Local editing doc ${docEditId} not found despite changes being made, creating JK NOT CREATING USING TEST CHANGELIST.`);
        //writeChangeList(false).then(() => {
          //console.log("Called writeEditDoc");
        //}).catch((err) => {
          //console.error(err);
          //return(<span>Error loading local edit doc: {error?.message}</span>);
        //});
      }
      else { 
        console.log("No changes");
      }
    }
    else {
      console.error("heckin errorino editing Character: " + error?.message);
      return(<span>Error loading local edit doc: {error?.message}</span>);
    }
  }
  else if(storedChanges && !loadedChangeList) {
    console.log("Loading stored changes");
    setChangeList(cloneDeep<ChangeDoc>(storedChanges));
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
        <MoveOrUniversalProps moveName="universalProps" columns={charDoc.universalProps} columnDefs={universalPropDefs} 
          editMove={editMoveCallback} changes={changeList.universalPropChanges} moveConflicts={getConflictsByMoveName("universalProps", conflicts)} />
        {moveOrder.map((moveOrCat: MoveOrder) => { 
          const {name, isCategory, indent} = {...moveOrCat};
          let moveCols = charDoc.moves[name];
          let moveChanges = changeList.moveChanges?.[name];
          return (
            <CategoryAndChildRenderer key={name} name={name} isCategory={isCategory} >
            {!(moveCols === undefined && moveChanges === undefined)
              ? <MoveOrUniversalProps moveName={name} indentLevel={indent} columns={moveCols} columnDefs={columnDefs} 
                 editMove={editMoveCallback} changes={changeList.moveChanges?.[name]} moveConflicts={getConflictsByMoveName(name, conflicts)} />
              : <div>No data for move {name}</div>
            }
            </CategoryAndChildRenderer> 
          );
          })}
      </IonGrid>
    </>
  );
};

export default EditCharacter;
