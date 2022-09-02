import { useIonModal, IonRow, IonCol, IonItem, IonIcon } from '@ionic/react';
import React, { useState, useEffect } from 'react';
import { createOutline } from 'ionicons/icons';
import { MoveCols, PropCols, Cols, Conflicts, Changes, MoveChanges, PropChanges, ColumnData, MoveData, DataType, ColumnDef, ColumnDefs, ColumnDefAndData } from '../types/characterTypes';
import { keys, keyVals, getDefsAndData } from '../services/util';
import { getChangedCols } from '../services/merging';
import { useCharacterDispatch } from '../services/CharacterReducer';
import MoveEditModal from './MoveEditModal';


// All db data in this component is props, state should only be used for UI stuff
export type MoveProps = {
  moveName: string;
  indentLevel?: number;
  columns: Cols | undefined;
  columnDefs: ColumnDefs; //definitions for moves or universal props
  editMove: boolean;
  //editMove?: (moveName: string, changes: Changes | null, isDeletion?: boolean) => void; //to return edited move, only passed in edit mode. 
  changes?: Readonly<Changes>; //if not provided, move hasn't been changed
  moveConflicts?: Conflicts; //if not provided, no conflicts. There can only be conflicts if there are changes.
}

const MoveOrUniversalProps: React.FC<MoveProps> = ({moveName, indentLevel=0, columns, columnDefs, editMove, changes, moveConflicts}) => {
  const isMove: boolean = moveName !== "universalProps";
  const displayName = isMove ? moveName : "Universal Properties";
  const [defsAndData, setDefsAndData] = useState<ColumnDefAndData[]>(getDefsAndData(columnDefs, columns, changes)); //relevant columns with any changes applied. Do not mutate. 
  const characterDispatch = useCharacterDispatch();
  //const [presentEditModal, dismissEditModal] = useIonModal(MoveEditModal, {
    //moveName,
    //defsAndData,
    //originalChanges: changes || null,
    //editMove,
    //onDismiss: handleDismiss,
  //});

  useEffect(() => {
    setDefsAndData(getDefsAndData(columnDefs, columns, changes)); 
  }, [columns, columnDefs, editMove, changes]);

  //function handleDismiss() {
    //dismissEditModal();
  //}

  function startEditing() {
    if(!editMove) return;
    //presentEditModal();
    characterDispatch({actionType: 'openMoveEditModal', moveName: moveName});
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
            <DataJSX defData={defData} isMove={true} key={defData.columnName} />
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
            <DataJSX defData={defData} isMove={false} key={defData.columnName} />
          );
        })}
      </>
    }

    </>
  );
}


interface DataProps {defData: ColumnDefAndData, isMove: boolean};
function DataJSX({defData, isMove}: DataProps) {
  const columnName: string = defData.columnName;
  const data = defData?.data ?? "";

  //TODO: generic code for cols that shouldn't be displayed
  if(isMove) {
    if(columnName === "moveName") return null;
    else return ( 
      <IonCol>
        {columnName}
        =
        {data} 
      </IonCol>
    );
  } else if(columnName !== 'moveOrder') { 
    return (
      <>
      <IonRow>{columnName}</IonRow> 
      <IonRow>{data}</IonRow> 
      </>
    );
  }
  else return (null);
}

export default MoveOrUniversalProps;
