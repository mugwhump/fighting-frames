import { IonRow, IonCol } from '@ionic/react';
import React, { } from 'react';
import * as T from '../types/characterTypes';
import { keys, keyVals } from '../services/util';
import { getWidthAtBP } from '../services/columnUtil';
import { calculateHideBreakpoints, } from '../services/renderUtil';
import { groupDescriptions, specialDefs, isMandatory as getIsMandatory } from '../constants/internalColumns';
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

  const rowInfo = {
    title: {title: 'Title', desc: `Topmost section. Contains name of ${isUniversalProps ? 'character' : 'move'}`},
    headerOrNormal: {title: 'Header / Normal', desc: `Section containing normal columns that may need a header. ${!isUniversalProps && 'A floating header row will appear if more than one column with defined widths fits on the first row.'} All columns in "Needs Header" group will get a header above them`},
    hiddenHeaderOrNormal: {title: 'Hidden by default', desc: `Section for columns that are hidden by default; users must click to expand. All columns in "Needs Header" group will get a header above them`},
    deleted: {title: 'Deleted Columns (Click to restore)', desc: null},
    'no-group': {title: 'Error: these columns are missing a definition or a group', desc: null}
  };
  
  //let defsGroupedByRow: {[row: string]: T.ColumnDef[]} = groupBy(mergedDefs, (def) => {
  let defsGroupedByRow = groupBy<T.ColumnDefs>(mergedDefs, (def) => {
    if(!def) return 'no-group';
    if(def.group === 'title') return 'title';
    if(def.group === 'needsHeader' || def.group === 'normal') return 'headerOrNormal';
    if(def.group === 'defaultHideNeedsHeader' || def.group === 'defaultHide') return 'hiddenHeaderOrNormal';
    if(docChanges?.deletedDefs?.[path]?.includes(def.columnName)) return 'deleted';
    return 'no-group';
  });

  let allGroups = [];
  if(deletedDefsArray.length > 0) set(defsGroupedByRow, 'deleted', deletedDefsArray); //put deleted at the end
  //const mandatoryKeys: Readonly<string[]> | undefined = keys(specialDefs.mandatory[path]); 
 
  for(const [rowKey, defs] of keyVals(defsGroupedByRow)) {
    if(!defs) continue;

    let groupItems = defs.map((def) => {
      if(!def) return null;

      // Mandatory defs are not considered to have been added
      const isMandatory: boolean = getIsMandatory(def.columnName, isUniversalProps); 
      let editObj: DefEditObj = {defName: def.columnName, isUniversalProp: isUniversalProps, propOrColPath: path, 
        wasAdded: !doc[path][def.columnName] && !isMandatory, wasDeleted: rowKey === 'deleted', isMandatory: isMandatory};
      let sizeProps: {size: string | undefined} | T.ColumnDefStyling['widths'] | undefined =  
        rowKey === "deleted" ? {size: '12'} : //deleted defs get full row
          previewBreakpoint 
            ? {size: getWidthAtBP(previewBreakpoint, def.widths)?.toString()} 
            : def.widths;

      let classes = [styles.columnDefItem];
      if(editObj.isMandatory) classes.push(styles.mandatory);
      else if(editObj.wasAdded) classes.push(styles.add);
      else if(editObj.wasDeleted) classes.push(styles.delete);

      return ( //must put bp in key so ionic recalculates style when sizes change
      <IonCol key={def.columnName + previewBreakpoint} {...sizeProps} className={classes.join(' ')} onClick={() => itemClicked(editObj)}>
        {(def.group === "needsHeader" || def.group === "defaultHideNeedsHeader") && 
          <div className={characterStyles.standaloneHeaderCol + ' ' + (def._calculatedMoveHeaderHideClass  || '')}>{def.shortName || def.displayName || def.columnName}</div>
        }
        {def.displayName ?? def.columnName}
      </IonCol> )
    });

    //TODO: deal with combined groups here
    let headerRow = (rowKey === "headerOrNormal" && !isUniversalProps) 
      ? <ColumnHeaders columnDefs={mergedDefs} previewingSpecificWidth={previewBreakpoint} /> 
      : null;
    const title = rowInfo[rowKey as keyof typeof rowInfo].title;
    const desc = rowInfo[rowKey as keyof typeof rowInfo].desc;
    allGroups.push(
      <IonCol key={rowKey} size="12">
        <div className={styles.columnGroup}>
          <IonRow className={styles.columnGroupTitleRow}>
            <span>{title}</span>
            {desc && <HelpPopup>{desc}</HelpPopup>}
          </IonRow>
          {headerRow}
          <IonRow>{groupItems}</IonRow>
        </div>
      </IonCol>
    )
  }

  return <>{allGroups}</>;
}

export default DefEditCollection;
