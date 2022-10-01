import { useIonModal, IonModal, useIonAlert, useIonToast, IonPopover, IonIcon, IonFab, IonFabButton, IonLabel, IonList, IonButton, IonContent, IonItem, IonGrid, IonRow } from '@ionic/react';
import React, { useRef, useState, useEffect, useCallback, MouseEvent }from 'react';
import { add, } from 'ionicons/icons';
import { useDoc, usePouch } from 'use-pouchdb';
import {MoveOrder, MoveCols, ColumnDefAndData, ColumnDef, ColumnDefs, ColumnData, Cols, ColumnChange, CharDoc, CharDocWithMeta, ChangeDoc, ChangeDocServer, MoveChanges, Changes, AddMoveChanges , PropChanges, Modify, Conflicts } from '../types/characterTypes';
import type { FieldError } from '../types/utilTypes'; //==
import { moveNameColumnDef } from '../constants/internalColumns';
import { getDefsAndData, getChangeListMoveOrder, keys, updateMoveOrPropChanges } from '../services/util';
import { reduceChanges, resolveMoveOrder } from '../services/merging';
import MoveOrUniversalProps from './MoveOrUniversalProps';
import CategoryAndChildRenderer  from './CategoryAndChildRenderer';
import MoveEditModal from './MoveEditModal';
import MoveOrdererModal from './MoveOrdererModal';
import { State, useCharacterDispatch, useTrackedCharacterState, useCharacterSelector, useMiddleware, selectMoveOrder } from '../services/CharacterReducer';
import { useLoginInfoContext } from './GameProvider';
import { cloneDeep } from 'lodash';


type EditCharProps = {
  gameId: string,
  //charDoc: CharDocWithMeta, 
  columnDefs: ColumnDefs,
  universalPropDefs: ColumnDefs,
  //changeList?: ChangeDoc,
  //moveToEdit?: string,
  //promptForMoveOrder?: boolean,
}
//TODO: pass editDoc from provider?

export const EditCharacter: React.FC<EditCharProps> = ({gameId, columnDefs, universalPropDefs}) => {
  const dispatch = useCharacterDispatch();
  const state = useTrackedCharacterState();
  const loginInfo = useLoginInfoContext();
  const charDoc = state.charDoc;
  const changeList: ChangeDoc | undefined = state.editChanges;
  const moveToEdit: string | undefined = state.moveToEdit;
  const moveOrder: MoveOrder[] = useCharacterSelector<MoveOrder[]>(selectMoveOrder);
  const [presentAlert, dismissAlert] = useIonAlert(); //used for deletion confirmation, new move conflicts, other
  const popOver = useRef<HTMLIonPopoverElement>(null); //there's also a usePopover hook
  const [presentToast, dismissToast] = useIonToast(); 
  const [presentMoveOrder, dismissMoveOrder] = useIonModal(MoveOrdererModal, {
      moveOrder: moveOrder,
      changeMoveOrder: (newOrder: MoveOrder[])=>{dispatch({actionType:'reorderMoves', newMoveOrder: newOrder})},
      onDismiss: () => { dismissMoveOrder(); dismissAlert(); }
  });
  const addMoveCallback = useCallback((state, action, dispatch) => {
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
  }, []);
  useMiddleware("EditCharacter", {addMove: addMoveCallback});

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

  //prompt for changelist metadata
  function promptUploadChangeList() {
    if(!changeList) throw new Error("Cannot upload with no changes");
    presentAlert(
      {
        header: "Upload changes",
        buttons: [
          { text: 'No', role: 'cancel' },
          { text: 'Yes', handler: submit }
        ], 
        inputs: [
          {
            type: 'text',
            name: 'title',
            attributes: {
              maxLength: 25,
              required: true, //nope
              //onChange: (foo, bar) => console.log(JSON.stringify(foo)) //nope
            },
            placeholder: 'title (25 characters, url-friendly)',
            value: changeList.updateTitle,
          },
          {
            type: 'textarea',
            name: 'description',
            placeholder: '(Optional) Description of your changes',
            attributes: { maxLength: 250 },
            value: changeList.updateDescription,
          },
          {
            type: 'text',
            name: 'version',
            placeholder: '(Optional) Game version #',
            attributes: { maxLength: 10 },
            value: changeList.updateVersion,
          }
        ],
      }
    );
    function submit(opts: any) {
      console.log("Current values: "+JSON.stringify(opts));
      //Validate title
      const titleRegex = new RegExp(/^[\w-.~]{1,25}$/); //alphanumeric and _, -, ., ~ length between 3-25
      const titleValid = titleRegex.test(opts.title);
      if(!titleValid) {
        presentToast('Title must be between 3-25 characters, which must be alphanumeric or ~_-. (no spaces)', 5000);
        return false; 
      }
      //Validate description?
      //Validate version
      if(opts.version) {
        const versionRegex = new RegExp(/^[\d.]{1,10}$/); //numbers and periods
        const versionValid = versionRegex.test(opts.version);
        if(!versionValid) {
          presentToast('If provided, version must be between 1-10 characters, numbers and periods only', 5000);
          return false; 
        }
      }
      let uploadChanges: ChangeDocServer = {
        ...changeList!, 
        updateTitle: opts.title, 
        updateDescription: opts.description, 
        updateVersion: opts.version,
        createdAt: new Date().toString(),
        //createdAt: "Thu Sep 29 2022 19:45:25 GMT-0700",
        createdBy: loginInfo.currentCreds.username
      };
      dispatch({actionType:'uploadChangeList', changes: uploadChanges!});
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
          <IonItem button={true} detail={false} onClick={()=> { dismissPopOver(); dispatch({actionType:'openMoveEditModal', moveName:''}) }}>
            <IonLabel>Add Move</IonLabel>
          </IonItem>
          <IonItem button={true} detail={false} disabled={!changeList || !!changeList.conflictList} onClick={()=> { dismissPopOver(); promptUploadChangeList() }}>
            <IonLabel>Upload</IonLabel>
          </IonItem>
        </IonList>
      </IonContent> 
    </IonPopover>
    </>
  )

  // Get defs and data for the given move
  // For new move return column definitions with an added initial definition for movename, which includes currently existing moves as forbidden values
  // If editing a previously added move, will have moveName data but no def. Modal doesn't display.
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
