import * as T from '../types/characterTypes'; 
import React, { useState, useEffect, useMemo } from 'react';
import { IonRow, IonCol, IonItem, IonItemDivider, IonIcon } from '@ionic/react';
import { keyVals, } from '../services/util';
import { getWidthAtBP } from '../services/columnUtil';
import styles from '../theme/Character.module.css';

export type ColumnHeaderProps = {
  columnDefs: T.ColumnDefs; //definitions for move columns needing headers
  previewingSpecificWidth?: T.Breakpoint;
}

const ColumnHeaders: React.FC<ColumnHeaderProps> = ({columnDefs, previewingSpecificWidth}) => {

  let headerCols = [];
  for(let [key, def] of keyVals(columnDefs)) {
    if(!def) continue;
    const name = def?.shortName || def?.displayName || def.columnName;
    if((def.group === "needsHeader" || def.group === "normal") && def._calculatedTableHeaderHideClass !== 'ion-hide') { //don't bother rendering if always hidden
      //header will show when column's header hides and vice-versa
      let sizes: {size: string | undefined} | T.ColumnDefStyling['widths'] = previewingSpecificWidth ? {size: getWidthAtBP(previewingSpecificWidth, def.widths)?.toString()} : {...def.widths};
      headerCols.push(
        <IonCol key={def.columnName} {...sizes} className={(def._calculatedTableHeaderHideClass ?? '') +' '+styles.tableHeaderCol}>
          {name}
        </IonCol>
      )
    }
  }
  if(headerCols.length > 0) {
    return (
      <IonRow key={"headers"+previewingSpecificWidth} className={styles.tableHeaderRow} >
        {headerCols}
      </IonRow>
    )
  } else return null;
}

export default ColumnHeaders;
