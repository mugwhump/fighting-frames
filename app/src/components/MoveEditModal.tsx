import { IonModal, IonItem, IonInput, IonItemGroup, IonItemDivider, IonButton, IonLabel, IonIcon, IonText } from '@ionic/react';
import { warningOutline, warningSharp } from 'ionicons/icons';
import React, { useState, useRef, useEffect } from 'react';
import PouchDB from 'pouchdb';
import PouchAuth from 'pouchdb-authentication';
import ColumnDataEdit from './ColumnDataEdit';
import type { Changes, NewMoveChanges, ColumnDef, ColumnData, ColumnDefAndData, DataType, ColumnChange, Add, Modify, Delete } from '../types/characterTypes'; //== 
import type { FieldError } from '../types/utilTypes'; //==
import { keys, isString, isStringColumn, isMoveOrder, checkInvalid } from '../services/util';
import { createChange } from '../services/merging';
import { cloneDeep, isEqual } from 'lodash';
PouchDB.plugin(PouchAuth);

type MoveEditModalProps  = {
  moveName: string; //if new move, pass empty string
  defsAndData: Readonly<ColumnDefAndData[]>; //has already had originalChanges applied once.
  originalChanges: Readonly<Changes> | null; //null means new move or nothing changed yet.
  onDismiss: (prepareToDismiss?: boolean) => void; //callbacks defined in caller using this 
  editMove?: (moveName: string, changes: Changes | null, isDeletion?: boolean) => void; //to return edited move
  addMove?: (moveChanges: NewMoveChanges) => void; //is undefined if editing existing move.
}

// Use with useIonModal, pass this as body. Used to edit moves or add new moves (in which case not child of MoveOrUniversalProps and must set moveName)
const MoveEditModal: React.FC<MoveEditModalProps > = ({moveName, defsAndData, originalChanges, onDismiss, editMove, addMove }) => {
  const [clonedChanges, setClonedChanges] = useState<Changes>(getClonedChanges);
  const [fieldErrors, setFieldErrors] = useState<{[columnName: string]: FieldError}>(getInitialErrors);
  const displayName = (moveName === "universalProperties") ? "Universal Properties" : (addMove ? "New Move" : moveName);
  if(!editMove === !addMove) throw new Error("Either editMove or addMove must be defined, not both");

  useEffect(()=>{
    console.log("Editing modal created for "+JSON.stringify(defsAndData)+", checking for errors");
    return () => {
      if(addMove) {
        onDismiss();
      }
    }
  }, []);

  function getClonedChanges(): Changes {
    if(originalChanges) {
      return cloneDeep<Changes>(originalChanges);
    }
    else { //if adding a new move or no changes yet
      return {} as Changes;
    }
  }

  // With this, users are *unable* to submit changes to move unless they fix all errors
  function getInitialErrors(): {[columnName: string]: FieldError} {
    let result: {[columnName: string]: FieldError} = {};
    for(const dataDef of defsAndData) {
      if(dataDef.def) {
        const err = checkInvalid(dataDef.data, dataDef.def);
        if (err) result[dataDef.def.columnName] = err;
      }
    }
    return result;
  }

  //as data is typed, check errors and put it in clonedChanges' modifications or additions
  //if newData undefined, means it's empty/deleted
  function editSingleColumn(columnName: string, newData?: ColumnData): void {
    const dataDef = defsAndData.find((dataDef) => dataDef.columnName === columnName);
    if(!dataDef) throw new Error("defAndData not found found in editSingleColumn func for column "+columnName);

    //Error checking
    if(dataDef.def) {
      const error = checkInvalid(newData, dataDef.def);
      if(error) {
        //fieldErrors[columnName] = error;
        setFieldErrors({[columnName]: error, ...fieldErrors});
        console.log("Not updating clonedCols, error:" + JSON.stringify(error));
        return;
      }
      else {
        if(fieldErrors[columnName]) {
          delete fieldErrors[columnName];
          setFieldErrors({ ...fieldErrors});
        }
      }
    }

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


  function submit(): void {
    if(editMove) {
      // submit cloned changes to EditCharacter, which adds them to changelist, writes, and parent MoveOrProps re-calcs defsAndData with new changes
      // Do deep compare to see if clonedChanges is equal to originals, if so just close
      const isRevert = keys(clonedChanges).length === 0;
      if(isEqual(originalChanges, clonedChanges)) {
        console.log("No new changes, not submitting");
      }
      else {
        editMove(moveName, isRevert ? null : clonedChanges);
      }
    }
    else if(addMove) {
      let newMoveChanges: NewMoveChanges = clonedChanges as NewMoveChanges;
      addMove(newMoveChanges);
    }
    else {
      throw new Error("editMove or addMove must be defined");
    }
    //if adding move, need dismissal preparation since presenting button is inside a popover. Actual dismissal will be in useEffect cleanup.
    onDismiss(!!addMove); 
  }


  function deleteMove(): void {
    //TODO: change everything to deletions and submitEdits(). Don't allow for universal props, or mandatory columns.
    //Condense previous addition into a no-op.
    throw new Error("Not implemented");
  }

  function resetColumnChanges(columnName: string): void {
    //TODO: pass to child, call to remove changes for column (NOT to revert to stored state, that's complicated). Deletes change and recalcs.
    throw new Error("Not implemented");
  }

  return (
    <>
    {/*<IonModal isOpen={show}>*/}
      <IonItem key="header">
        <IonLabel>Editing {displayName}</IonLabel>
      </IonItem>
      {/*<NewMoveNameInput />*/}
      <IonItemGroup>
        {defsAndData.map((defData) => {
          const colName = defData.columnName;
          const err = fieldErrors[colName];
          return (
            <MoveColumnInput key={colName} defData={defData} editSingleColumn={editSingleColumn} fieldError={err}/>
          );
        })}
      </IonItemGroup>
      <IonItem key="footer">
        <input type="submit" style={{display: "none"}}/> {/* enables enter key submission. TODO: test on mobile */}
        <IonButton disabled={keys(fieldErrors).length>0} onClick={() => submit()}>Submit</IonButton>
        {editMove && <IonButton onClick={() => deleteMove()}>Delete</IonButton>}
        <IonButton onClick={() => onDismiss(!!addMove)}>Cancel</IonButton>
      </IonItem>
    {/*</IonModal>*/}
    </>
  )
}

type MoveColumnInputProps = {
  defData: Readonly<ColumnDefAndData>; 
  editSingleColumn: (columnName: string, newData?: ColumnData) => void; 
  fieldError: FieldError | undefined;
}

const MoveColumnInput: React.FC<MoveColumnInputProps> = ({defData, editSingleColumn, fieldError}) => {
  //let jsx: JSX.Element[] = [];
  //for(const defData of defsAndData) {
  const colName = defData.columnName;
  const colDisplayName = defData.def?.displayName ?? colName; //used for display
  const labelPosition = (colName === "moveOrder") ? undefined : "floating";
  const errorMSG = fieldError ? <IonText color="danger"><IonIcon ios={warningOutline} md={warningSharp} />   {fieldError.message}</IonText> : null;

  if(!defData.def) {
    //TODO: add component for stub data with no definition, display it and prompt for deletion
    console.warn("Unable to find definition for column "+defData.columnName);
    return (
      <span>No definition for {colName} data {defData.data}</span>
    );
  }
  else {
    return (
        <IonItem> 
          <IonLabel position={labelPosition}> {colDisplayName} {errorMSG} </IonLabel>
          <ColumnDataEdit columnName={colName} colData={defData.data} colDef={defData.def} editSingleColumn={editSingleColumn} />
        </IonItem> 
    );
  }
}

export default MoveEditModal;
