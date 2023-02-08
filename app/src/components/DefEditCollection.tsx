import { IonRow, IonCol } from '@ionic/react';
import React, { } from 'react';
import * as T from '../types/characterTypes';
import { keys, keyVals } from '../services/util';
import { getWidthAtBP } from '../services/columnUtil';
import { calculateHideBreakpoints, } from '../services/renderUtil';
import { groupDescriptions, specialDefs } from '../constants/internalColumns';
import { cloneDeep, groupBy, set } from 'lodash';
import ColumnHeaders from './ColumnHeaders';
import { DesignDocChanges, DefEditObj } from './DefEditor';
import { HelpPopup } from './HelpPopup';
import characterStyles from '../theme/Character.module.css';
import styles from '../theme/DefEditor.module.css';

type DefEditCollection = {
  doc: T.DesignDoc,
  docChanges: DesignDocChanges,
  isUniversalProps: boolean,
  previewBreakpoint?: T.Breakpoint,
  itemClicked: (editObj: DefEditObj) => void,
}
// Collection of definitions for either universal props or move columns, which are forced to preview at the given screen size
// Does not display columns marked as deleted
const DefEditCollection: React.FC<DefEditCollection> = ({doc, docChanges, isUniversalProps, itemClicked, previewBreakpoint}) => {
  const path = isUniversalProps ? "universalPropDefs" : "columnDefs";
  const order: string[] = docChanges.changedOrders?.[path] || keys(doc[path]);
  console.log(order);
  const mergedDefs: T.ColumnDefs = {};
  const deletedDefsArray: T.ColumnDef[] = [];

  for(const key of order) {
    let def = docChanges?.[path]?.[key] || doc[path][key];
    //Want deleted defs yoinked out when calculating widths and rendered at the end
    if(!docChanges?.deletedDefs?.[path]?.includes(key)) {
      mergedDefs[key] = cloneDeep<T.ColumnDef>(def!);
    }
    else {
      deletedDefsArray.push(def!);
    }
  }
  if(!isUniversalProps) {
    calculateHideBreakpoints(mergedDefs, previewBreakpoint);
    //TODO: display warning if in needsHeader group and first cols don't sum to 12
  }

  let allGroups = [];
  
  let groupedDefs = groupBy(mergedDefs, (def) => (def && docChanges?.deletedDefs?.[path]?.includes(def.columnName)) ? 'deleted' : def?.group ?? 'no-group');
  if(deletedDefsArray.length > 0) set(groupedDefs, 'deleted', deletedDefsArray); //put deleted at the end
  const mandatoryKeys: Readonly<string[]> | undefined = keys(specialDefs.mandatory[path]); 
  
  for(const [groupKey, defs] of keyVals(groupedDefs)) {
    if(!defs) continue;

    let groupItems = defs.map((def) => {
      if(!def) return null;

      // Mandatory defs are not considered to have been added
      const isMandatory: boolean = mandatoryKeys.includes(def.columnName); 
      let editObj: DefEditObj = {defName: def.columnName, isUniversalProp: isUniversalProps, propOrColPath: path, 
        wasAdded: !doc[path][def.columnName] && !isMandatory, wasDeleted: groupKey === 'deleted', isMandatory: isMandatory};
      let sizeProps: {size: string | undefined} | T.ColumnDefStyling['widths'] | undefined =  
        groupKey === "deleted" ? {size: '12'} : //deleted defs get full row
          previewBreakpoint 
            ? {size: getWidthAtBP(previewBreakpoint, def.widths)?.toString()} 
            : def.widths;
      let classes = [styles.columnDefItem];
      if(editObj.isMandatory) classes.push(styles.mandatory);
      else if(editObj.wasAdded) classes.push(styles.add);
      else if(editObj.wasDeleted) classes.push(styles.delete);
      let key = def.columnName;

      return ( //must put bp in key so ionic recalculates style when sizes change
      <IonCol key={key + previewBreakpoint} {...sizeProps} className={classes.join(' ')} onClick={() => itemClicked(editObj)}>
        {(def.group === "needsHeader" || def.group === "defaultHideNeedsHeader") && 
          <div className={characterStyles.standaloneHeaderCol + ' ' + (def._calculatedMoveHeaderHideClass  || '')}>{def.shortName || def.displayName || def.columnName}</div>
        }
        {def.displayName ?? def.columnName}
      </IonCol> )
    });

    let headerRow = (groupKey === "needsHeader" && !isUniversalProps) 
      ? <ColumnHeaders columnDefs={mergedDefs} previewingSpecificWidth={previewBreakpoint} /> 
      : null;
    const title = groupDescriptions[groupKey as keyof typeof groupDescriptions]?.title ?? groupKey;
    const desc = groupDescriptions[groupKey as keyof typeof groupDescriptions]?.desc ?? null;
    allGroups.push(
      <IonCol key={groupKey} size="12">
        <div className={styles.columnGroup}>
          <IonRow className={styles.columnGroupTitleRow}>
            <span>{groupKey === "deleted" ? "Deleted columns (click to restore)" : "Column Group: "+title}</span>
            {desc && <HelpPopup>{desc}</HelpPopup>}
          </IonRow>
          {headerRow}
          <IonRow>{groupItems}</IonRow>
        </div>
      </IonCol>
    )
  }

  return <>{allGroups}</>;
/*
  for(const key of keys(mergedDefs)) {
    const def = mergedDefs[key];
    if(!def) throw new Error("Cannot find definition for "+key+" among available definitions: "+JSON.stringify(mergedDefs));
    const thisGroup = def.group;
    if(currentGroup !== thisGroup) { //if first item of new group
      if(currentGroup !== null) { //if finished with group and starting new one
        let headerRow = null;
        //if new group is needsHeader, insert the headerColumns here. 
        if(currentGroup === "needsHeader" && !isUniversalProps) {
          headerRow = (
            <ColumnHeaders columnDefs={mergedDefs} previewingSpecificWidth={previewBreakpoint} />
          );
        }
        allGroups.push(
          <IonCol key={currentGroup} size="12">
            <IonRow>Column Group: {currentGroup}</IonRow>
            {headerRow}
            <IonRow>{currentGroupArray}</IonRow>
          </IonCol>
        );
        currentGroupArray = [];
      }
      currentGroup = thisGroup;
    }

    let editObj: DefEditObj = {defName: key, isUniversalProp: isUniversalProps, propOrColPath: path, wasAdded: false, wasDeleted: false};
    editObj.wasAdded = !doc[path];
    //editObj.wasDeleted = !!docChanges.deletedDefs?.[path]?.find((x) => x === key);
    let classes = [styles.defWidthPreview];
    if(editObj.wasAdded) classes.push(styles.add);
    //if(editObj.wasDeleted) classes.push(styles.delete);

    let sizeProps: {size: string | undefined} | T.ColumnDefStyling['widths'] | undefined = previewBreakpoint ? {size: getWidthAtBP(previewBreakpoint, def.widths)?.toString()} : def.widths;

    currentGroupArray.push( //must put bp in key so ionic recalculates style when sizes change
      <IonCol key={key + previewBreakpoint} {...sizeProps} className={classes.join(' ')} onClick={() => itemClicked(editObj)}>
        {(def.group === "needsHeader" || def.group === "defaultHideNeedsHeader") && 
          <div className={characterStyles.standaloneHeaderCol + ' ' + (def._calculatedMoveHeaderHideClass  || '')}>{def.shortName || def.displayName || def.columnName}</div>
        }
        {key}
      </IonCol>
    )
  }
  allGroups.push( //push the final group TODO: what if the final group is needsHeader? This is kinda whack...
    <IonCol key={currentGroup} size="12">
      <IonRow>Column Group: {currentGroup}</IonRow>
      <IonRow>{currentGroupArray}</IonRow>
    </IonCol>
  );
  return <>{allGroups}</>
  */
}

export default DefEditCollection;
