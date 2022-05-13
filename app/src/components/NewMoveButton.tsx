import { useIonViewWillLeave, IonItem, IonLabel, IonButton, IonIcon, useIonModal } from '@ionic/react';
import { addOutline, addSharp } from 'ionicons/icons';
import React, { useState, useEffect, useRef } from 'react';
import { MoveOrder, ColumnDef, ColumnDefs, ColumnDefAndData, ColumnData, DataType, Changes, NewMoveChanges } from '../types/characterTypes';
import { cloneDeep, isEqual } from 'lodash';
import { keys, keyVals } from '../services/util';
import MoveEditModal from './MoveEditModal';

type NewMoveButtonProps = {
  getColumnDefs: ()=>ColumnDefs;
  addMove: (moveChanges: NewMoveChanges) => void; 
  dismissPopOver: ()=>void;
}
const NewMoveButton: React.FC<NewMoveButtonProps> = ({getColumnDefs, addMove, dismissPopOver}) => {
  const [defsOnly, ] = useState<ColumnDefAndData[]>(getDefsAsDefData);
  const [presentModal, dismissModal] = useIonModal(MoveEditModal, {
    moveName: "",
    defsAndData: defsOnly,
    originalChanges: null,
    onDismiss: handleDismiss,
    addMove,
  });

  function getDefsAsDefData() {
    let result: ColumnDefAndData[] = [];
    let columnDefs = getColumnDefs();
    for(const key in columnDefs) {
      let defData: ColumnDefAndData = {columnName: key, def: columnDefs[key], display: true};
      result.push(defData);
    }
    return result;
  }

  function handleDismiss(prepareToDismiss?: boolean) {
    if(prepareToDismiss) {
      //Must dismiss modal, which then calls this again to dismiss the popover
      dismissModal();
    }
    else {
      dismissPopOver();
    }
  }

  function showModal() {
    presentModal();
  }

  return (
    <IonItem button={true} detail={false} onClick={showModal}>
      <IonLabel>Add Move</IonLabel>
    </IonItem>
  )
}

export default NewMoveButton;
