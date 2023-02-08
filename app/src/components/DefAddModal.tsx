import { useIonModal, useIonAlert, IonContent, IonList, IonItem, IonItemDivider, IonButton, IonIcon, IonLabel, IonNote, IonSelect, IonSelectOption } from '@ionic/react';
import { ItemReorderEventDetail } from '@ionic/core';
import { swapVerticalOutline, swapVerticalSharp, chevronForward, chevronBack, trash } from 'ionicons/icons';
//delete these 2
import React, { useState, useEffect, useRef } from 'react';
import { DefGroup, groupList , DesignDoc, ColumnDefs, ColumnDef, ColumnData, DataType } from '../types/characterTypes';
import { specialDefs } from '../constants/internalColumns';
import { DesignDocChanges, DefEditObj } from './DefEditor';  
import { keys } from '../services/util';
import { cloneDeep, isEqual, set } from 'lodash';
import { HelpPopup } from './HelpPopup';
import characterStyles from '../theme/Character.module.css';


type DefAddProps  = {
  doc: Readonly<DesignDoc>; //current working definitions in proper order
  docChanges: Readonly<DesignDocChanges>;
  isUniversalProps: boolean;
  setDefToEditCallback: (editObj: DefEditObj)=>void; 
  dismissModalCallback: ()=>void;
}

// One instance of this for universal props, one for columns
const DefAddModal: React.FC<DefAddProps > = ({doc, docChanges, isUniversalProps, setDefToEditCallback, dismissModalCallback}) => {
  const path = isUniversalProps ? "universalPropDefs" : "columnDefs";
  const [presentAlert, dismiss] = useIonAlert();
  const suggestions: Readonly<ColumnDefs> = specialDefs.suggested[path];

  function clickedDef(colName: string) {
    console.log('Adding def '+colName);
    let editObj: DefEditObj = {defName: colName, isUniversalProp: isUniversalProps, propOrColPath: path, wasAdded: true, isSuggested: colName !== ""};
    setDefToEditCallback(editObj);
    dismissModalCallback();
  }

  return (
    <IonContent>

      <IonItem key="header">
        <IonLabel><h1>Add {isUniversalProps ? "Universal Property" : "Move Column"}</h1></IonLabel>
      </IonItem>

      <IonList>
        <IonItem button detail key="new" onClick={() => clickedDef("")}>
          <IonLabel>Add New Empty Column</IonLabel>
        </IonItem>

        <IonItemDivider>
          <IonLabel><h1>Suggested Columns</h1></IonLabel>
        </IonItemDivider>
        {
          keys(suggestions).map((colName) => {
            const def = suggestions[colName];
            if(def === undefined) throw new Error("Error in suggested columns, no definition for key "+colName);
            const alreadyExists: boolean = !!(docChanges?.[path]?.[colName] || doc[path]?.[colName]);
            return (
              <IonItem key={colName} button detail disabled={alreadyExists} onClick={() => clickedDef(colName)}>
                <IonLabel>{def.displayName ?? colName}{alreadyExists && " - Column with ID '"+colName+"' already exists"}</IonLabel>
              </IonItem>
            )
          })
        }
      </IonList>

      <IonItem key="footer">
        <IonButton onClick={dismissModalCallback}>Cancel</IonButton>
      </IonItem>

    </IonContent> 
  );

}

export default DefAddModal;
