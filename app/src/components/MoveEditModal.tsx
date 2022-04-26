import { IonModal, IonItem, IonItemGroup, IonItemDivider, IonButton, IonLabel } from '@ionic/react';
import React, { useState, useEffect } from 'react';
import PouchDB from 'pouchdb';
import PouchAuth from 'pouchdb-authentication';
import ColumnDataEdit from './ColumnDataEdit';
import type { Move, MoveOrProps, MoveChanges, ColumnDef, ColumnData, ColumnDefAndData, DataType } from '../types/characterTypes'; //== 
import { isMove } from '../types/characterTypes'; //== 
import { cloneDeep } from 'lodash';
PouchDB.plugin(PouchAuth);

type MoveEditModalProps  = {
  //originalMove: MoveOrProps;
  //columnDefs: ColumnDef[],
  //TODO: instead of passing above, pass DefsAndData and continuously modify cloned moveChanges? Don't need to keep re-applying changes, ColDataEdit has state
  moveName: string; //if new move, pass empty string
  defsAndData: Readonly<ColumnDefAndData[]>; //has already had originalChanges applied once.
  originalChanges: Readonly<MoveChanges> | null; //null means new move or nothing changed yet.
  editMove: (moveChanges: MoveChanges) => void; //to return edited move
  onDismiss: () => void; //callbacks defined in caller using this 
  isNewMove?: boolean; //defaults to false
}

// Use with useIonModal, pass this as body. Used to edit moves or add new moves (in which case not child of MoveOrUniversalProps)
const MoveEditModal: React.FC<MoveEditModalProps > = ({moveName, defsAndData, originalChanges, editMove, onDismiss, isNewMove = false }) => {
  //const [moveClone, setMoveClone] = useState<MoveOrProps>(cloneDeep<MoveOrProps>(originalMove));
  //const clonedCols: ColumnData[] = isMove(moveClone) ? moveClone.columnProps : moveClone;
  const [clonedChanges, setClonedChanges] = useState<MoveChanges>(getClonedChanges);
  const displayName = (moveName === "universalProperties") ? "Universal Properties" : moveName;

  useEffect(()=>{
    console.log("Editing modal created for "+JSON.stringify(defsAndData));
  }, []);

  function getClonedChanges(): MoveChanges {
    if(originalChanges) {
      return cloneDeep<MoveChanges>(originalChanges);
    }
    else { //if adding a new move or no changes yet
      return {moveName: "", modified: [], added: [], deleted: []} as MoveChanges;
    }
  }

  //as data is typed, put it in clonedChanges' modifications or additions
  function editSingleColumn(newData: ColumnData, oldData: ColumnData | null): void {
    if(oldData) { //if there's old data, this change is a modification
      const modification = clonedChanges.modified.find((modification) => modification.new.columnName === newData.columnName);
      if(modification) { //if said modification already exists in move changes, update it
        modification.new.data = newData.data;
      }
      else { //otherwise, make a new one
        clonedChanges.modified.push({new: newData, old: oldData});
      }
    }
    else {
      const addition = clonedChanges.added.find((addition) => addition.columnName === newData.columnName);
      if(addition) {
        addition.data = newData.data;
      }
      else {
        clonedChanges.added.push(newData);
      }
    }
    console.log("Cloned changes updated: " + JSON.stringify(clonedChanges));
  }

  function submitEdits(): void {
    //TODO: detect if the only reason a change is an addition is because originalChanges deleted it, and similar situations. Or do in EditCharacter?
    // submit cloned changes to EditCharacter, which adds them to changelist, writes, and parent MoveOrProps re-calcs defsAndData with new changes
    //editMove(clonedChanges);
    throw new Error("Not implemented");
  }

  function deleteMove(): void {
    //TODO: change everything to deletions and submitEdits(). Don't allow for universal props.
    throw new Error("Not implemented");
  }

  function resetColumnChanges(columnName: string): void {
    //TODO: pass to child, call to remove changes for column (NOT to revert to stored state, that's complicated). Deletes change and recalcs.
    throw new Error("Not implemented");
  }

  function MoveJSX() {
    let jsx: JSX.Element[] = [];
    for(const defData of defsAndData) {
      const colName = defData.def?.columnName ?? defData.data!.columnName; //used for keys
      const colDisplayName = defData.def?.displayName ?? colName; //used for display
      if(!defData.def) {
        //TODO: add component for stub data with no definition, display it and prompt for deletion
        console.warn("Unable to find definition for column "+defData.data!.columnName);
      }
      else {
        jsx.push(
          <span key={colName}>
            <IonItem> 
              <IonLabel> {colDisplayName} </IonLabel>
            </IonItem> 
            <IonItem> 
              <ColumnDataEdit colData={defData.data} colDef={defData.def} editSingleColumn={editSingleColumn} />
            </IonItem> 
          </span>
        );
      }
    }
    return (
      <IonItemGroup>
        {jsx}
      </IonItemGroup>
    );
  }
  return (
    <>
    {/*<IonModal isOpen={show}>*/}
      <IonItem key="header">
        <IonLabel>Editing {displayName}</IonLabel>
      </IonItem>
      <MoveJSX />
      <IonItem key="footer">
        <input type="submit" style={{display: "none"}}/> {/* enables enter key submission. TODO: test on mobile */}
        <IonButton onClick={() => editMove(clonedChanges)}>Submit</IonButton>
        <IonButton onClick={() => deleteMove()}>Delete</IonButton>
        <IonButton onClick={() => onDismiss()}>Cancel</IonButton>
      </IonItem>
    {/*</IonModal>*/}
    </>
  )
}

export default MoveEditModal;
