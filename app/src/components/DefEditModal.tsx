import { IonModal, IonContent, IonItem, IonInput, IonItemGroup, IonItemDivider, IonButton, IonLabel, IonIcon, IonText } from '@ionic/react';
import { warningOutline, warningSharp } from 'ionicons/icons';
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ColumnDataEditWrapper from './ColumnDataEditWrapper';
import * as T from '../types/characterTypes'; //== 
import type { FieldError } from '../types/utilTypes'; //==
import { keys, keyVals } from '../services/util';
//import { isString, isMoveOrder, checkInvalid, dataTypeIsNumber } from '../services/columnUtil';
import * as colUtil from '../services/columnUtil';
import { createChange, getInvertedMoveChanges } from '../services/merging';
import { cloneDeep, isEqual } from 'lodash';
import { predefinedWidths, metaDefs } from '../constants/internalColumns';
import { DefEditObj } from './DefEditor';
import DefEditPreview from './DefEditPreview';
import { HelpPopup } from './HelpPopup';

const startingColumnDef : T.ColumnDef = {
  columnName: "",
  group: "normal",
  dataType: T.DataType.Str,
  required: false,
  widths: predefinedWidths.medium,
}
export type DefEditModalProps  = {
  defEditingInfo: DefEditObj,
  updateDefCallback: (def: T.ColumnDef)=> string | false,
  deleteDefCallback: (defName: string)=>void,
  resetDefCallback: (defName: string)=>void,
  dismissModalCallback: ()=>void,
  colDef?: T.ColumnDef,
}

type DefPropertyFieldErrors = {[Property in keyof Partial<T.ColumnDef>]: {columnName: Property, message: string} }; 

// Use with useIonModal, pass this as body. Used to edit moves or add new moves 
const DefEditModal: React.FC<DefEditModalProps > = ({defEditingInfo, updateDefCallback, deleteDefCallback, resetDefCallback, dismissModalCallback, colDef}) => {
  const [clonedDef, setClonedDef] = useState<T.ColumnDef>(()=> cloneDeep<T.ColumnDef>(colDef ?? startingColumnDef ));
  const addingNewDef = defEditingInfo.defName === "";
  const canDelete = (!defEditingInfo.wasDeleted && !defEditingInfo.wasAdded && !addingNewDef);
  const [fieldErrors, setFieldErrors] = useState<DefPropertyFieldErrors>(getInitialErrors);
  const warnings = useMemo<DefPropertyFieldErrors>(getWarnings, [clonedDef, colDef]);


  // Do error checking for any of the definition's properties that's included in metaDefs (as in, the definitions that describe the properties of definitions themselves)
  function getInitialErrors(): DefPropertyFieldErrors {
    let result: {[Property in keyof Partial<T.ColumnDef>]: FieldError} = {};
    //TODO: extract method to run for individual property when updated. 
    //BUT, some props might have specialized error checking that looks at other props. Eg maxSize > minSize
    for(const [prop, metaDef] of keyVals(metaDefs)) {
      if(prop && metaDef) {
        const key = prop as keyof T.ColumnDef;
        const data = clonedDef?.[key];
        let err: false | FieldError = false;
        if(key === "widths") {
          //TODO: error checking for widths
        }
        //TODO: maxSize > minSize, allowedValues meet requirements
        //TODO: NumStr allowedValues can't start with numbers
        //else if(key === "")
        else {
          err = colUtil.checkInvalid(getPropertyData(key), {columnName: key, ...metaDef});
        }
        if (err) result[key] = {columnName: key, message: err.message};
      }
    }
    return result as DefPropertyFieldErrors;
  }

  function getWarnings(): DefPropertyFieldErrors {
    let result: {[Property in keyof Partial<T.ColumnDef>]: {columnName: Property, message: string} } = {};
    //TODO: warn about changing columnName

    //Warn if existing definition and dataTypes aren't the same underlying javascript type
    if(colDef?.dataType && !colUtil.dataTypesAreCompatible(clonedDef.dataType, colDef?.dataType)) {
      result.dataType = {columnName: 'dataType', message: `Changing an existing column from type ${clonedDef.dataType} to ${colDef.dataType} may cause complications if users have already entered data, which can't be automatically converted. Instead of changing this column's dataType, try deleting this column and creating a new one.`};
    }
    //Useless prop warnings take priority
    return {...result, ...getUselessProperties()};
  }

  //Warn users about useless properties and delete them upon submission
  function getUselessProperties(): DefPropertyFieldErrors {
    let result: {[Property in keyof Partial<T.ColumnDef>]: {columnName: Property, message: string} } = {};

    if(clonedDef.allowedValues !== undefined) {
      //forbidden values does nothing when allowed values are present
      if(clonedDef.forbiddenValues !== undefined) {
        result.forbiddenValues = {columnName: 'forbiddenValues', message: 'Forbidden values have no effect when allowed values are defined'};
      }
      //min/max size useless w/ single select
      if(clonedDef.dataType === T.DataType.Str) {
        if(clonedDef.maxSize !== undefined) {
          result.maxSize = {columnName: 'maxSize', message: 'Max size has no effect with String data with allowed values defined'}
        }
        if(clonedDef.minSize !== undefined) {
          result.minSize = {columnName: 'minSize', message: 'Min size has no effect with String data with allowed values defined'}
        }
      }
    }
    //allowedValues and forbidden values useless w/ number types
    if(colUtil.dataTypeIsNumber(clonedDef.dataType)) {
      if(clonedDef.allowedValues !== undefined) {
        result.allowedValues = {columnName: 'allowedValues', message: 'Allowed values have no effect with number-type data (excluding numeric strings)'};
      }
      if(clonedDef.forbiddenValues !== undefined) {
        result.forbiddenValues = {columnName: 'forbiddenValues', message: 'Forbidden values have no effect with number-type data (excluding numeric strings)'};
      }
    }
    return result;
  }

  function getPropertyData(propertyName: keyof T.ColumnDef): T.ColumnData | undefined {
    const val = clonedDef[propertyName];
    if(val === undefined) return undefined;
    if(propertyName === "allowedRegex") return val.toString(); //TODO: test
    if(propertyName === "required") return (val ? "required" : "optional");
    //These are basically maps/objects... wat do?
    if(propertyName === "cssRegex") return Object.values(val); 
    if(propertyName === "allowedValuesHints") return Object.values(val); 
    if(propertyName === "widths") return Object.values(val); 
  }
  //TODO: anything that gets converted above will need to be converted back before being saved. Not sure about RegExps

  function updateColumnDef(): void {
    const error = updateDefCallback(clonedDef);
    //TODO: clear useless properties
    if(!error) { //only dismiss if no error
      //TODO: either display the error here or in parent. Here I guess, since delete warning wants to be here.
      dismissModalCallback();
    }
  }

  function editSingleProperty(columnName: string, newData?: T.ColumnData): void {
    console.log(`Partially unfinished: changing col ${columnName} from ${clonedDef[columnName as keyof T.ColumnDef]} to ${newData}`);
    setClonedDef({...clonedDef, [columnName]: newData});
  }

  function deleteColumnDef(): void {
    if(!canDelete) throw new Error("Cannot delete def with edit info " + JSON.stringify(defEditingInfo));
    //TODO: warning spiel about existing data
    deleteDefCallback(clonedDef.columnName);
    dismissModalCallback();
  }

  function resetColumnDef(): void {
    if(addingNewDef)  throw new Error("Cannot delete def that's being added");
    resetDefCallback(clonedDef.columnName);
    dismissModalCallback();
  }


        //{keys(metaDefs).map((key) => {
          //const data = clonedDef[key as keyof T.ColumnDef];
          //return <DefFieldInput colName={key as keyof T.ColumnDef} data={data} />
        //})}

  return (
    <IonContent>
      <IonItem key="header">
        <IonLabel>Editing {defEditingInfo.defName}</IonLabel>
      </IonItem>
      {/*<IonItemGroup onKeyPress={(event: any) => {if(event.key === "Enter") updateColumnDef()}}> the drop-down selects make it annoying for Enter to submit here */}
      <IonItemGroup>
        <DefFieldInput colName="columnName" data={clonedDef.columnName} editSingleProperty={editSingleProperty} fieldError={undefined} warning={warnings.columnName}/>
        <DefFieldInput colName="dataType" data={clonedDef.dataType} editSingleProperty={editSingleProperty} fieldError={undefined} warning={warnings.dataType} />
        <DefFieldInput colName="allowedValues" data={clonedDef.allowedValues} editSingleProperty={editSingleProperty} fieldError={undefined} warning={warnings.allowedValues} />
        <DefFieldInput colName="forbiddenValues" data={clonedDef.forbiddenValues} editSingleProperty={editSingleProperty} fieldError={undefined} warning={warnings.forbiddenValues} />
        <DefFieldInput colName="maxSize" data={clonedDef.maxSize} editSingleProperty={editSingleProperty} fieldError={undefined} warning={warnings.maxSize} />
        <DefFieldInput colName="minSize" data={clonedDef.minSize} editSingleProperty={editSingleProperty} fieldError={undefined} warning={warnings.minSize} />
        <DefFieldInput colName="displayName" data={clonedDef.displayName} editSingleProperty={editSingleProperty} fieldError={undefined} warning={warnings.displayName} />
        <DefFieldInput colName="shortName" data={clonedDef.shortName} editSingleProperty={editSingleProperty} fieldError={undefined} warning={warnings.shortName} />
        <DefFieldInput colName="hintText" data={clonedDef.hintText} editSingleProperty={editSingleProperty} fieldError={undefined} warning={warnings.hintText} />
        <DefFieldInput colName="prefix" data={clonedDef.prefix} editSingleProperty={editSingleProperty} fieldError={undefined} warning={warnings.prefix} />
        <DefFieldInput colName="suffix" data={clonedDef.suffix} editSingleProperty={editSingleProperty} fieldError={undefined} warning={warnings.suffix} />
        <IonItem>widths...</IonItem>
        {
          //Perhaps make fake user-facing datatypes of "Select" (string), "Multi-Select" (list), "Numeric tag string" (numeric string) for allowed value variants?
          //Also one for multi-line text? Being able to add line breaks is big, must communicate what causes it.
        }
      </IonItemGroup>
      <DefEditPreview def={clonedDef} />
      <IonItem key="footer">
        <IonButton type="submit" onClick={updateColumnDef}>Submit</IonButton>
        <IonButton disabled={!canDelete} onClick={deleteColumnDef}>Delete Column</IonButton>
        <IonButton disabled={addingNewDef} onClick={resetColumnDef}>Undo All Changes</IonButton>
        <IonButton onClick={dismissModalCallback}>Cancel</IonButton>
      </IonItem>
    </IonContent>
  )
}

type DefFieldInputProps = {
  colName: keyof T.ColumnDef,
  data?: T.ColumnData,
  editSingleProperty: (columnName: string, newData?: T.ColumnData) => void; 
  fieldError?: FieldError;
  warning?: FieldError;
}

const DefFieldInput: React.FC<DefFieldInputProps> = ({colName, data, editSingleProperty, fieldError, warning}) => {
  const def = metaDefs[colName];
  if(!def) throw new Error("No definition for field" + colName);

  const defData: T.ColumnDefAndData = {
    columnName: colName,
    def: {...def, group: "normal", columnName: colName},
    data: data,
    cssClasses: []
  }

    return (
      <>
        {warning && <IonItem color="warning">{warning.message}</IonItem>}
        <ColumnDataEditWrapper defData={defData} editSingleColumn={editSingleProperty} fieldError={fieldError} />
      </>
    );
}

export default DefEditModal;
