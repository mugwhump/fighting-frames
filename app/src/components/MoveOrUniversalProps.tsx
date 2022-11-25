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
  moveConflictsToHighlight?: Conflicts; //also indicates that clicking this row opens conflict modal
}

const MoveOrUniversalProps: React.FC<MoveProps> = ({moveName, indentLevel=0, columns, columnDefs, editMove, changes, moveConflictsToHighlight}) => {
  const isMove: boolean = moveName !== "universalProps";
  const [defsAndData, setDefsAndData] = useState<ColumnDefAndData[]>(getDefsAndData(columnDefs, columns, changes, moveConflictsToHighlight)); //columns with any changes applied. Don't mutate. 
  const hasUnresolvedConflicts: boolean = useMemo<boolean>(() => moveConflictsToHighlight ? unresolvedConflictInMove(moveConflictsToHighlight) : false, [moveConflictsToHighlight]);
  const characterDispatch = useCharacterDispatch();
  const displayName = defsAndData.find((dataDef) => dataDef.columnName === "displayName")?.data as string;
  const nameToShow: string = isMove ? (displayName || moveName) : "Universal Properties";
  const moveNameClassString = defsAndData.find((dataDef) => dataDef.columnName === "moveName")?.cssClasses?.join(" "); //TODO: add manually instead of via getDefsAndData?
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

  let indentSpacers = [];
  for(let i=1; i <=indentLevel; i++) {
    let key="spacer-"+i;
    if(i === indentLevel) {
      indentSpacers.push(<span key={key}>↳</span>);
    }
    else {
      indentSpacers.push(<span key={key} style={{display: "inline-block",width: "var(--indent-spacer-width)"}}></span>);
      //indentSpacers.push(<IonCol key={key}><div style={{width: "var(--indent-spacer-width)"}}></div></IonCol>);
    }
  }
  //let moveNameSwiper = null;
  //if(moveNameConflict) {
    ////const defData: ColumnDefAndData = {columnName: "moveName", def: moveNameColumnDef, data: moveName, cssClasses: [styles.unresolved]};
    //let moveNameDefData = defsAndData.find((i) => i.columnName === "moveName");
    //if(!moveNameDefData) throw new Error("Conflict for moveName but not present in defsAndData");
    //moveNameSwiper = <ConflictSwiper moveName={moveName} defData={moveNameDefData} conflict={moveNameConflict} />
  //}
  
  let currentGroup: ColumnDef['group'] | null = null; //start as null
  let allGroups = [];
  let currentGroupArray = [];
  for(let i = 0; i < defsAndData.length; i++) {
    const defData: ColumnDefAndData = defsAndData[i];
    const thisGroup = defData?.def?.group || "no-definition";
    if(currentGroup !== thisGroup) { //if first item of new group
      if(currentGroup !== null) { //if finished with group and starting new one
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
    currentGroupArray.push(
      <DataJSX defData={defData} moveName={moveName} conflict={con} skipSwiper={!!moveNameConflict && defData.columnName !== "moveName"} key={defData.columnName} />
    )
  }
  allGroups.push(
    <IonCol key={currentGroup} size="12">
      <IonRow>{currentGroupArray}</IonRow>
    </IonCol>
  );
  return(
      <IonRow class="ion-justify-content-center" onClick={startEditing} key={moveName} className={moveNameClassString}>
        {allGroups}
      </IonRow>
  )

  //return (
    //<>
      //<IonRow class="ion-justify-content-center" onClick={startEditing}>
        //{defsAndData.map((defData: ColumnDefAndData) => {
          ////if(currentGroup !== defData?.def?.group) {
            ////if(currentGroup != null)
          ////}
          //const con = moveConflictsToHighlight?.[defData.columnName];
          //return (
            //<DataJSX defData={defData} moveName={moveName} conflict={con} skipSwiper={!!moveNameConflict && defData.columnName !== "moveName"} key={defData.columnName} />
          //);
        //})}
      //</IonRow>

    //</>
  //);

  //return (
    //<>
    //{isMove ?
      //<IonRow onClick={startEditing}>
        //{moveNameSwiper}
        //<IonCol className={moveNameClassString}>{editIndicator} {indentSpacers} {nameToShow}</IonCol>
        //{defsAndData.map((defData: ColumnDefAndData) => {
          //const con = moveConflictsToHighlight?.[defData.columnName];
          //return (
            //<DataJSX defData={defData} isMove={true} moveName={moveName} conflict={con} skipSwiper={!!moveNameConflict} key={defData.columnName} />
          //);
        //})}
      //</IonRow>
      //:
      //<>
      //<IonRow onClick={startEditing}>{editIndicator} {nameToShow}</IonRow>
        //{defsAndData.map((defData: ColumnDefAndData) => {
          //if(defData.def?.dataType === DataType.Ord) {
            //if(moveConflictsToHighlight?.moveOrder) {
              //return <ConflictSwiper moveName={moveName} defData={defData} conflict={moveConflictsToHighlight.moveOrder} key="moveOrder" />
            //}
            ////TODO: swiping conflicts can change/unchange moveOrder, might be better not to display this while conflicts being resolved
            ////but I can't know if conflicts are being resolved without another prop being passed...
            //else if(changes?.moveOrder) {
              //return <IonRow className={styles.modifyChange} key="moveOrder"><IonCol>Move Order has been modified</IonCol></IonRow> 
            //}
            //else return null;
          //}
          //return (
            //<DataJSX defData={defData} isMove={false} moveName={moveName} conflict={moveConflictsToHighlight?.[defData.columnName]} key={defData.columnName} />
          //);
        //})}
      //</>
    //}

    //</>
  //);
}


interface DataProps {defData: ColumnDefAndData, moveName: string, conflict?: Conflict, skipSwiper?: boolean};
function DataJSX({defData, moveName, conflict, skipSwiper}: DataProps) {
  const columnName: string = defData.columnName;
  const cssClasses = (conflict && !skipSwiper) ? "" : defData.cssClasses.join(" "); //swiper applies classes on its own
  //if(columnName === "displayName" && !defData.data && !conflict) defData = {...defData, data: moveName};
  let conflictChooserOrData = (conflict && !skipSwiper) ? <ConflictSwiper defData={defData} moveName={moveName} conflict={conflict} /> : <DataRenderer defData={defData} />
  const sizeProps = defData?.def?.widths;

  if(columnName === "moveName" && !conflict) {
    return null;
  }
  else if(columnName === "moveOrder" && !conflict) {
    //TODO: "moveOrder has been changed" notification?
    return null;
  }
  else if(columnName === "displayName") {
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

    //let header = (defData?.def?.group === "needsHeader") ? <div class="ion-hide" className={styles.standaloneHeader}>{defData?.def?.shortName || defData?.def?.displayName || columnName}</div>: null;
    return ( 
      <IonCol className={cssClasses} {...sizeProps}>
        {(defData?.def?.group === "needsHeader") && 
          <div className={styles.standaloneHeader + ' ' + (defData.def?._calculatedMoveHeaderHideClass  || '')}>{defData?.def?.shortName || defData?.def?.displayName || columnName}</div>
        }
        {conflictChooserOrData} 
      </IonCol>
    );
  }
}

export default MoveOrUniversalProps;
