import { useIonModal, IonModal, useIonAlert, IonPopover, IonIcon, IonFab, IonFabButton, IonLabel, IonList, IonButton, IonContent, IonItem, IonGrid, IonRow } from '@ionic/react';
import React, { useRef, useState, useMemo, useEffect, useCallback, MouseEvent }from 'react';
import { add, warningOutline, checkmarkOutline } from 'ionicons/icons';
import {MoveOrder, MoveCols, ColumnDefAndData, ColumnDef, ColumnDefs, ColumnData, Cols, ColumnChange, CharDoc, CharDocWithMeta, ChangeDoc, ChangeDocServer, MoveChanges, Changes, AddMoveChanges , PropChanges, Modify, Conflicts } from '../types/characterTypes';
import type { FieldError } from '../types/utilTypes'; //==
import { moveNameColumnDef } from '../constants/internalColumns';
import { getChangeListMoveOrder, keys, updateMoveOrPropChanges, getDateString, unresolvedConflictInList } from '../services/util';
import { getDefsAndData } from '../services/renderUtil';
import * as security from '../services/security';
import { useMyToast } from '../services/hooks';
import MoveEditModal from './MoveEditModal';
import MoveOrdererModal from './MoveOrdererModal';
import CharacterRenderer from './CharacterRenderer';
import NeedPermissions from './NeedPermissions';
import { State, EditAction, useCharacterDispatch, useTrackedCharacterState, useCharacterSelector, useMiddleware, selectMoveOrder } from '../services/CharacterReducer';
import { useLoginInfoContext } from './LoginProvider';
import styles from '../theme/Character.module.css';
import { cloneDeep } from 'lodash';
import CompileConstants from '../constants/CompileConstants';


type EditCharProps = {
  gameId: string,
  columnDefs: ColumnDefs,
  universalPropDefs: ColumnDefs,
}

export const EditCharacter: React.FC<EditCharProps> = ({gameId, columnDefs, universalPropDefs}) => {
  const dispatch = useCharacterDispatch();
  const state = useTrackedCharacterState();
  const loginInfo = useLoginInfoContext();
  const charDoc = state.charDoc;
  const changeList: ChangeDoc | undefined = state.editChanges;
  const hasConflicts: boolean = !!changeList?.conflictList;
  const hasUnresolvedConflicts: boolean = useMemo<boolean>(() => unresolvedConflictInList(changeList?.conflictList), [changeList?.conflictList]);
  const moveToEdit: string | undefined = state.moveToEdit;
  const moveOrder: MoveOrder[] = useCharacterSelector<MoveOrder[]>(selectMoveOrder);
  const [presentAlert, dismissAlert] = useIonAlert(); //used for deletion confirmation, new move conflicts, other
  const popOver = useRef<HTMLIonPopoverElement>(null); //there's also a usePopover hook
  const [presentMyToast, dismissToast] = useMyToast(); 
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

  useEffect(() => {
    return () => {
      console.log('EditCharacter unmounting')
    }
  },[])

  const tryUndoUniversalPropChangesCallback = useCallback((state: State, action, dispatch) => {
    const changeList = state.editChanges;
    const propChanges = changeList?.universalPropChanges;
    if(!propChanges) return;
    let addedMoves: string[] = [];
    let deletedMoves: string[] = [];
    if(propChanges.moveOrder && changeList?.moveChanges) {
      // Check if there's a move addition or deletion
      for(const key in changeList.moveChanges) {
        const moveNameChange = changeList.moveChanges[key]?.moveName;
        if(moveNameChange?.type === "add") {
          addedMoves.push(key);
        }
        else if(moveNameChange?.type === "delete") {
          deletedMoves.push(key);
        }
      }
    }
    let undoChanges: Changes | null = null;
    if(propChanges.moveOrder && (addedMoves.length > 0 || deletedMoves.length > 0)) {
      let addedString = addedMoves.length > 0 ? " (Added " + addedMoves.join(", ") + ")" : "";
      let deletedString = deletedMoves.length > 0 ? " (Deleted " + deletedMoves.join(", ") + ")" : "";
      let otherChangesString = keys(propChanges).length > 1 ? ", but your other changes were." : ".";
      presentAlert(
        {
          header: "Cannot undo changes to move order",
          message: "Because moves being added or deleted affects move order, your move order wasn't reverted" + otherChangesString + addedString + deletedString,
          buttons: [
            { text: 'OK', role: 'cancel' },
          ], 
        }
      );
      //undo all changes besides moveOrder
      undoChanges = {moveOrder: propChanges.moveOrder};
    }
    dispatch({actionType: 'editMove', moveName: 'universalProps', moveChanges: undoChanges} as EditAction);
  }, []);

  useMiddleware("EditCharacter", {addMove: addMoveCallback, tryUndoUniversalPropChanges: tryUndoUniversalPropChangesCallback});


  //prompt for changelist metadata
  function promptUploadChangeList() {
    if(!changeList) throw new Error("Cannot upload with no changes");

    // Users who can't even upload are never shown this at all, instead edit screen should have constant warning
    const canPublish = security.userHasPerms(loginInfo, "Editor");
    const buttons = [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Upload', handler: submit },
    ]; 
    if(canPublish) buttons.push({ text: 'Upload & Publish', handler: (opts)=>(submit(opts, true))})

    presentAlert(
      {
        header: "Upload changes",
        buttons: buttons,
        inputs: [
          {
            type: 'text',
            name: 'title',
            attributes: { maxLength: 25 },
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
    //return false when we don't want alert to close (ie if there's an error)
    function submit(opts: any, publish?: boolean) { 
      console.log("Current values: "+JSON.stringify(opts));
      //API call will also does this validation server-side via JSON-schema
      //Validate title
      const titleRegex = new RegExp(CompileConstants.ALLOWED_CHANGE_TITLE_REGEX); //alphanumeric and _, -, ., ~ length between 3-25
      const titleValid = titleRegex.test(opts.title);
      if(!titleValid) {
        presentMyToast('Title must be between 3-25 characters, which must be alphanumeric or ~_-. (no spaces)', 'warning');
        return false; 
      }
      //Validate version
      if(opts.version) {
        const versionRegex = new RegExp(CompileConstants.ALLOWED_CHANGE_VERSION_REGEX); //numbers and periods
        const versionValid = versionRegex.test(opts.version);
        if(!versionValid) {
          presentMyToast('If provided, version must be between 1-10 characters, numbers and periods only', 'warning');
          return false; 
        }
      }
      let changeDoc: ChangeDocServer = {
        ...changeList!, 
        updateTitle: opts.title, 
        //empty string will fail regex, but undefined properties will be removed
        updateDescription: opts.description || undefined, 
        updateVersion: opts.version || undefined, 
        createdAt: "", //set on server
        createdBy: "",
      };
      dispatch({actionType:'uploadChangeList', character: state.characterId, changes: changeDoc!, publish: publish});
    }
  }

  //FOR TESTING. Artifically load a new base chardoc
  function rebaseTest() {
    let newDoc = cloneDeep<CharDocWithMeta>(charDoc);
    //delete AA
    //delete newDoc.moves.AA;
    //newDoc.universalProps.moveOrder = newDoc.universalProps.moveOrder.filter((ord) => ord.name !== "AA");
    //modify AA
    if(newDoc.moves?.AA?.damage) newDoc.moves.AA.damage = 12345;
    if(newDoc.moves?.AA) newDoc.moves.AA.displayName = "booper";
    newDoc._rev = "9999-fakerino";
    newDoc.changeHistory.push("fake-rebase-test-change");
    dispatch({actionType:'setCharDoc', charDoc:newDoc});
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
            <IonLabel>Discard Edits</IonLabel>
          </IonItem>
          <IonItem button={true} detail={false} onClick={()=> { dismissPopOver(); dispatch({actionType:'openMoveEditModal', moveName:''}) }}>
            <IonLabel>Add Move</IonLabel>
          </IonItem>
          <IonItem button={true} detail={false} disabled={!changeList || !!changeList.conflictList} onClick={()=> { dismissPopOver(); promptUploadChangeList() }}>
            <IonLabel>Upload</IonLabel>
          </IonItem>
          <IonItem button={true} detail={false} onClick={rebaseTest}>
            <IonLabel>Test Rebasing</IonLabel>
          </IonItem>
        </IonList>
      </IonContent> 
    </IonPopover>
    </>
  )

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
      defs.moveName = moveNameDef;
    }
    return getDefsAndData(defs, cols, changes);
  }, [charDoc, changeList, universalPropDefs, columnDefs]);

  /*
     TODO: currently (as of Jan 23 2023 on v6.0.8), navigating away while the modal is open causes an error from the modal trying to call its onDidDismiss event.
     Seems to happen with popovers too?
     This is being fixed in upcoming Ionic version, see https://github.com/ionic-team/ionic-framework/pull/26245 and https://github.com/ionic-team/ionic-framework/issues/25775
  */

  return (
    <>
      {editFAB}
      <IonModal isOpen={moveToEdit !== undefined} onDidDismiss={() => dispatch({actionType: 'closeMoveEditModal'})}>
        <MoveEditModal moveName={moveToEdit!} getDefsAndData={getModalDefsAndData}
          originalChanges={moveToEdit === "universalProps" ? changeList?.universalPropChanges : changeList?.moveChanges?.[moveToEdit!]} 
        />
      </IonModal>
      {!security.userHasPerms(loginInfo, "Editor") && (
          security.userHasPerms(loginInfo, "Uploader")
            ? <IonItem color="warning">
                <IonLabel class="ion-text-wrap">You have permission to upload changes for this game, but 
                  {security.anySLUserHasPerms("Editor", loginInfo.secObj) ? " you will need to log in" : " someone with Editor permissions will need"} to apply those changes.
                </IonLabel>
              </IonItem>
            : <IonItem color="warning">
                <IonLabel class="ion-text-wrap">You do not have permission to upload changes for this game! 
                  {security.anySLUserHasPerms("Uploader", loginInfo.secObj) ? " You can log in to upload changes." : " Contact a game admin for upload permissions."}
                </IonLabel>
              </IonItem>
        )
      }
      {/*<NeedPermissions permissions="Editor" ifYes={(<></>)} ifNo={(*/}
        {/*<NeedPermissions permissions="Uploader" ifYes={(*/}
          {/*<IonItem color="warning">*/}
            {/*<IonLabel class="ion-text-wrap">You have permission to upload changes, but someone with Editor permissions will need to apply those changes.</IonLabel>*/}
          {/*</IonItem>*/}
        {/*)} */}
        {/*ifNo={(*/}
          {/*<IonItem color="warning">*/}
            {/*<IonLabel class="ion-text-wrap"></IonLabel>*/}
          {/*</IonItem>*/}
        {/*)} />*/}
      {/*)} />*/}
      <CharacterRenderer charDoc={charDoc} columnDefs={columnDefs} universalPropDefs={universalPropDefs} 
        editingEnabled={true} changes={changeList} highlightChanges={true} highlightConflicts={true} >
        {hasConflicts && 
          (hasUnresolvedConflicts ?
            <IonItem color="danger">
              <IonIcon color="warning" slot="start" md={warningOutline} />
              <IonLabel class="ion-text-wrap">Your edits have one or more conflicts with {changeList?.rebaseSource ? "this character's latest update" : "your imported change"}. Swipe a column right or left to prefer <span className={styles.textYours}>your data</span> or <span className={styles.textTheirs}>theirs</span>.</IonLabel>
            </IonItem>
          : 
            <IonItem color="success" button onClick={() => dispatch({actionType: "applyResolutions"})}>
              <IonIcon slot="start" md={checkmarkOutline} />
              <IonLabel class="ion-text-wrap">All conflicts resolved! Click here to apply these resolutions.</IonLabel>
            </IonItem>
          )
        }
      </CharacterRenderer>
    </>
  );
};

export default EditCharacter;
