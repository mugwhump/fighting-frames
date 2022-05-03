import { IonModal, IonItem, IonItemGroup, IonItemDivider, IonButton, IonLabel } from '@ionic/react';
import React, { useState, useEffect } from 'react';
import PouchDB from 'pouchdb';
import PouchAuth from 'pouchdb-authentication';
import ColumnDataEdit from './ColumnDataEdit';
import type { Changes, ColumnDef, ColumnData, ColumnDefAndData, DataType, ColumnChange, Add, Modify, Delete } from '../types/characterTypes'; //== 
import { keys } from '../services/util';
import { createChange } from '../services/merging';
import { cloneDeep, isEqual } from 'lodash';
PouchDB.plugin(PouchAuth);

type MoveEditModalProps  = {
  //TODO: instead of passing above, pass DefsAndData and continuously modify cloned moveChanges? Don't need to keep re-applying changes, ColDataEdit has state
  moveName: string; //if new move, pass empty string
  defsAndData: Readonly<ColumnDefAndData[]>; //has already had originalChanges applied once.
  originalChanges: Readonly<Changes> | null; //null means new move or nothing changed yet.
  editMove: (moveName: string, changes: Changes | null) => void; //to return edited move
  onDismiss: () => void; //callbacks defined in caller using this 
  isNewMove?: boolean; //defaults to false
}

// Use with useIonModal, pass this as body. Used to edit moves or add new moves (in which case not child of MoveOrUniversalProps)
const MoveEditModal: React.FC<MoveEditModalProps > = ({moveName, defsAndData, originalChanges, editMove, onDismiss, isNewMove = false }) => {
  //const [moveClone, setMoveClone] = useState<MoveOrProps>(cloneDeep<MoveOrProps>(originalMove));
  //const clonedCols: ColumnData[] = isMove(moveClone) ? moveClone.columnProps : moveClone;
  const [clonedChanges, setClonedChanges] = useState<Changes>(getClonedChanges);
  const displayName = (moveName === "universalProperties") ? "Universal Properties" : moveName;

  useEffect(()=>{
    console.log("Editing modal created for "+JSON.stringify(defsAndData));
  }, []);

  function getClonedChanges(): Changes {
    if(originalChanges) {
      return cloneDeep<Changes>(originalChanges);
    }
    else { //if adding a new move or no changes yet
      return {} as Changes;
    }
  }


  //as data is typed, put it in clonedChanges' modifications or additions
  //if newData undefined, means it's empty/deleted
  function editSingleColumn(columnName: string, newData?: ColumnData): void {
    const dataDef = defsAndData.find((dataDef) => dataDef.columnName === columnName);
    if(!dataDef) throw new Error("defAndData not found found in editSingleColumn func for column "+columnName);

    // preChangeData had originalChange applied to create current dataDef.data
    const originalChange: ColumnChange | undefined = originalChanges?.[columnName];
    let preChangeData: ColumnData | undefined = undefined; //undefined means originalChange was an addition and there was no data
    if(!originalChange) { //if no change, it's the raw doc data
      preChangeData = dataDef.data;
    }
    else if(originalChange.type !== 'add') {
      preChangeData = originalChange.old;
    }

    const change: ColumnChange | null = createChange(preChangeData, newData);
    if(!change) {
      //catches if deleting change from clone (aka rewinding originalChange)
      //catches if there was no originalChange, you put one in clone, and are undoing it
      console.log(`Data for ${columnName} reverted or kept as ${newData}, deleting possible change`);
      delete clonedChanges[columnName];
    }
    else {
      clonedChanges[columnName] = change;
    }
    //if clonedChange reverting to originalChange (og deletes, cloned adds, this deletes again), modification or addition becomes identical deletion
    //if og adds, then deleted, and added: reversion (change deleted) becomes addition
    console.log("Cloned changes updated: " + JSON.stringify(clonedChanges));
  }

  function submitEdits(): void {
    // submit cloned changes to EditCharacter, which adds them to changelist, writes, and parent MoveOrProps re-calcs defsAndData with new changes
    // Do deep compare to see if clonedChanges is equal to originals, if so just close
    const isRevert = keys(clonedChanges).length === 0;
    if(isEqual(originalChanges, clonedChanges)) {
      console.log("No new changes, not submitting");
    }
    else {
      editMove(moveName, isRevert ? null : clonedChanges);
    }
    onDismiss();
  }

  function deleteMove(): void {
    //TODO: change everything to deletions and submitEdits(). Don't allow for universal props, or mandatory columns.
    throw new Error("Not implemented");
  }

  function resetColumnChanges(columnName: string): void {
    //TODO: pass to child, call to remove changes for column (NOT to revert to stored state, that's complicated). Deletes change and recalcs.
    throw new Error("Not implemented");
  }

  function MoveJSX() {
    let jsx: JSX.Element[] = [];
    for(const defData of defsAndData) {
      const colName = defData.columnName;
      const colDisplayName = defData.def?.displayName ?? colName; //used for display
      if(!defData.def) {
        //TODO: add component for stub data with no definition, display it and prompt for deletion
        jsx.push(<span key={colName}>No definition for {colName} data {defData.data}</span>);
        console.warn("Unable to find definition for column "+defData.columnName);
      }
      else {
        jsx.push(
          <span key={colName}>
            <IonItem> 
              <IonLabel> {colDisplayName} </IonLabel>
            </IonItem> 
            <IonItem> 
              <ColumnDataEdit columnName={colName} colData={defData.data} colDef={defData.def} editSingleColumn={editSingleColumn} />
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
        <IonButton onClick={() => submitEdits()}>Submit</IonButton>
        <IonButton onClick={() => deleteMove()}>Delete</IonButton>
        <IonButton onClick={() => onDismiss()}>Cancel</IonButton>
      </IonItem>
    {/*</IonModal>*/}
    </>
  )
}

export default MoveEditModal;
