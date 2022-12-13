import { IonInput, IonTextarea, IonItem, IonButton, IonLabel } from '@ionic/react';
import React, { useState, useEffect } from 'react';
import MoveOrdererButton from './MoveOrdererButton';
import { ColumnDef, ColumnData, DataType, MoveOrder } from '../types/characterTypes';
import { isMoveOrder, isList, strToColData } from '../services/columnUtil';


type ColumnDataEditProps  = {
  //show: boolean;
  columnName: string;
  colDef: ColumnDef;
  colData?: ColumnData; //if missing, data was deleted or not entered yet despite this column having a definition
  //TODO: show old data + "deleting this" marker? Revert/restore/delete buttons, which require changes? Or put that in modal?
  editSingleColumn: (columnName: string, newData?: ColumnData) => void; //to return edited column data, called repeatedly as data is edited. Undefined for "empty" data.
}

const ColumnDataEdit: React.FC<ColumnDataEditProps> = ({columnName, colData, colDef, editSingleColumn}) => {
  const [inputData, setInputData] = useState<ColumnData | undefined>(colData || undefined); //only moveOrder gets updated
  //if(colData === null && colDef === null) return (<span>Data and definition can't both be null</span>);
  let inputType: "number" | "text" = "text"; //ionic allows more possible types
  let isTextArea: boolean = false;
  const debounceTime: number = 20; //500; //number of MS after keystroke to wait before triggering input change event. If users submit too quick changes are ignored.

  interface InputChangeEventDetail {
    value: string | undefined | null;
  }
  //function dataChanged(e: CustomEvent<InputChangeEventDetail>) {
  function dataChanged(value: string) {
    console.log("Column data changed to " + value);
    //TODO: make sure any arrays have been deep cloned
    const newData = strToColData(value, colDef.dataType);

    //this causes a re-render when newData is a number, but not when a string. Some strict mode thing? Doesn't seem to cause problems...
    //Needed to show changed vals when model reopened.
    setInputData(newData); 
    editSingleColumn(columnName, newData);
  }
  function moveOrderChanged(moveOrder: MoveOrder[]) {
    editSingleColumn('moveOrder', moveOrder);
    setInputData(moveOrder);
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
    //case DataType.Txt: 
    case DataType.Str: {
      inputType = "text";
      //return (
        //<IonInput value={inputData} type="text" onIonChange={(e) => {let v = e?.detail?.value ?? ''; dataChanged(v)}}></IonInput>
      //);
      break;
    }
    case DataType.Ord: {
      break;
    }
    case DataType.List: {
      break;
    }
    default: {
      throw new Error("Unknown DataType: "+colDef.dataType);
    }
  }
  // special handling of arrays
  if(inputData && isMoveOrder(inputData, colDef.dataType)) {
    return <MoveOrdererButton moveOrder={inputData} changeMoveOrder={moveOrderChanged} />
  }
  else if(inputData && isList(inputData, colDef.dataType)) {
    return <span>List editing not yet implemented</span>
  }
  return (
    <IonInput value={inputData} type={inputType} debounce={debounceTime} onIonChange={(e) => {dataChanged(e.detail.value!)}}></IonInput>
  );
}

export default ColumnDataEdit;
