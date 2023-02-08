import { IonItem, IonItemGroup, IonItemDivider, IonLabel, IonText } from '@ionic/react';
import React, { useState, useEffect, useMemo } from 'react';
import ColumnDataEditWrapper from './ColumnDataEditWrapper';
import { checkInvalid } from '../services/columnUtil';
import type { FieldError } from '../types/utilTypes'; //==
import * as T from '../types/characterTypes';


type DefEditPreviewProps = {
  def: T.ColumnDef;
}

// Shows a preview of the input for the column whose definition is being edited
const DefEditPreview: React.FC<DefEditPreviewProps> = ({def}) => {
  const [defData, setDefData] = useState<T.ColumnDefAndData>({data: undefined, def: def, columnName: def.columnName, cssClasses: []});
  const error = useMemo<FieldError | false>(() => checkInvalid(defData.data, defData.def ?? def), [defData]);

  useEffect(() => {
    setDefData({data: defData.data, def: def, columnName: def.columnName, cssClasses: []});
  }, [def]);

  function editSingleColumn(columnName: string, newData?: T.ColumnData) {
    setDefData({data: newData, def: def, columnName: columnName, cssClasses: []});
  }

  return (
    <IonItemGroup>
      <IonItem color="primary">
        <IonLabel>Preview - users will see this editing interface</IonLabel>
      </IonItem>
      <ColumnDataEditWrapper defData={defData} editSingleColumn={editSingleColumn} fieldError={error || undefined} />
    </IonItemGroup>
  )
}

export default DefEditPreview;
