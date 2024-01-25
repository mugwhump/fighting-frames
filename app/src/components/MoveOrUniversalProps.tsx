import { useIonModal, IonRow, IonItemSliding, IonItemOptions, IonItemOption, IonCol, IonItem, IonIcon } from '@ionic/react';
import React, { useState, useEffect, useMemo } from 'react';
import { createOutline } from 'ionicons/icons';
import { MoveCols, PropCols, Cols, Conflicts, Conflict, Changes, MoveChanges, PropChanges, ColumnData, MoveData, DataType, ColumnDef, ColumnDefs, ColumnDefAndData } from '../types/characterTypes';
import { keys, keyVals, getNewFromChange, unresolvedConflictInMove } from '../services/util';
import { getDefsAndData } from '../services/renderUtil';
import { getChangedCols } from '../services/merging';
import { useCharacterDispatch } from '../services/CharacterReducer';
import { moveNameColumnDef } from '../constants/internalColumns';
import MoveEditModal from './MoveEditModal';
import ConflictSwiper from './ConflictSwiper';
import DataRenderer from './DataRenderer';
import styles from '../theme/Character.module.css';


// All db data in this component is props, state should only be used for UI stuff
export type MoveProps = {
  moveName: string;
  indentLevel?: number;
  columns: Cols | undefined;
  columnDefs: ColumnDefs; //definitions for moves or universal props
  editMove: boolean;
  changes?: Readonly<Changes>; //if not provided, move hasn't been changed
  moveConflictsToHighlight?: Conflicts; 
}

const MoveOrUniversalProps: React.FC<MoveProps> = ({moveName, indentLevel=0, columns, columnDefs, editMove, changes, moveConflictsToHighlight}) => {
  const isMove: boolean = moveName !== "universalProps";
  const [defsAndData, setDefsAndData] = useState<ColumnDefAndData[]>(getDefsAndData(columnDefs, columns, changes, moveConflictsToHighlight)); //columns with any changes applied. Don't mutate. 
  const hasUnresolvedConflicts: boolean = useMemo<boolean>(() => moveConflictsToHighlight ? unresolvedConflictInMove(moveConflictsToHighlight) : false, [moveConflictsToHighlight]);
  const characterDispatch = useCharacterDispatch();
  const displayName = defsAndData.find((dataDef) => dataDef.columnName === "displayName")?.data as string;
  const nameToShow: string = isMove ? (displayName || moveName) : "Universal Properties";
  const moveNameClassString = (isMove ? styles.move : styles.universalProps) + ' ' + defsAndData.find((dataDef) => dataDef.columnName === "moveName")?.cssClasses?.join(" "); //should add manually instead of via getDefsAndData?
  const moveNameConflict = moveConflictsToHighlight?.moveName;

  useEffect(() => {
    setDefsAndData(getDefsAndData(columnDefs, columns, changes, moveConflictsToHighlight)); 
  }, [columns, columnDefs, changes, moveConflictsToHighlight]);

  function startEditing() {
    if(!editMove) return;
    characterDispatch({actionType: 'openMoveEditModal', moveName: moveName});
  }

  let editIndicator = editMove ?
    //<IonIcon slot="start" md={createOutline} />
    <IonIcon md={createOutline} color="black" />
  : '';

  // TODO: unused. Title row could be shifted to show hierarchy?
  let indentSpacers = [];
  for(let i=1; i <=indentLevel; i++) {
    let key="spacer-"+i;
    if(i === indentLevel) {
      indentSpacers.push(<span key={key}>↳</span>);
    }
    else {
      indentSpacers.push(<span key={key} style={{display: "inline-block",width: "var(--indent-spacer-width)"}}></span>);
    }
  }
  
  //TODO: rewrite this using lodash groupBy()
  let currentGroup: ColumnDef['group'] | null = null; //start as null
  let allGroups = [];
  let currentGroupArray = [];
  for(let i = 0; i < defsAndData.length; i++) {
    const defData: ColumnDefAndData = defsAndData[i];
    const thisGroup = defData?.def?.group || "no-definition";
    //if first item of new group
    if(currentGroup !== thisGroup) { 
      //keep header/non-header cols on same row
      const shouldSwitchRows = !(currentGroup === "needsHeader" && thisGroup === "normal") && !(currentGroup === "defaultHideNeedsHeader" && thisGroup === "defaultHide");
      //if finished with group and starting new one. 
      if(currentGroup !== null && currentGroupArray.length > 0 && shouldSwitchRows) { 
        allGroups.push(
          <IonCol key={currentGroup} size="12">
            <IonRow>{currentGroupArray}</IonRow>
          </IonCol>
        );
        currentGroupArray = [];
      }
      currentGroup = thisGroup;
    }
    const con = moveConflictsToHighlight?.[defData.columnName];
    if(defData.def?.group === "meta" && !con){
      //moveName and moveOrder only render if conflict
    }
    else if(defData.def?.dontRenderEmpty && defData.data === undefined && !con && !changes?.[defData.columnName]) {
      //if dontRenderEmpty and no data or change or conflict, don't show it.
    }
    else { 
      currentGroupArray.push(
        <DataJSX defData={defData} moveName={moveName} conflict={con} skipSwiper={!!moveNameConflict && defData.columnName !== "moveName"} key={defData.columnName} />
      );
    }
  }

  if(currentGroupArray.length > 0) { 
    allGroups.push(
      <IonCol key={currentGroup} size="12">
        <IonRow>{currentGroupArray}</IonRow>
      </IonCol>
    );
  }
  // Need uprops edit text because if all columns are dontRenderEmpty there's nothing to click on
  return(
      <IonRow class="ion-justify-content-center" onClick={startEditing} key={moveName} className={moveNameClassString}>
        {(editMove && !isMove) && <IonItem>Click here to edit Universal Properties</IonItem>}
        {allGroups}
      </IonRow>
  )

}


interface DataProps {defData: ColumnDefAndData, moveName: string, conflict?: Conflict, skipSwiper?: boolean};
function DataJSX({defData, moveName, conflict, skipSwiper}: DataProps) {
  const columnName: string = defData.columnName;
  const cssClasses = (conflict && !skipSwiper) ? "" : defData.cssClasses.join(" "); //swiper applies classes on its own
  //if(columnName === "displayName" && !defData.data && !conflict) defData = {...defData, data: moveName};
  let conflictChooserOrData = (conflict && !skipSwiper) ? <ConflictSwiper defData={defData} moveName={moveName} conflict={conflict} /> : <DataRenderer defData={defData} />
  const sizeProps = defData?.def?.widths;

  //if(columnName === "moveName" && !conflict) {
    //return null;
  //}
  //else if(columnName === "moveOrder" && !conflict) {
    ////TODO: "moveOrder has been changed" notification?
    //return null;
  //}
  if(columnName === "displayName") {
    if(!defData.data && !conflict) {
      conflictChooserOrData = <DataRenderer defData={{...defData, data: moveName}} />;
    }
    let superText = (defData.data && !conflict) ? <div className={styles.moveNameSuperText}>{moveName}</div> : null;
    return (
      <IonCol className={cssClasses} {...sizeProps}>
        {superText}
        {conflictChooserOrData} 
      </IonCol>
    )
  }
  else {

    return ( 
      <IonCol className={cssClasses} {...sizeProps}>
        {(defData?.def?.group === "needsHeader" || defData?.def?.group === "defaultHideNeedsHeader") && 
          <div className={styles.standaloneHeaderCol + ' ' + (defData.def?._calculatedMoveHeaderHideClass  || '')}>{defData?.def?.shortName || defData?.def?.displayName || columnName}</div>
        }
        {conflictChooserOrData} 
      </IonCol>
    );
  }
}

export default MoveOrUniversalProps;
