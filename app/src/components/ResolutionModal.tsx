import { IonModal, IonItem, IonInput, IonItemGroup, IonItemDivider, IonButton, IonLabel, IonIcon, IonText } from '@ionic/react';
import { warningOutline, warningSharp } from 'ionicons/icons';
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import PouchDB from 'pouchdb';
import PouchAuth from 'pouchdb-authentication';
import ColumnDataEdit from './ColumnDataEdit';
//import type { Changes, AddMoveChanges , ColumnDef, ColumnDefs, Cols, ColumnData, ColumnDefAndData, DataType, ColumnChange, Add, Modify, Delete } from '../types/characterTypes'; //== 
import type * as T from '../types/characterTypes'; //== 
import type { FieldError } from '../types/utilTypes'; //==
import { keys, isString, isStringColumn, isMoveOrder, checkInvalid } from '../services/util';
import { createChange } from '../services/merging';
import { cloneDeep, isEqual } from 'lodash';
import { useCharacterDispatch } from '../services/CharacterReducer';
import styles from '../theme/Character.module.css';

export type ResolutionModalProps  = {
  moveName: string; 
  getDefsAndData: (moveName: string) => T.ColumnDefAndData[]; //has already had originalChanges applied once.
  conflicts: T.Conflicts; 
}

// Use with useIonModal, pass this as body. 
//TODO: conflict resolution! Should conflicts disappear as values are edited? What if you want to compromise on notes or tags?a
const ResolutionModal: React.FC<ResolutionModalProps > = ({moveName, getDefsAndData, conflicts}) => {
  const addingNewMove: boolean = moveName === "";
  const defsAndData = useMemo<T.ColumnDefAndData[]>(()=>getDefsAndData(moveName), [moveName]);
  const displayName = (moveName === "universalProps") ? "Universal Properties" : (addingNewMove ? "New Move" : moveName);
  const characterDispatch = useCharacterDispatch();

  console.log("rendered resolution modal");



  function submit(): void {
    //if(addingNewMove) {
      //let newMoveChanges: AddMoveChanges  = clonedChanges as AddMoveChanges ;
      //characterDispatch({actionType: 'addMove', moveChanges: newMoveChanges});
    //}
    //else {
      //// Do deep compare to see if clonedChanges is equal to originals, if so just close
      //const isRevert = keys(clonedChanges).length === 0;
      //if(isEqual(originalChanges, clonedChanges)) {
        //console.log("No new changes, not submitting");
      //}
      //else {
        //characterDispatch({actionType: 'editMove', moveName, moveChanges: (isRevert ? null : clonedChanges)});
      //}
    //}
    characterDispatch({actionType: 'closeResolutionModal'});
  }


  function deleteMove(): void {
    characterDispatch({actionType:'deleteMove', moveName: moveName});
    characterDispatch({actionType: 'closeResolutionModal'});
  }

  function resetChanges(): void {
    characterDispatch({actionType:'editMove', moveName: moveName, moveChanges: null});
    characterDispatch({actionType: 'closeResolutionModal'});
  }

  return (
    <>
      <IonItem key="header">
        <IonLabel>Editing {displayName}</IonLabel>
      </IonItem>
      <IonItemGroup className={styles.highlightChanges}>
        {defsAndData.map((defData) => {
          const colName = defData.columnName;
          if(!addingNewMove && colName === "moveName") return null;
          else return (
            {/*<MoveColumnInput key={colName} defData={defData} editSingleColumn={editSingleColumn} fieldError={err}/>*/}
          );
        })}
      </IonItemGroup>
      <IonItem key="footer">
        <input type="submit" style={{display: "none"}}/> {/* enables enter key submission. TODO: test on mobile */}
        <IonButton onClick={() => submit()}>Submit</IonButton>
        {!addingNewMove && (moveName !== "universalProps") && <IonButton onClick={() => deleteMove()}>Delete</IonButton>}
        {!addingNewMove && <IonButton onClick={() => resetChanges()}>Undo All Changes</IonButton>}
        <IonButton onClick={() => characterDispatch({actionType:'closeResolutionModal'})}>Cancel</IonButton>
      </IonItem>
    </>
  )
}

type MoveColumnInputProps = {
  defData: Readonly<T.ColumnDefAndData>; 
  editSingleColumn: (columnName: string, newData?: T.ColumnData) => void; 
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
    //TODO: use the "Helper and Error text" as described in ion-item's documentation
    return (
        <IonItem> 
          <IonLabel className={defData.cssClasses.join(" ")} position={labelPosition}> {colDisplayName} {errorMSG} </IonLabel>
          <ColumnDataEdit columnName={colName} colData={defData.data} colDef={defData.def} editSingleColumn={editSingleColumn} />
        </IonItem> 
    );
  }
}

export default ResolutionModal;
