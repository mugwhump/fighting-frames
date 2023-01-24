import { IonItem, IonItemGroup, IonItemDivider, IonLabel, IonText } from '@ionic/react';
import React, { useState, useEffect } from 'react';
import ColumnDataEditWrapper from './ColumnDataEditWrapper';
import { checkInvalid } from '../services/columnUtil';
import type { FieldError } from '../types/utilTypes'; //==
import * as T from '../types/characterTypes';


type DefEditPreviewProps = {
  def: T.ColumnDef;
}

const DefEditPreview: React.FC<DefEditPreviewProps> = ({def}) => {
  const [defData, setDefData] = useState<T.ColumnDefAndData>({data: undefined, def: def, columnName: def.columnName, cssClasses: []});
  const [error, setError] = useState<FieldError | undefined>(undefined);

  useEffect(() => {
    setDefData({data: defData.data, def: def, columnName: def.columnName, cssClasses: []});
  }, [def]);

  function editSingleColumn(columnName: string, newData?: T.ColumnData) {
    const newError = checkInvalid(newData, def);
    if(newError) {
      setError(newError);
      console.log("Not updating clonedCols, error:" + JSON.stringify(newError));
      return;
    }
    else {
      setError(undefined);
    }
    setDefData({data: newData, def: def, columnName: columnName, cssClasses: []});
  }

  return (
    <IonItemGroup>
      <IonItem color="primary">
        <IonLabel>Preview - users will see this editing interface</IonLabel>
      </IonItem>
      <ColumnDataEditWrapper defData={defData} editSingleColumn={editSingleColumn} fieldError={error} />
    </IonItemGroup>
  )
}

export default DefEditPreview;
