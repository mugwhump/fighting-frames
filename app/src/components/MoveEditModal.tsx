import { IonModal, IonContent, IonItem, IonHeader, IonToolbar, IonTitle, IonFooter, IonRow, IonInput, IonItemGroup, IonItemDivider, IonButton, IonLabel, IonNote, IonIcon, IonText } from '@ionic/react';
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ColumnDataEditWrapper from './ColumnDataEditWrapper';
import type { Changes, AddMoveChanges , ColumnDef, ColumnDefs, Cols, ColumnData, ColumnDefAndData, DataType, ColumnChange, Add, Modify, Delete } from '../types/characterTypes'; //== 
import type { FieldError } from '../types/utilTypes'; //==
import { keys } from '../services/util';
import { isMoveOrder, checkInvalid } from '../services/columnUtil';
import { createChange, getInvertedMoveChanges } from '../services/merging';
import { cloneDeep, isEqual } from 'lodash';
import { useCharacterDispatch } from '../services/CharacterReducer';
import styles from '../theme/Character.module.css';

export type MoveEditModalProps  = {
  moveName: string; //if new move, pass empty string
  getDefsAndData: (moveName: string) => ColumnDefAndData[]; //adds already-used move names to def of moveName column when adding new move
  originalChanges: Readonly<Changes> | undefined; //undefined means new move or nothing changed yet.
}

// Use with useIonModal, pass this as body. Used to edit moves or add new moves 
const MoveEditModal: React.FC<MoveEditModalProps > = ({moveName, getDefsAndData, originalChanges}) => {
  const addingNewMove: boolean = moveName === "";
  const defsAndData = useMemo<ColumnDefAndData[]>(()=>getDefsAndData(moveName), [moveName]);
  const [clonedChanges, setClonedChanges] = useState<Changes>(getClonedChanges);
  const [fieldErrors, setFieldErrors] = useState<{[columnName: string]: FieldError}>(getInitialErrors);
  const displayName = (moveName === "universalProps") ? "Universal Properties" : (addingNewMove ? "New Move" : moveName);
  const hasChanges: boolean = !!originalChanges || keys(clonedChanges).length > 0;
  const characterDispatch = useCharacterDispatch();


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
      let skipCheck = dataDef.columnName === "moveName" && !addingNewMove;
      if(dataDef.def && !skipCheck) {
        const err = checkInvalid(dataDef.data, dataDef.def);
        if (err) result[dataDef.def.columnName] = err;
      }
    }
    return result;
  }

  //as data is typed, check errors and put it in clonedChanges' modifications or additions
  //if newData undefined, means it's empty/deleted
  const editSingleColumn = useCallback((columnName: string, newData?: ColumnData) => {
    const dataDef = defsAndData.find((dataDef) => dataDef.columnName === columnName);
    if(!dataDef) throw new Error("defAndData not found found in editSingleColumn func for column "+columnName);

    //trim whitespace so that adding leading/trailing whitespace won't dodge error checking or create changes
    if(typeof newData === 'string') {
      newData = newData.trim();
    }

    //Error checking
    if(dataDef.def) {
      const error = checkInvalid(newData, dataDef.def);
      if(error) {
        setFieldErrors({...fieldErrors, [columnName]: error});
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

    setClonedChanges({...clonedChanges}); //TODO: is there a reason not to call this?
    console.log("Cloned changes updated: " + JSON.stringify(clonedChanges));
  }, [defsAndData, clonedChanges, originalChanges, fieldErrors]);


  function submit(): void {
    //TODO: trim spaces for strings
    if(addingNewMove) {
      characterDispatch({actionType: 'addMove', moveChanges: clonedChanges as AddMoveChanges});
    }
    else {
      // Do deep compare to see if clonedChanges is equal to originals, if so just close
      const isRevert = keys(clonedChanges).length === 0;
      if(isEqual(originalChanges, clonedChanges)) {
        console.log("No new changes, not submitting");
      }
      else {
        characterDispatch({actionType: 'editMove', moveName, moveChanges: (isRevert ? null : clonedChanges)});
      }
    }
    characterDispatch({actionType: 'closeMoveEditModal'});
  }


  function deleteMove(): void {
    characterDispatch({actionType:'deleteMove', moveName: moveName});
    characterDispatch({actionType: 'closeMoveEditModal'});
  }

  function resetChanges(): void {
    //If undoing the addition/deletion of a whole move, dispatch the deleteMove/addMove actions so they're deleted/removed from moveOrder too
    if(clonedChanges.moveName) {
      if(clonedChanges.moveName.type === "add") {
        characterDispatch({actionType:'deleteMove', moveName: moveName});
      }
      else { //undo deletion by adding the move
        let addMoveChanges = getInvertedMoveChanges(clonedChanges) as AddMoveChanges;
        characterDispatch({actionType: 'addMove', moveChanges: addMoveChanges});
      }
    }
    //If undoing universalProps and moveOrder was changed, let middleware handle it and notify user
    else if(clonedChanges.moveOrder) {
      characterDispatch({actionType:'tryUndoUniversalPropChanges'});
    }
    else {
      characterDispatch({actionType:'editMove', moveName: moveName, moveChanges: null});
    }
    characterDispatch({actionType: 'closeMoveEditModal'});
  }


  // Deleted moves only show option to un-delete
  if(clonedChanges.moveName?.type === "delete") {
    return (
      <IonContent>
      <IonItem key="header">
        <IonLabel>Restore move?</IonLabel>
      </IonItem>
      <IonItem>The move {moveName} has been deleted. Would you like to restore it?</IonItem>
      <IonItem key="footer">
        <IonButton onClick={() => resetChanges()}>Restore move</IonButton>
        <IonButton onClick={() => characterDispatch({actionType:'closeMoveEditModal'})}>Cancel</IonButton>
      </IonItem>
      </IonContent>
    );
  }

  return (
    <>
    <IonHeader>
      <IonToolbar>
        <IonTitle>Editing {displayName}</IonTitle>
      </IonToolbar>
    </IonHeader>

    <IonContent>
      <IonItemGroup className={styles.highlightChanges} onKeyPress={(event: any) => {if(keys(fieldErrors).length === 0 && event.key === "Enter") submit()}}>
        {defsAndData.map((defData) => {
          const colName = defData.columnName;
          const err = fieldErrors[colName];
          if(!addingNewMove && colName === "moveName") return null;
          else return (
            <ColumnDataEditWrapper key={colName} defData={defData} editSingleColumn={editSingleColumn} fieldError={err}/>
          );
        })}
      </IonItemGroup>
    </IonContent>

    <IonFooter>
      <IonToolbar>
        <IonRow class="ion-justify-content-center">
          <IonButton type="submit" disabled={keys(fieldErrors).length>0} onClick={() => submit()}>Submit</IonButton>
          {!addingNewMove && (moveName !== "universalProps") && <IonButton onClick={() => deleteMove()}>Delete</IonButton>}
          {!addingNewMove && clonedChanges?.moveName?.type !== "add" && <IonButton disabled={!hasChanges} onClick={() => resetChanges()}>Undo All Changes</IonButton>}
          <IonButton onClick={() => characterDispatch({actionType:'closeMoveEditModal'})}>Cancel</IonButton>
        </IonRow>
      </IonToolbar>
    </IonFooter>
    </>
  )
}

export default MoveEditModal;
