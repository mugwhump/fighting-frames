
import { useIonModal, useIonAlert, IonContent, IonList, IonItem, IonButton, IonIcon, IonLabel, IonItemSliding, IonItemOptions, IonItemOption, IonReorder, IonReorderGroup } from '@ionic/react';
import { ItemReorderEventDetail } from '@ionic/core';
import { swapVerticalOutline, swapVerticalSharp, chevronForward, chevronBack, trash } from 'ionicons/icons';
//delete these 2
import React, { useState, useEffect, useRef } from 'react';
import { MoveOrder, ColumnDef, ColumnData, DataType } from '../types/characterTypes';
import { isMoveOrder } from '../services/util';
import { cloneDeep, isEqual } from 'lodash';
import MoveOrdererModal from './MoveOrdererModal';

type MoveOrdererButtonProps = {
  moveOrder: MoveOrder[];
  changeMoveOrder: (moveOrder: MoveOrder[])=>void;
}
const MoveOrdererButton: React.FC<MoveOrdererButtonProps> = ({moveOrder, changeMoveOrder}) => {
  const [presentModal, dismissModal] = useIonModal(MoveOrdererModal, {
    moveOrder,
    changeMoveOrder,
    onDismiss: handleDismiss,
  });
  function handleDismiss() {
    dismissModal();
  }
  function showModal() {
    presentModal();
  }

  return (
      <IonButton expand="block" size="default" className="edit-move-order" onClick={showModal}>
        <IonIcon slot="start" ios={swapVerticalOutline} md={swapVerticalSharp} />
        Rearrange Moves
      </IonButton>
  )
}


type MoveOrdererProps = {
  moveOrder: MoveOrder[];
  changeMoveOrder: (moveOrder: MoveOrder[])=>void;
  onDismiss: ()=>void;
}

export default MoveOrdererButton;
