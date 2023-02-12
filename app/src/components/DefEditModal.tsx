import { useIonAlert, IonContent, IonItem, IonHeader, IonToolbar, IonTitle, IonFooter, IonItemGroup, IonRow, IonAccordionGroup, IonNote, IonicSafeString, IonAccordion, IonButton, IonLabel, IonText } from '@ionic/react';
//import { warningOutline, warningSharp } from 'ionicons/icons';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ColumnDataEditWrapper from './ColumnDataEditWrapper';
import * as T from '../types/characterTypes'; //== 
import type { FieldError } from '../types/utilTypes'; //==
import { keys, keyVals } from '../services/util';
//import { isString, isMoveOrder, checkInvalid, dataTypeIsNumber } from '../services/columnUtil';
import * as colUtil from '../services/columnUtil';
import styles from '../theme/DefEditor.module.css';
import characterStyles from '../theme/Character.module.css';
import { createChange, getInvertedMoveChanges } from '../services/merging';
import { cloneDeep, isEqual } from 'lodash';
import { forbiddenNames, predefinedWidths, specialDefs } from '../constants/internalColumns';
import { metaDefs, extraMetaDefs, ExtraMetaDefKey, DefPropertyFieldErrors, MetaDefKey, getExtraMetaDef, getMetaDef, getPropertyAsColumnData, getErrorsForColumnDef, getDefPropError, getExtraDefPropError } from '../constants/metaDefs';
import { DefEditObj } from './DefEditor';
import DefEditPreview from './DefEditPreview';
import { HelpPopup } from './HelpPopup';
import DataRenderer from './DataRenderer';

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
  colDef?: T.ColumnDef, //undefined if adding blank or suggested def for first time
}


// Use with useIonModal, pass this as body. Used to edit moves or add new moves 
const DefEditModal: React.FC<DefEditModalProps > = ({defEditingInfo, updateDefCallback, deleteDefCallback, resetDefCallback, dismissModalCallback, colDef}) => {
  const [clonedDef, setClonedDef] = useState<T.ColumnDef>(getStartingDef);
  const addingNewBlankDef = defEditingInfo.defName === ""; //TODO: no way to identify suggested defs that are just being added now rather than earlier in session...
  const canDelete = (!defEditingInfo.wasDeleted && !defEditingInfo.wasAdded && !defEditingInfo.isMandatory);
  const [fieldErrors, setFieldErrors] = useState<DefPropertyFieldErrors>(() => getErrorsForColumnDef(clonedDef));
  const warnings = useMemo<DefPropertyFieldErrors>(getWarnings, [clonedDef, colDef]);
  const [presentAlert, dismissAlert] = useIonAlert(); 

  function getStartingDef(): T.ColumnDef {
    let result = colDef;
    if(!result) {
      if(defEditingInfo.isSuggested) {
        let suggestedDef = specialDefs.suggested[defEditingInfo.propOrColPath][defEditingInfo.defName]
        if(!suggestedDef) {
          console.error(`Could not find suggested def ${defEditingInfo.defName}`);
          result = startingColumnDef;
        } else {
         result = suggestedDef;
        }
      }
      else {
        result = startingColumnDef;
      }
    }
    return cloneDeep<T.ColumnDef>(result);
  }

  function getWarnings(): DefPropertyFieldErrors {
    let result: {[Property in keyof Partial<T.ColumnDef>]: {columnName: Property, message: string} } = {};
    //TODO: warn about changing columnName. Will defEditor even work if returned definition has different name than one given with defEditingInfo?

    //Warn if existing definition and dataTypes aren't the same underlying javascript type
    if(!defEditingInfo.wasAdded && colDef?.dataType && !colUtil.dataTypesAreCompatible(clonedDef.dataType, colDef?.dataType)) {
      result.dataType = {columnName: 'dataType', message: `Changing an existing column from type ${clonedDef.dataType} to ${colDef.dataType} may cause complications if users have already entered data, which can't be automatically converted. Instead of changing this column's dataType, try deleting this column and creating a new one.`};
    }
    //Useless prop warnings take priority
    return {...result, ...getUselessProperties()};
  }

  //Warn users about useless properties and delete them upon submission. 
  //TODO: can run server-side? Then don't need to do this column upon submission, server will do it. Would have to do it after server's error-check to ensure consistency.
  function getUselessProperties(): DefPropertyFieldErrors {
    //let result: {[Property in keyof Partial<T.ColumnDef>]: {columnName: Property, message: string} } = {};
    let result: DefPropertyFieldErrors = {};

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
    //TODO: strip out allowedValuesHints if no allowedValues. 
    return result;
  }


  function updateColumnDef(): void {
    let errorString: string | false = false;
    let errorKeys: string[] = keys(fieldErrors);
    if(errorKeys.length === 0) {
      //TODO: clear useless properties, inc any hints for allowedValues that aren't there. Unless doing it server-side.
      //TODO: trim string vals
      errorString = updateDefCallback(clonedDef); //returns error string if columnName in use or the editor component encountered an issue
      if(!errorString) { //only dismiss if no error
        dismissModalCallback();
        return;
      }
    }
    else {
      errorString = "Errors in one or more fields: <br>";
      for(const key of errorKeys) {
        errorString += `${key}: ${fieldErrors[key as MetaDefKey]?.message} <br>`;
      }
    }
    //Display error
    if(errorString) {
      presentAlert(
        {
          header: "Error updating column",
          message: new IonicSafeString(errorString), //TODO: users can actually put html in, say, forbidden values, which will show in errorString and be rendered.
          buttons: [
            { text: 'OK', handler: () => dismissAlert() },
          ], 
          //onDidDismiss: (e) => { },
        }
      );
    }
  }

  
  function editSingleProperty(defProperty: keyof T.ColumnDef, newData?: T.ColumnData): void {
    // newData already has empty values as undefined and arrays copied.
    console.log(`changing property ${defProperty} from ${clonedDef[defProperty as keyof T.ColumnDef]} to ${newData}`);
    const newDef = {...clonedDef, [defProperty]: newData};
    if(newData === undefined) {
      delete newDef[defProperty];
    }
    //error check
    //const err: FieldError | false = getDefPropError(newDef, defProperty);
    //if(err) {
      //console.log(`Error in property ${defProperty}, ${err.message}`);
      //setFieldErrors({...fieldErrors, [defProperty]: err});
    //}
    //else if(fieldErrors[defProperty]){
      //const newErrors = {...fieldErrors};
      //delete newErrors[defProperty];
      //setFieldErrors(newErrors);
    //}
    //TODO: if changing an allowedVal, update hints key? Tricky but doable? Can ignore reorderings.
    setFieldErrors(getErrorsForColumnDef(newDef, !forbiddenNames.includes(defEditingInfo.defName)));
    setClonedDef(newDef);
  }

  function editConvertedProperty(defProperty: ExtraMetaDefKey, newData?: T.ColumnData): void {
    console.log(`Partially unfinished: changing property ${defProperty} from ${clonedDef[defProperty as keyof T.ColumnDef]} to ${newData}`);
    let newDef = cloneDeep<T.ColumnDef>(clonedDef);
    if(defProperty === 'required') {
      newDef.required =  (newData === 'required');
    }
    else if(defProperty === 'dontRenderEmpty') {
      newDef.dontRenderEmpty =  (newData === 'true');
    }
    else if(defProperty.startsWith('allowedValuesHints-')) {
      let allowedVal = defProperty.split('allowedValuesHints-')[1];
      if(newDef.allowedValues?.includes(allowedVal)) {
        if(newData === "") {
          delete newDef.allowedValuesHints?.[allowedVal];
          if(newDef.allowedValuesHints && keys(newDef?.allowedValuesHints).length === 0) delete newDef.allowedValuesHints;
        }
        else {
          newDef.allowedValuesHints = {...newDef.allowedValuesHints, [allowedVal]: newData as string};
        }
      }
    }
    else if(defProperty.startsWith('size-')) {
      let key: T.SizeBreakpoint = defProperty as T.SizeBreakpoint;
      //let bp = defProperty.split('width-')[1] as T.Breakpoint;
      //const key: T.SizeBreakpoint = `size-${bp}`; //`
      if(newData === "" || newData === undefined) {
        delete newDef.widths?.[key];
        if(newDef.widths && Object.keys(newDef.widths).length === 0) delete newDef.widths;
      }
      else {
        newDef.widths = {...newDef.widths, [key]: newData as string};
      }
    }
    setClonedDef(newDef);
    //TODO: error check
    //const err: FieldError | false = getExtraDefPropError(newDef, defProperty);
    //if(err) {
      //console.log(`Error in extra property ${defProperty}, ${err.message}`);
      //setFieldErrors({...fieldErrors, [defProperty]: err});
    //}
    //else if(fieldErrors[defProperty]){
      //const newErrors = {...fieldErrors};
      //delete newErrors[defProperty];
      //setFieldErrors(newErrors);
    //}
    setFieldErrors(getErrorsForColumnDef(newDef));
  }

  function deleteColumnDef(): void {
    if(!canDelete) throw new Error("Cannot delete def with edit info " + JSON.stringify(defEditingInfo));
    //TODO: warning spiel about existing data. Mention that you can restore it until uploading.
    deleteDefCallback(clonedDef.columnName);
    dismissModalCallback();
  }

  function resetColumnDef(): void {
    if(!colDef) throw new Error("Cannot delete def that's being added");
    if(defEditingInfo.wasAdded) {
      presentAlert(
        {
          header: "Permanently remove column?",
          message: "This column hasn't been uploaded yet, so its deletion can't be undone.",
          buttons: [
            { text: 'Cancel', handler: () => dismissAlert() },
            { text: 'Delete', handler: () => {
              dismissAlert();
              resetDefCallback(clonedDef.columnName);
              dismissModalCallback();
            }},
          ], 
          //onDidDismiss: (e) => { },
        }
      );
    }
    else {
      resetDefCallback(clonedDef.columnName);
      dismissModalCallback();
    }
  }

  // Mandatory columns like displayName have certain properties that can't be edited. isPropertyFixed() checks if given property's non-editable.
  const isPropertyFixed = useCallback((key: MetaDefKey) => {
    const mandatoryFixedProperties: Readonly<T.ColumnDef> | undefined = specialDefs.mandatory[defEditingInfo.propOrColPath][defEditingInfo.defName]; 
    if(!mandatoryFixedProperties) return false;
    if(key.startsWith('size-')) return !!mandatoryFixedProperties.widths;
    if(key.startsWith('allowedValuesHints-')) return !!mandatoryFixedProperties.allowedValuesHints;

    return keys(mandatoryFixedProperties).includes(key);
  }, [defEditingInfo]);


  return (
    <>
    <IonHeader>
      <IonToolbar>
        <IonTitle>Editing{defEditingInfo.isMandatory ? " Mandatory" : ''} Column {clonedDef.displayName || clonedDef.columnName}</IonTitle>
      </IonToolbar>
    </IonHeader>

    <IonContent>
      {/*<IonItem key="header" class="ion-text-wrap">*/}
        {/*<IonLabel>Editing{defEditingInfo.isMandatory ? " Mandatory" : ''} Column {clonedDef.displayName || clonedDef.columnName}</IonLabel>*/}
      {/*</IonItem>*/}

      {/*<IonItemGroup onKeyPress={(event: any) => {if(event.key === "Enter") updateColumnDef()}}> the drop-down selects make it annoying for Enter to submit here */}
      <IonItemGroup>
        <DefFieldInput defProperty="columnName" data={clonedDef.columnName} editSingleProperty={editSingleProperty} fieldError={fieldErrors.columnName} warning={warnings.columnName} isPropertyFixed={isPropertyFixed} />
        <DefFieldInput defProperty="displayName" data={clonedDef.displayName} editSingleProperty={editSingleProperty} fieldError={fieldErrors.displayName} warning={warnings.displayName}  isPropertyFixed={isPropertyFixed} />
        <DefFieldInput defProperty="shortName" data={clonedDef.shortName} editSingleProperty={editSingleProperty} fieldError={fieldErrors.shortName} warning={warnings.shortName}  isPropertyFixed={isPropertyFixed} />
        <DefFieldInput defProperty="hintText" data={clonedDef.hintText} editSingleProperty={editSingleProperty} fieldError={fieldErrors.hintText} warning={warnings.hintText}  isPropertyFixed={isPropertyFixed} />
        <DefFieldInput defProperty="dataType" data={clonedDef.dataType} editSingleProperty={editSingleProperty} fieldError={fieldErrors.dataType} warning={warnings.dataType}  isPropertyFixed={isPropertyFixed} />
        <DefFieldInput defProperty="required" data={getPropertyAsColumnData(clonedDef, 'required')} editSingleProperty={editConvertedProperty} fieldError={fieldErrors.required} warning={warnings.required}  isPropertyFixed={isPropertyFixed} />
        <DefFieldInput defProperty="allowedValues" data={clonedDef.allowedValues} editSingleProperty={editSingleProperty} fieldError={fieldErrors.allowedValues} warning={warnings.allowedValues}  isPropertyFixed={isPropertyFixed} />
        {clonedDef.allowedValues &&
          <IonAccordionGroup><IonAccordion>
            <IonItem slot="header" color="light">
              <IonLabel>Allowed Value Descriptions</IonLabel>
            </IonItem>
          <div slot="content">
            {clonedDef.allowedValues?.map((allowedVal) => {
              let key: ExtraMetaDefKey = `allowedValuesHints-${allowedVal}`;
              return <DefFieldInput key={key} defProperty={key} data={clonedDef.allowedValuesHints?.[allowedVal]} editSingleProperty={editConvertedProperty} fieldError={fieldErrors[key]} warning={warnings[key]} isPropertyFixed={isPropertyFixed} />
            })}
          </div>
          </IonAccordion></IonAccordionGroup>
        }

        <DefFieldInput defProperty="forbiddenValues" data={clonedDef.forbiddenValues} editSingleProperty={editSingleProperty} fieldError={fieldErrors.forbiddenValues} warning={warnings.forbiddenValues}  isPropertyFixed={isPropertyFixed} />
        <DefFieldInput defProperty="maxSize" data={clonedDef.maxSize} editSingleProperty={editSingleProperty} fieldError={fieldErrors.maxSize} warning={warnings.maxSize}  isPropertyFixed={isPropertyFixed} />
        <DefFieldInput defProperty="minSize" data={clonedDef.minSize} editSingleProperty={editSingleProperty} fieldError={fieldErrors.minSize} warning={warnings.minSize}  isPropertyFixed={isPropertyFixed} />
        <DefFieldInput defProperty="dontRenderEmpty" data={getPropertyAsColumnData(clonedDef, 'dontRenderEmpty')} editSingleProperty={editConvertedProperty} fieldError={fieldErrors.dontRenderEmpty} warning={warnings.dontRenderEmpty}  isPropertyFixed={isPropertyFixed} />
        <DefFieldInput defProperty="prefix" data={clonedDef.prefix} editSingleProperty={editSingleProperty} fieldError={fieldErrors.prefix} warning={warnings.prefix}  isPropertyFixed={isPropertyFixed} />
        <DefFieldInput defProperty="suffix" data={clonedDef.suffix} editSingleProperty={editSingleProperty} fieldError={fieldErrors.suffix} warning={warnings.suffix}  isPropertyFixed={isPropertyFixed} />
        { 
          <IonAccordionGroup><IonAccordion>
          <IonItem slot="header" color="light">
            <IonLabel>Width -&nbsp; 
            {(clonedDef.widths === undefined) 
              ? "share row" 
              : colUtil.getColWidths(clonedDef.widths)!.map((width) => {
                return width ?? "-";
              }).join('/')
            }
            &nbsp;<IonText color="danger">{T.BPList.map((bp) => fieldErrors[`size-${bp}`]).find((err) => err !== undefined)?.message}</IonText>
            </IonLabel>
          </IonItem>
          <div slot="content">
            {T.BPList.map((bp) => {
              const key = 'size-'+bp as T.SizeBreakpoint;
              return <DefFieldInput key={key} defProperty={key} data={clonedDef.widths?.[key]} editSingleProperty={editConvertedProperty} fieldError={fieldErrors[key]} warning={warnings[key]}  isPropertyFixed={isPropertyFixed} />
            })}
          </div>
        </IonAccordion></IonAccordionGroup>
        }

        {
          //Perhaps make fake user-facing datatypes of "Select" (string), "Multi-Select" (list), "Numeric tag string" (numeric string) for allowed value variants?
          //Also one for multi-line text? Being able to add line breaks is big, must communicate what causes it.
        }
      </IonItemGroup>

      <br />
      <DefEditPreview def={clonedDef} />

    </IonContent>

    <IonFooter>
      <IonToolbar>
        <IonRow class="ion-justify-content-center">
          <IonButton size="default" type="submit" onClick={updateColumnDef}>Submit</IonButton>
          {!defEditingInfo.wasAdded && <IonButton size="default" disabled={!canDelete} onClick={deleteColumnDef}>Delete Column</IonButton> }
          <IonButton size="default" disabled={colDef === undefined} onClick={resetColumnDef}>{defEditingInfo.wasAdded ? "Remove Column": "Undo All Changes"}</IonButton>
          <IonButton size="default" onClick={dismissModalCallback}>Cancel</IonButton>
        </IonRow>
      </IonToolbar>
    </IonFooter>
    </>
  )
}


type DefFieldInputProps<KeyType extends keyof T.ColumnDef | ExtraMetaDefKey> = {
  defProperty: KeyType,
  data?: T.ColumnData,
  editSingleProperty: (columnName: KeyType, newData?: T.ColumnData) => void; 
  fieldError?: FieldError;
  warning?: FieldError;
  isPropertyFixed: (key: MetaDefKey) => boolean; //if true (eg for fixed properties of mandatory columns), just display the value instead of an editor
}

const DefFieldInput = <KeyType extends keyof T.ColumnDef | ExtraMetaDefKey>({defProperty, data, editSingleProperty, fieldError, warning, isPropertyFixed}: DefFieldInputProps<KeyType>) => {
  let def = metaDefs[defProperty as keyof T.ColumnDef] || extraMetaDefs[defProperty as ExtraMetaDefKey];
  if(!def) {
    if(defProperty.startsWith('allowedValuesHints-')) {
      def = extraMetaDefs['allowedValuesHints'];
      let allowedVal = defProperty.split('allowedValuesHints-')[1];
      def = {...def, displayName: def.displayName + allowedVal};
    }
    else throw new Error("No definition for field" + defProperty);
  }

  const defData: T.ColumnDefAndData = {
    columnName: defProperty,
    def: {...def, group: "normal", columnName: defProperty},
    data: data,
    cssClasses: []
  }

    return (
      <>
        {warning && <IonItem color="warning">{warning.message}</IonItem>}
        {isPropertyFixed(defProperty)
          ? <IonItem color="medium"> 
              <IonLabel position="stacked"> {def?.displayName || defProperty } {fieldError?.message} </IonLabel>
              <DataRenderer defData={defData} />
              <IonNote className={characterStyles.helperNote} slot="end"><HelpPopup>{def.hintText + " (Cannot modify this field for this special built-in column)"}</HelpPopup></IonNote>
            </IonItem>
          : <ColumnDataEditWrapper defData={defData} editSingleColumn={editSingleProperty as (columnName: string, newData?: T.ColumnData) => void} fieldError={fieldError} />
        }
      </>
    );
}

export default DefEditModal;
