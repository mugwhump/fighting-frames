import { useIonModal, IonRow, IonCol, IonItem, IonIcon } from '@ionic/react';
import React, { useState, useEffect } from 'react';
import { createOutline } from 'ionicons/icons';
import { MoveCols, PropCols, Cols, Conflicts, Changes, MoveChanges, PropChanges, ColumnData, MoveData, DataType, ColumnDef, ColumnDefs, ColumnDefAndData } from '../types/characterTypes';
import { keys, keyVals } from '../services/util';
import { getChangedCols } from '../services/merging';
import MoveEditModal from './MoveEditModal';


// All db data in this component is props, state should only be used for UI stuff
export type MoveProps = {
  moveName: string;
  indentLevel?: number;
  columns: Cols | undefined;
  columnDefs: ColumnDefs; //definitions for moves or universal props
  editMove?: (moveName: string, changes: Changes | null, isDeletion?: boolean) => void; //to return edited move, only passed in edit mode. 
  changes?: Readonly<Changes>; //if not provided, move hasn't been changed
  moveConflicts?: Conflicts; //if not provided, no conflicts. There can only be conflicts if there are changes.
}

//TODO: hiding/reordering columns, based on user prefs? Reordering complex, awkward for mobile.
const MoveOrUniversalProps: React.FC<MoveProps> = ({moveName, indentLevel=0, columns, columnDefs, editMove, changes, moveConflicts}) => {
  const isMove: boolean = moveName !== "universalProps";
  const displayName = isMove ? moveName : "Universal Properties";
  const [defsAndData, setDefsAndData] = useState<ColumnDefAndData[]>(getDefsAndData); //relevant columns with any changes applied. Do not mutate. 
  const [presentEditModal, dismissEditModal] = useIonModal(MoveEditModal, {
    moveName,
    defsAndData,
    originalChanges: changes || null,
    editMove,
    onDismiss: handleDismiss,
  });

  // Returns definition/data pairs ordered by provided defs. Data with no definition goes at end with display set to false.
  function getDefsAndData(): ColumnDefAndData[] {
    let result: ColumnDefAndData[] = [];
    if(!columns && !changes) throw new Error("Columns and changes cannot both be null/undefined");
    let changedCols: Cols = getChangedCols(columns, changes);
    let t: string[] = keys(columnDefs);
    let keyUnion: Set<string> = new Set(keys(columnDefs).concat(keys(changedCols)));
    //const isDeleted = clonedCols.length === 0; //TODO: EditCharacter needs to know this to delete the whole move so not a stub... it'll do it's own comparisons though...

    for(const key of keyUnion) {
      let def: ColumnDef | undefined = columnDefs[key];
      let data: ColumnData | undefined = changedCols[key];
      let defData: ColumnDefAndData = {columnName: key, def: def, data: data, display: def?.defaultShow || false};
      result.push(defData);
    }

    return result;
  }

  useEffect(() => {
    setDefsAndData(getDefsAndData()); //TODO: could be an expensive calculation, consider some memoization later on if problematic
  }, [columns, columnDefs, editMove, changes]);

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

  let indentSpacers = [];
  for(let i=1; i<=indentLevel; i++) {
    let key="spacer-"+i;
    if(i === indentLevel) {
      indentSpacers.push(<span key={key}>↳</span>);
    }
    else {
      indentSpacers.push(<span key={key} style={{display: "inline-block",width: "var(--indent-spacer-width)"}}></span>);
      //indentSpacers.push(<IonCol key={key}><div style={{width: "var(--indent-spacer-width)"}}></div></IonCol>);
    }
  }
  return (
    <>
    {isMove ?
      <IonRow onClick={startEditing}>
        <IonCol>{editIndicator} {indentSpacers} {displayName}</IonCol>
        {defsAndData.map((defData: ColumnDefAndData) => {
          return (
            <DataJSX defData={defData} key={defData.columnName} />
          );
        })}
      </IonRow>
      :
      <>
      <IonRow onClick={startEditing}>{editIndicator} {displayName}</IonRow>
        {defsAndData.map((defData: ColumnDefAndData) => {
          if(defData.def?.dataType === DataType.Ord) {
            return null;
          }
          return (
            <DataJSX defData={defData} key={defData.columnName} />
          );
        })}
      </>
    }

    </>
  );
}


interface DataProps {defData: ColumnDefAndData};
function DataJSX({defData}: DataProps) {
  const name: string = defData.columnName;
  const isMove: boolean = name !== "universalProps";
  const data = defData?.data ?? "";

  if(isMove) {
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

export default MoveOrUniversalProps;
