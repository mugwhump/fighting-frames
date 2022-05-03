import { IonInput, IonTextarea, IonItem, IonButton, IonLabel } from '@ionic/react';
import React, { useState, useEffect } from 'react';
import { ColumnDef, ColumnData, DataType } from '../types/characterTypes';
import { isMoveOrder, strToColData } from '../services/util';


type ColumnDataEditProps  = {
  //show: boolean;
  columnName: string;
  colDef: ColumnDef;
  colData?: ColumnData; //if missing, data was deleted or not entered yet despite this column having a definition
  //TODO: show old data + "deleting this" marker? Revert/restore/delete buttons, which require changes? Or put that in modal?
  editSingleColumn: (columnName: string, newData?: ColumnData) => void; //to return edited column data, called repeatedly as data is edited. Undefined for "empty" data.
}

const ColumnDataEdit: React.FC<ColumnDataEditProps> = ({columnName, colData, colDef, editSingleColumn}) => {
  const [inputData, setInputData] = useState<ColumnData | null>(colData || null);
  //if(colData === null && colDef === null) return (<span>Data and definition can't both be null</span>);
  let inputType: "number" | "text" = "text"; //ionic allows more possible types
  let isTextArea: boolean = false;
  const debounceTime: number = 500; //number of MS after keystroke to wait before triggering input change event. 

  interface InputChangeEventDetail {
    value: string | undefined | null;
  }
  //function dataChanged(e: CustomEvent<InputChangeEventDetail>) {
  function dataChanged(value: string) {
    //console.log("Column data changed to " + value);
    //TODO: make sure any arrays have been deep cloned
    editSingleColumn(columnName, strToColData(value, colDef.dataType));
  }

  function resetChanges(): void {
    //TODO: button will reset this col's changes
    throw new Error("Not implemented");
  }

  switch (colDef.dataType) {
    case DataType.Int: 
    case DataType.Num: {
      inputType = "number";
      //return (
        //<IonInput value={inputData} type="number" onIonChange={(e) => {let v = e.detail.value ?? 0; dataChanged(v)}}></IonInput>
      //);
      break;
    }
    case DataType.Txt: 
    case DataType.Str: {
      inputType = "text";
      //return (
        //<IonInput value={inputData} type="text" onIonChange={(e) => {let v = e?.detail?.value ?? ''; dataChanged(v)}}></IonInput>
      //);
      break;
    }
    default: {
      throw new Error("Unknown DataType: "+colDef.dataType);
    }
  }
  // special handling of arrays
  if(inputData && isMoveOrder(inputData)) {
    return <div>Move Order: {JSON.stringify(inputData)}</div> 
  }
  return (
    <IonInput value={inputData} type={inputType} debounce={debounceTime} onIonChange={(e) => {dataChanged(e.detail.value!)}}></IonInput>
  );
}

export default ColumnDataEdit;
