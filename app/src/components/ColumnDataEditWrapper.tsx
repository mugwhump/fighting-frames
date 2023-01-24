import { IonModal, IonItem, IonInput, IonItemGroup, IonItemDivider, IonButton, IonLabel, IonNote, IonIcon, IonText } from '@ionic/react';
import { warningOutline, warningSharp } from 'ionicons/icons';
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ColumnDataEdit from './ColumnDataEdit';
import type { Changes, AddMoveChanges , ColumnDef, ColumnDefs, Cols, ColumnData, ColumnDefAndData, DataType, ColumnChange, Add, Modify, Delete } from '../types/characterTypes'; //== 
import type { FieldError } from '../types/utilTypes'; //==
import { isString } from '../services/columnUtil';
import HelpPopup from './HelpPopup';
import styles from '../theme/Character.module.css';


type ColumnDataEditWrapperProps = {
  defData: Readonly<ColumnDefAndData>; 
  editSingleColumn: (columnName: string, newData?: ColumnData) => void; 
  fieldError: FieldError | undefined;
}

const ColumnDataEditWrapper: React.FC<ColumnDataEditWrapperProps> = ({defData, editSingleColumn, fieldError}) => {
  //let jsx: JSX.Element[] = [];
  //for(const defData of defsAndData) {
  const colName = defData.columnName;
  const colDisplayName = defData.def?.displayName ?? colName; //used for display
  const labelPosition = (colName === "moveOrder") ? undefined : "stacked";
  const errorMSG = fieldError ? <IonText color="danger"><IonIcon ios={warningOutline} md={warningSharp} />   {fieldError.message}</IonText> : null;
  const hasCounter = !!(defData.def && isString(defData.data ?? "", defData.def.dataType) && defData.def.maxSize);
  const helpPopup = defData.def?.hintText ? <HelpPopup>{defData.def?.hintText}</HelpPopup> : null; 
  const prefix = defData.def?.prefix ? <span>{defData.def?.prefix}</span> : null;
  const suffix = defData.def?.suffix ? <span>{defData.def?.suffix}</span> : null;

  if(!defData.def) {
    //TODO: add component for stub data with no definition, display it and prompt for deletion
    console.warn("Unable to find definition for column "+defData.columnName);
    return (
      <span>No definition for {colName} data {defData.data}</span>
    );
  }
  else {
    //TODO: use the "Helper and Error text" as described in ion-item's documentation?
    return (
        <IonItem counter={hasCounter}> 
          <IonLabel className={defData.cssClasses.join(" ")} position={labelPosition}> {colDisplayName} {errorMSG} </IonLabel>
          <ColumnDataEdit columnName={colName} colData={defData.data} colDef={defData.def} editSingleColumn={editSingleColumn} />
          {prefix && <IonNote className={styles.prefixNote} slot="start">{prefix}</IonNote>}
          {suffix && <IonNote className={styles.suffixNote} slot="end">{suffix}</IonNote>}
          {helpPopup && <IonNote className={styles.helperNote} slot="end">{helpPopup}</IonNote>}
        </IonItem> 
    );
  }
}

export default ColumnDataEditWrapper;
