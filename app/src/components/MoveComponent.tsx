import { IonRow, IonCol } from '@ionic/react';
import React from 'react';
import {Move, ColumnDef } from '../types/characterTypes';

// All db data in this component is props, state should only be used for UI stuff
type MoveProps = {
  move: Move,
  columns: ColumnDef[],
}

const MoveComponent: React.FC<MoveProps> = ({move, columns}) => {
  return (
    <IonRow>
      <IonCol>{move.moveName}</IonCol>
      {move.columnProps.map((column) => (
        <IonCol key={column.columnName}>
          {columns.find(col => col.columnName === column.columnName)!.columnName}
          =
          {column.data} 
        </IonCol>
      ))}
    </IonRow>
  );
}

export default MoveComponent;
