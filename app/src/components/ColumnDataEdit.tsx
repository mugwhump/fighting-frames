import { IonInput, IonTextarea, IonItem, IonButton, IonLabel } from '@ionic/react';
import React, { useState, useEffect } from 'react';
import { Move, ColumnDef, ColumnData, DataType, DataValueTypes } from '../types/characterTypes';


type ColumnDataEditProps  = {
  //show: boolean;
  colData: ColumnData | null; //if null, data was deleted or not entered yet despite this column having a definition
  colDef: ColumnDef;
  //TODO: show old data + "deleting this" marker? Revert/restore/delete buttons, which require changes? Or put that in modal?
  editSingleColumn: (newData: ColumnData, oldData: ColumnData | null) => void; //to return edited column data, called repeatedly as data is edited
}

const ColumnDataEdit: React.FC<ColumnDataEditProps> = ({colData, colDef, editSingleColumn}) => {
  const [inputData, setInputData] = useState<DataValueTypes | null>(colData?.data || null);
  if(colData === null && colDef === null) return (<span>Data and definition can't both be null</span>);
  let inputType: "number" | "text" = "text"; //ionic allows more possible types
  let isTextArea: boolean = false;
  const debounceTime: number = 500; //number of MS after keystroke to wait before triggering input change event. 


  interface InputChangeEventDetail {
    value: string | undefined | null;
  }
  //function dataChanged(e: CustomEvent<InputChangeEventDetail>) {
  function dataChanged(value: DataValueTypes) {
    console.log("Column data changed to " + value);
    //let value: DataValueTypes;
    //const value: number = parseInt(e?.detail?.value ?? '0');
    //switch(colDef.dataType) {
    const newData = {columnName: colDef.columnName, data: value} as ColumnData;
    editSingleColumn(newData, colData);
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

  return (
    <IonInput value={inputData} type={inputType} debounce={debounceTime} onIonChange={(e) => {dataChanged(e.detail.value!)}}></IonInput>
  );
}

export default ColumnDataEdit;
