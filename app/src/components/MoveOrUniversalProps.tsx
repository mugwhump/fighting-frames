import { useIonModal, IonRow, IonCol, IonItem, IonIcon } from '@ionic/react';
import React, { useState, useEffect } from 'react';
import { createOutline } from 'ionicons/icons';
import { Move, MoveOrProps, isMove, MoveConflicts, MoveChanges, ColumnData, ColumnDef, ColumnDefAndData } from '../types/characterTypes';
import { getChangedCols } from '../services/merging';
import MoveEditModal from './MoveEditModal';


// All db data in this component is props, state should only be used for UI stuff
type MoveProps = {
  moveOrProps: MoveOrProps;
  columnDefs: ColumnDef[]; //definitions for moves or universal props
  editMove?: (moveChanges: MoveChanges) => void; //to return edited move, only passed in edit mode. 
  moveChanges?: Readonly<MoveChanges>; //if not provided, move hasn't been changed
  moveConflicts?: MoveConflicts; //if not provided, no conflicts. There can only be conflicts if there are changes.
}

//TODO: hiding columns, based on user prefs?
const MoveOrUniversalProps: React.FC<MoveProps> = ({moveOrProps, columnDefs, editMove, moveChanges, moveConflicts}) => {
  const moveName = isMove(moveOrProps) ? moveOrProps.moveName : "universalProperties";
  const displayName = isMove(moveOrProps) ? moveOrProps.moveName : "Universal Properties";
  //const [columns, setColumns] = useState<ColumnData[]>(getColumns()); //relevant columns with any changes applied. Do not mutate.
  const [defsAndData, setDefsAndData] = useState<ColumnDefAndData[]>(getDefsAndData); //relevant columns with any changes applied. Do not mutate. 
  const [presentEditModal, dismissEditModal] = useIonModal(MoveEditModal, {
    moveName,
    defsAndData,
    moveChanges,
    editMove,
    onDismiss: handleDismiss,
  });

  // Returns definition/data pairs ordered by provided defs. Data with no definition goes at end with display set to false.
  function getDefsAndData(): ColumnDefAndData[] {
    if(moveName === "AA") console.log("called getDefsAndData() for move " + moveName);
    let result: ColumnDefAndData[] = [];
    let clonedCols = getChangedClonedColumns(); //a copy, delete items and add them to result as defAndData
    //const isDeleted = clonedCols.length === 0; //TODO: EditCharacter needs to know this to delete the whole move so not a stub... it'll do it's own comparisons though...

    for(const def of columnDefs) {
      let defData = { def: def, display: def.defaultShow } as ColumnDefAndData;
      const index: number = clonedCols.findIndex((col) => col.columnName === def.columnName);
      defData.data = (index !== -1) ? clonedCols.splice(index, 1)[0] : null; //remove found column from clonedCols, or set to null if nothing found
      result.push(defData);
    }
    //Now add any orphan columns with no definitions, setting display to false
    for(const data of clonedCols) {
      result.push({ def: null, data: data, display: false } as ColumnDefAndData);
    }

    return result;
  }

  // Grabs columns from Move or UniversalProp. If there's changes, applies them. Returns new array (shallow copy)
  function getChangedClonedColumns(): ColumnData[] {
    let cols: ColumnData[] = isMove(moveOrProps) ? moveOrProps.columnProps : moveOrProps;
    if(editMove && moveChanges) {
      cols = getChangedCols(cols, moveChanges);
    }
    else {
      cols = [...cols];
    }
    return cols;
  }

  useEffect(() => {
    setDefsAndData(getDefsAndData()); //TODO: could be an expensive calculation, consider some memoization later on if problematic
  }, [moveOrProps, columnDefs, editMove, moveChanges]);

  function handleDismiss() {
    dismissEditModal();
  }

  function startEditing() {
    if(!editMove) return;
    presentEditModal();
  }

  let editIndicator = editMove ?
    //<IonIcon slot="start" md={createOutline} />
    <IonIcon md={createOutline} color="black" />
  : '';

  function defDataColName(defData: ColumnDefAndData): string {
    return defData.def?.columnName ?? "No definition " + defData.data!.columnName;
  }

  interface DataProps {defData: ColumnDefAndData};
  function DataJSX({defData}: DataProps) {
    const name: string = defDataColName(defData);
    const data = defData?.data?.data ?? "";

    if(isMove(moveOrProps)) {
      return ( 
        <IonCol>
          {name}
          =
          {data} 
        </IonCol>
      );
    } else {
      return (
        <>
        <IonRow>{name}</IonRow> 
        <IonRow>{data}</IonRow> 
        </>
      );
    }
  }

  return (
    <>
    {isMove(moveOrProps) ?
      <IonRow onClick={startEditing}>
        <IonCol>{editIndicator} {displayName}</IonCol>
        {defsAndData.map((defData: ColumnDefAndData) => (
          <DataJSX defData={defData} key={defDataColName(defData)} />
        ))}
      </IonRow>
      :
      <>
      <IonRow onClick={startEditing}>{editIndicator} {displayName}</IonRow>
        {defsAndData.map((defData: ColumnDefAndData) => (
          <DataJSX defData={defData} key={defDataColName(defData)} />
        ))}
      </>
    }

    </>
  );
}

export default MoveOrUniversalProps;
