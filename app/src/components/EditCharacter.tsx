import { useIonModal, IonModal, useIonAlert, IonPopover, IonIcon, IonFab, IonFabButton, IonLabel, IonList, IonButton, IonSegment, IonSegmentButton, IonFooter, IonToolbar, IonContent, IonItem, IonGrid, IonRow } from '@ionic/react';
import React, { useRef, useState, useEffect, useCallback, MouseEvent }from 'react';
import { SegmentChangeEventDetail, SegmentCustomEvent } from '@ionic/core';
import { add, trashBin } from 'ionicons/icons';
import { useParams, useHistory, useLocation } from 'react-router';
import { Action } from 'history';
import { Link } from 'react-router-dom';
import { useDoc, usePouch } from 'use-pouchdb';
import {MoveOrder, MoveCols, ColumnDefAndData, ColumnDef, ColumnDefs, ColumnData, Cols, ColumnChange, CharDoc, CharDocWithMeta, ChangeDoc, ChangeDocWithMeta, MoveChanges, Changes, AddMoveChanges , PropChanges, Modify, Conflicts } from '../types/characterTypes';
import type { FieldError } from '../types/utilTypes'; //==
import * as E from '../constants/exampleData';
import { moveNameColumnDef } from '../constants/internalColumns';
import { getDefsAndData, getChangeListMoveOrder, keys, updateMoveOrPropChanges } from '../services/util';
import { reduceChanges, resolveMoveOrder } from '../services/merging';
import MoveOrUniversalProps from './MoveOrUniversalProps';
import NewMoveButton from './NewMoveButton';
import CategoryAndChildRenderer  from './CategoryAndChildRenderer';
import MoveEditModal, { MoveEditModalProps } from './MoveEditModal';
import MoveOrdererModal from './MoveOrdererModal';
import { useCharacterDispatch } from '../services/CharacterReducer';
import { cloneDeep } from 'lodash';


type EditCharProps = {
  gameId: string,
  charDoc: CharDocWithMeta, 
  columnDefs: ColumnDefs,
  universalPropDefs: ColumnDefs,
  changeList?: ChangeDoc,
  moveToEdit?: string,
  promptForMoveOrder?: boolean,
}
//TODO: pass editDoc from provider?

export const EditCharacter: React.FC<EditCharProps> = ({gameId, charDoc, columnDefs, universalPropDefs, changeList, moveToEdit, promptForMoveOrder}) => {
  //const { character } = useParams<{ character: string; }>(); //router has its own props
  //const baseUrl = "/game/"+gameId+"/character/"+character;
  //const history = useHistory();
  //const docEditId = baseUrl + SegmentUrl.Edit;
  //const { doc: storedChanges, loading, state, error } = useDoc<ChangeDoc>(docEditId, {db: "localPersonal"}); //not created until there's changes to store
  ////TODO: storedChanges passed by parent
  //const emptyChangeList = useRef<ChangeDoc>({ updateDescription: "",
    //createdAt: new Date(),
    //createdBy: "",
    //baseRevision: charDoc._rev, //TODO: what do when receive updated base?
  //} as ChangeDoc);
  //const [ changeList, setChangeList ] = useState<ChangeDoc>(E.ChangeDocs.testChangeList); //setter called once when clone of storedChanges made
  //const [ loadedChangeList, setLoadedChangeList ] = useState<boolean>(false); //loads changelist from storedChanges when available
  //const [ conflicts, setConflicts ] = useState<ConflictList>([]); //empty list means no conflicts presently. TODO: check upon load
  //move order drawn first from the changelist if it's updated, then from the base document
  const dispatch = useCharacterDispatch();
  const moveOrder: MoveOrder[] =  (changeList && getChangeListMoveOrder(changeList)) || charDoc.universalProps.moveOrder; 
  //references to change+conflicts lists don't change generally. Keep in mind if something in this component needs to re-render. 
  //keep individual moveChanges and moveConflicts pure, though.
  //TODO: just use existing local db with no revisions or conflict? Need some changes to Local Provider then... and can't sync in future... use conflicty one?
  //const localPersonalDatabase: PouchDB.Database = usePouch('localPersonal'); 
  const [presentAlert, dismissAlert] = useIonAlert(); //used for deletion confirmation, new move conflicts, other
  const popOver = useRef<HTMLIonPopoverElement>(null); //there's also a usePopover hook
  const [presentMoveOrder, dismissMoveOrder] = useIonModal(MoveOrdererModal, {
      moveOrder: moveOrder,
      changeMoveOrder: changeMoveOrder,
      onDismiss: triggerMoveOrderDismissal
  });

  //function isEmptyChangeList(): boolean {
    //return changeList === emptyChangeList.current;
  //}

   //TODO: receive MoveChanges, add to changeList, write to local
   //Validate (ensure moveName isn't empty, is unique)
   //resets are when moveChanges is null, don't want empty object
   //TODO: every MoveOrProps is rerendering 10 times because it says editMove has changed... callback stops that, but then rerenders are caused by parent
  //const editMoveCallback = useCallback<(moveName: string, moveChanges: Changes | null, isDeletion?: boolean)=>void> ((moveName, moveChanges, isDeletion=false) => {
    //// Check if we need to change moveOrder due to deletion or addition of move
    //// Consolidation of addition->deletion is handled in Modal.
    ////TODO: does new move interface also specify move position? Or add to bottom and manually move it after? Both options must change moveOrder anyway...
    //if(isDeletion) {

    //}
    //updateMoveOrPropChanges(changeList, moveName, moveChanges);

    ////if changeList is now empty, set it to emptyChangeList
    ////TODO:  Test alla this change deletion shit.
    //if(!changeList.universalPropChanges && ! changeList.moveChanges) {
      //setChangeList(emptyChangeList.current);
    //}
    //else {
      //setChangeList({...changeList}); // let react know to re-render
    //}
    //console.log(`Edited ${moveName} in callback:` + JSON.stringify(moveChanges));
  //}, [changeList]);


  //const addMoveCallback = useCallback<(moveName: string, moveChanges: MoveChanges)=> void> ((moveName, moveChanges) => {
  const addMoveCallback = useCallback<(moveChanges: AddMoveChanges )=> void> ((moveChanges) => {
    const moveName = moveChanges.moveName.new;
    delete moveChanges.moveName;
    //consolidate deletion->addition into modification, check for existing changes and merge them. Addition->deletion handled in Modal... or maybe not?
    const oldChanges: MoveChanges | null = changeList?.moveChanges?.[moveName] || null;
    const newOrMergedChanges: MoveChanges | null = oldChanges ? (reduceChanges(oldChanges, moveChanges) as MoveChanges) : moveChanges;

    //if(!newOrMergedChanges) {
      ////if re-adding deleted move, no change. Still prompt to re-add to moveOrder though.
      //console.warn("No changes to move.");
      //updateMoveOrPropChanges(changeList, moveName, null);
    //}
    //// Prompt for new move position+indentation
    //console.log(`Adding new move ${moveName} with changes ${JSON.stringify(newOrMergedChanges)}`);

    //// add to the bottom of moveOrder with a change to universalProps
    //let newMoveOrder = cloneDeep<MoveOrder[]>(moveOrder);
    //newMoveOrder.push({name: moveName});
    //let moveOrderChange: Modify<MoveOrder[]> = {type: "modify", new: newMoveOrder, old: changeList.universalPropChanges?.moveOrder?.old ?? moveOrder};
    //let newUniversalPropChange: PropChanges = {...changeList.universalPropChanges, moveOrder: moveOrderChange};

    ////TODO: if this addition is actually a no-op, probably want to delete here...
    //updateMoveOrPropChanges(changeList, moveName, newOrMergedChanges ?? moveChanges)
    //changeList.universalPropChanges = newUniversalPropChange;
    //setChangeList({...changeList});
    //presentAlert(
      //{
        //header: "Reorder move",
        //message: "Would you like to reorder this move?",
        //buttons: [
          //{ text: 'No', role: 'cancel' },
          //{ text: 'Yes', handler: presentMoveOrder }
        //], 
        //onDidDismiss: (e) => { 
          //if(popOver.current) {
            //popOver.current.dismiss();
          //}
        //},
      //}
    //);

  }, [changeList, moveOrder, presentAlert, presentMoveOrder]);


  // Present Alert
  //TODO: reducer actions to accept moveORder change, and to unset promptForMoveOrder either way
  //useEffect(() => {
    //if(promptForMoveOrder) {
      //presentAlert(
        //{
          //header: "Reorder move",
          //message: "Would you like to reorder this move?",
          //buttons: [
            //{ text: 'No', role: 'cancel' },
            //{ text: 'Yes', handler: presentMoveOrder }
          //], 
          ////onDidDismiss: (e) => { 
            ////if(popOver.current) {
              ////popOver.current.dismiss();
            ////}
          ////},
        //}
      //);
    //}
    //else {
      //dismissAlert();
    //}
  //}, [promptForMoveOrder]);

  function changeMoveOrder(newMoveOrder: MoveOrder[]) {
    console.log("MoveOrder changed: "+JSON.stringify(moveOrder));
    //let newMoveOrder = cloneDeep<MoveOrder[]>(moveOrder); already gets cloned
    //newMoveOrder.push({name: moveName}); already added don't need
    //let moveOrderChange: Modify<MoveOrder[]> = {type: "modify", new: newMoveOrder, old: moveOrder};
    //let newUniversalPropChange: PropChanges = {...changeList.universalPropChanges, moveOrder: moveOrderChange};
    //changeList.universalPropChanges = newUniversalPropChange;
    //setChangeList({...changeList});
  }
  function triggerMoveOrderDismissal() {
    dismissMoveOrder();
    dismissAlert();
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
          <IonItem disabled={!changeList} button={true} detail={false} onClick={()=>presentAlert(
            {
              header: "Confirm deletion",
              message: "You have unuploaded changes, are you sure you want to delete your local edits of this character's frame data?",
              buttons: [
                { text: 'Cancel', role: 'cancel' },
                { text: 'Delete', handler: ()=> dispatch({actionType:'deleteEdits'})}
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
          {/*<NewMoveButton getColumnDefs={getAddMoveColumnDefs} addMove={addMoveCallback} dismissPopOver={dismissPopOver} />*/}
          <IonItem button={true} detail={false} onClick={()=> { dismissPopOver(); dispatch({actionType:'openMoveEditModal', moveName:''}) }}>
            <IonLabel>Add Move</IonLabel>
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
  //if (state === 'error') {
    //if(error?.message === "missing") {
      //if(!isEmptyChangeList()) { 
        //console.log(`Local editing doc ${docEditId} not found despite changes being made, creating JK NOT CREATING USING TEST CHANGELIST.`);
        ////writeChangeList(false).then(() => {
          ////console.log("Called writeEditDoc");
        ////}).catch((err) => {
          ////console.error(err);
          ////return(<span>Error loading local edit doc: {error?.message}</span>);
        ////});
      //}
      //else { 
        //console.log("No changes");
      //}
    //}
    //else {
      //console.error("heckin errorino editing Character: " + error?.message);
      //return(<span>Error loading local edit doc: {error?.message}</span>);
    //}
  //}
  //else if(storedChanges && !loadedChangeList) {
    //console.log("Loading stored changes");
    //setChangeList(cloneDeep<ChangeDoc>(storedChanges));
    //setLoadedChangeList(true);
  //}

  //if (loading && storedChanges == null) {
    //return (<h1> loadin</h1>);
  //}
  ////TODO: as it is, there's no way to add the data if it's somehow missing!
  //if(!(charDoc?.charName && charDoc?.universalProps && charDoc?.moves)) {
    //return (<h1> Incomplete document</h1>);
  //}


  //TODO: move this and the modal to EditCharacter
  // Get defs and data for the given move
  // For new move return column definitions with an added initial definition for movename, which includes currently existing moves as forbidden values
  const getModalDefsAndData = useCallback<(moveName: string)=> ColumnDefAndData[]> ((moveName) => {
    let defs: ColumnDefs = (moveName==="universalProps") ? universalPropDefs : columnDefs;
    let cols: Cols | undefined = (moveName==="universalProps") ? charDoc.universalProps : charDoc.moves[moveName];
    let changes: Changes | undefined = (moveName==="universalProps") ? changeList?.universalPropChanges : changeList?.moveChanges?.[moveName];
    if(moveName === "") {
      const moveOrder: MoveOrder[] =  (changeList && getChangeListMoveOrder(changeList)) || charDoc.universalProps.moveOrder; 
      let moveNameDef = {...moveNameColumnDef};
      let forbidden = moveNameDef.forbiddenValues ? [...moveNameDef.forbiddenValues] : [];
      for(const item of moveOrder) {
        if(!item.isCategory) {
          forbidden.push(item.name);
        }
      }
      moveNameDef.forbiddenValues = forbidden;
      defs = {moveName: moveNameDef, ...defs}; //ensure moveName at front 
    }
    return getDefsAndData(defs, cols, changes);
  }, [charDoc, changeList, universalPropDefs, columnDefs]);

  return (
    <>
      {editFAB}
      <IonModal isOpen={moveToEdit !== undefined} >
        <MoveEditModal moveName={moveToEdit!} getDefsAndData={getModalDefsAndData}
          originalChanges={moveToEdit === "universalProps" ? changeList?.universalPropChanges : changeList?.moveChanges?.[moveToEdit!]} 
        />
      </IonModal>
      <IonGrid>
        <IonRow>
          <IonItem>
            <p>{charDoc.charName} is the character (DB)</p><br />
            <p>{JSON.stringify(charDoc)}</p>
          </IonItem>
        </IonRow>
        <MoveOrUniversalProps moveName="universalProps" columns={charDoc.universalProps} columnDefs={universalPropDefs} 
          editMove={true} changes={changeList?.universalPropChanges} moveConflicts={changeList?.conflictList?.universalProps} />
        {moveOrder.map((moveOrCat: MoveOrder) => { 
          const {name, isCategory, indent} = {...moveOrCat};
          let moveCols = charDoc.moves[name];
          let moveChanges = changeList?.moveChanges?.[name];
          return (
            <CategoryAndChildRenderer key={name} name={name} isCategory={isCategory} >
            {!(moveCols === undefined && moveChanges === undefined)
              ? <MoveOrUniversalProps moveName={name} indentLevel={indent} columns={moveCols} columnDefs={columnDefs} 
                 editMove={true} changes={changeList?.moveChanges?.[name]} moveConflicts={changeList?.conflictList?.[name]} />
              : <div>No data for move {name}</div>
            }
            </CategoryAndChildRenderer> 
          );
          {/*TODO: for debugging, good idea to point out moves that have data but are missing from moveOrder*/}
          })}
      </IonGrid>
    </>
  );
};

export default EditCharacter;
