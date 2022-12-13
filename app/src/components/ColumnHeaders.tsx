import type * as T from '../types/characterTypes'; //== 
import React, { useState, useEffect, useMemo } from 'react';
import { IonRow, IonCol, IonItem, IonItemDivider, IonIcon } from '@ionic/react';
import { keyVals, } from '../services/util';
import styles from '../theme/Character.module.css';

export type ColumnHeaderProps = {
  columnDefs: T.ColumnDefs; //definitions for move columns needing headers
}

const ColumnHeaders: React.FC<ColumnHeaderProps> = ({columnDefs}) => {

  let headerCols = [];
  for(let [key, def] of keyVals(columnDefs)) {
    if(!def) continue;
    const name = def?.shortName || def?.displayName || def.columnName;
    if(def.group === "needsHeader" && def._calculatedTableHeaderHideClass !== 'ion-hide') { //don't bother rendering if always hidden
      //header will show when column's header hides and vice-versa
      headerCols.push(
        <IonCol key={def.columnName} {...def.widths} className={def._calculatedTableHeaderHideClass +' '+styles.tableHeaderCol}>
          {name}
        </IonCol>
      )
    }
  }
  if(headerCols.length > 0) {
    return (
      <IonRow key="headers" className={styles.tableHeaderRow} >
        {headerCols}
      </IonRow>
    )
  } else return null;
}

export default ColumnHeaders;
