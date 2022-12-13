import type * as T from '../types/characterTypes'; //== 
import { BPList } from '../types/characterTypes';
import { getChangedCols, insertByNeighbor, addMissingMoves, applyMoveResolutions } from '../services/merging';
import * as util from './util';
import styles from '../theme/Character.module.css';

  // Returns definition/data pairs ordered by provided defs. Data with no definition goes at end with display set to false.
  // If columns and changes both empty (like for new move), returns just definitions, or conflicts' resolved changes
  // Applies css classes always, parent CSS determines if classes matter or not
export function getDefsAndData(columnDefs: T.ColumnDefs, columns?: T.Cols, changes?: Readonly<T.Changes>, conflicts?: Readonly<T.Conflicts>): T.ColumnDefAndData[] {
  let result: T.ColumnDefAndData[] = [];
  let changedCols: T.Cols = {};
  //let allColumnCSS: string[] = []; //for moveName conflicts where every column is the same
  let isMoveNameChange, isMoveNameConflict = false; //moveName changes/conflicts override change/conflict styling for other columns

  if(conflicts) {
    changes = applyMoveResolutions(conflicts, changes ?? null, false) || undefined;
    if(conflicts.moveName) {
      isMoveNameConflict = true;
    }
  }
  if(changes?.moveName) {
    isMoveNameChange = true;
  }

  if(columns || changes) changedCols = getChangedCols(columns, changes);
  let keyUnion: Set<string> = new Set(util.keys(columnDefs).concat(util.keys(changedCols))); //definition order determines returned order

  for(const key of keyUnion) {
    let def: T.ColumnDef | undefined = columnDefs[key];
    let data: T.ColumnData | undefined = changedCols[key];
    let classes: string[] = [];
    const change = changes?.[key];
    if (change && (key === "moveName" || !isMoveNameChange)) {
      if(change.type === "add") {
        classes.push(styles.addChange);
      } else if(change.type === "modify") {
        classes.push(styles.modifyChange);
      } else {
        classes.push(styles.deleteChange);
      }
    }
    // ConflictSwiper also uses these
    const conflict = conflicts?.[key];
    if(conflict && (key === "moveName" || !isMoveNameConflict)) {
      if(conflict.resolution === "yours") {
        classes.push(styles.resolvedYours);
      } else if(conflict.resolution === "theirs") {
        classes.push(styles.resolvedTheirs);
      } else {
        classes.push(styles.unresolved);
      }
    }
    //TODO: hiding classes based on def.group
    let defData: T.ColumnDefAndData = {columnName: key, def: def, data: data, cssClasses: classes || []};// || allColumnCSS};
    result.push(defData);
  }

  return result;
}

// True if bp1 >= bp2, like xl >= lg
export function bpGTE(bp1: T.Breakpoint, bp2: T.Breakpoint) {
  return BPList.indexOf(bp1) >= BPList.indexOf(bp2);
}

// Modifies defs to add _calculateHeaderHideBP and _calculatedTableHeaderHideClass when applicable
// If previewingSpecificWidth=md for example, then instead of responsive .ion-hide-md-up class, will just add .ion-hide if width is md or higher
export function calculateHideBreakpoints(defs: T.ColumnDefs, previewingSpecificWidth?: T.Breakpoint) {
  //xs [12] [24] [36]
  //sm [10] [20] [30]
  //md [08] [16] [24]
  //lg [06] [12] [18]
  //xl [04] [08] [12]
  // [hide-lg-down],[hide-lg-down],[hide-xl-down] <- header row
  // [hide-lg-up],[hide-lg-up],[hide-xl-up] <- move col headers
  // requires higher breakpoints to have <= sizes
  // Ionic's hide class is inclusive for up, non-inclusive for down. So .ion-hide-md-down doesn't hide at md breakpoint.
  let accumulatedSizes: Record<T.Breakpoint, number> =  {xs: 0, sm: 0, md: 0, lg: 0, xl: 0};
  let index = 0;
  let firstDef: T.ColumnDef | null = null;
  for(let [key, def] of util.keyVals(defs)) {
    if(!def || def.group !== "needsHeader" || !def.widths) continue;
    delete def._calculatedMoveHeaderHideClass; 
    delete def._calculatedTableHeaderHideClass;

    //loop through breakpoints from small to large to find the first one where this column fits in the header row
    let bp: T.Breakpoint;
    let latestSize: number = 0;
    let firstFittingBreakpoint  : T.Breakpoint | null = null;
    for(bp in accumulatedSizes) {
      let sizeBp: T.SizeBreakpoint = `size-${bp}`;
      let thisSize: number = def.widths[sizeBp] ?? latestSize;
      accumulatedSizes[bp] += thisSize;
      if(accumulatedSizes[bp] <= 12 && firstFittingBreakpoint === null) {
        firstFittingBreakpoint = bp;
      }
      latestSize = thisSize;
    }

    if(firstFittingBreakpoint && index > 0) {
      //console.log(`column ${def.columnName} fits at breakpoint ${firstFittingBreakpoint  } and above`);
      def._calculatedMoveHeaderHideClass = firstFittingBreakpoint   === "xs" ? 'ion-hide' : `ion-hide-${firstFittingBreakpoint  }-up`; //ion-hide-xs-up is just ion-hide
      def._calculatedTableHeaderHideClass = `ion-hide-${firstFittingBreakpoint}-down`;

      //if previewing at the size where this col fits, show move columns
      if(previewingSpecificWidth) {
        if(bpGTE(previewingSpecificWidth, firstFittingBreakpoint)) {
          def._calculatedMoveHeaderHideClass = 'ion-hide'; 
          def._calculatedTableHeaderHideClass = undefined;
        }
        else {
          def._calculatedMoveHeaderHideClass = undefined; 
          def._calculatedTableHeaderHideClass = 'ion-hide';
        }
      }

      // Only show header row when it will have at least 2 columns
      if(index === 1 && firstDef) {
        firstDef._calculatedMoveHeaderHideClass = def._calculatedMoveHeaderHideClass;
        firstDef._calculatedTableHeaderHideClass = def._calculatedTableHeaderHideClass;
      }
    }
    else { //if column doesn't fit at any breakpoint, or it's the first column and we want to make sure a second column will fit
      def._calculatedTableHeaderHideClass = 'ion-hide';
    }
    index++;
    if(!firstDef) firstDef = def;
  }
  //console.log("Accumulated sizes: " + JSON.stringify(accumulatedSizes));
}


/**
if editing or resolving rebase/merge, show preferred order (if conflict) with deleted or conflicting moves 
Want preferredOrder + stuff in baseOrder + change's additions + any conflict additions
"Stealth" additions in rebase will have moveName change, can be missing from moveOrder if it wasn't modified. They do have conflicts. 
EDITING: your order plus deletions (SCAN BASE) > base

TODO: display moves that still have data but not in moveOrder, to catch bugs?

*/
export function getEditingResolutionMoveOrder(currentCharDoc: T.CharDoc, changeList: T.ChangeDoc): T.MoveOrder[] {
  const baseDoc = changeList?.rebaseSource || changeList?.mergeSource || currentCharDoc;
  const baseOrder = baseDoc.universalProps.moveOrder;
  const conflictList = changeList.conflictList;
  const conflict: T.ConflictMoveOrder | undefined = conflictList?.universalProps?.moveOrder;
  const resolution: T.Resolutions | undefined = conflict?.resolution;
  const yourNewOrder: T.MoveOrder[] | undefined = changeList?.universalPropChanges?.moveOrder?.new;
  let theirMergeOrder: T.MoveOrder[] | undefined = undefined;
  if(conflict && changeList.mergeSource) {
    theirMergeOrder = util.getConflictNew(conflict, baseOrder, "theirs") as T.MoveOrder[];
  }
  let primaryOrder: T.MoveOrder[] | undefined; //where move ordering comes from
  let secondaryOrder: T.MoveOrder[] | undefined; //scanned for moves we still want to show because they were changed or have conflicts
  function setOrders(primary: T.MoveOrder[], secondary?: T.MoveOrder[]) {
    primaryOrder = primary;
    secondaryOrder = secondary;
  }

  if(conflictList) {
    if(changeList.rebaseSource) {
      /* REBASING: 
      -no moveOrder conflict: means one or neither changed. Can't distinguish between only base changed/nobody changed.
        You changed: Yours + deletions (scan base). 
        They/no change: base + stealth (your conflict adds, CAN'T SCAN)
      -conflict, no preference: show prefer yours
      -conflict, prefer base: both changed. Base + your additions (stealth adds have been rebased to explicit adds). SCAN YOURS.
      -conflict, prefer yours: both changed. Yours + your deletions + base additions, AKA anything base has and you don't. MUST scan through base anyway to get its additions.
      */
      if(!conflict) {
        if(yourNewOrder) { //you changed moveOrder, they didn't
          setOrders(yourNewOrder, baseOrder); //scan base for any moves you deleted
        }
        else { //you didn't explicitly change moveOrder, but they may or may not have (can't tell)
          let result: T.MoveOrder[] = [...baseOrder];
          //if you modified a move base deleted, rebasing will have created a moveName conflict where the "yours" resolution re-adds the move
          for(const name in conflictList) {
            let con = conflictList[name];
            if(!con) continue;
            if(con.moveName && con.moveName.yours && con.moveName.yours !== "no-op") {
              result.push({name: name});
            }
          }
          return result;
        }
      }
      else { //there's a moveOrder conflict
        if(!yourNewOrder) throw new Error("MoveOrder conflict in rebase, yet moveOrder not changed");
        if(!resolution || resolution === "yours") {
          setOrders(yourNewOrder, baseOrder); //scan base for any moves you deleted
        }
        else { //prefer base
          setOrders(baseOrder, yourNewOrder); //scan yours for additions
        }
      }
    }
    else if(changeList.mergeSource) {
      /* MERGING:
      -no moveOrder conflict: they didn't change. Yours + deletions (scan base) > base
      -conflict only they changed, no preference: yours is no-op, show prefer theirs
      -conflict only they changed, prefer yours: base + their additions (scan theirs)
      -conflict only they changed, prefer theirs: theirs + their deletions (scan base)
      -conflict both changed, no preference: show prefer yours
      -conflict both changed, prefer yours: yours + your deletions + their additions (scan theirs, misses redundant delete)
      -conflict both changed, prefer theirs: theirs + their deletions + your additions (scan yours, misses redundant delete)
      */
      if(!conflict) {
        if(yourNewOrder) {
          setOrders(yourNewOrder, baseOrder); //scan base for any moves you deleted
        }
        else {
          return baseOrder;
        }
      }
      else {
        if(!theirMergeOrder) throw new Error("MoveOrder conflict in merge, yet moveOrder not changed by them");
        if(conflict.yours === "no-op") { //only they changed moveOrder
          if(!resolution || resolution === "theirs") {
            setOrders(theirMergeOrder, baseOrder); //scan base for moves they deleted
          }
          else {
            setOrders(baseOrder, theirMergeOrder); //scan theirs for their additions
          }
        }
        else { //both changed moveOrder
          if(!yourNewOrder) throw new Error("true MoveOrder conflict in merge, yet moveOrder not changed by you");
          if(!resolution || resolution === "yours") {
            setOrders(yourNewOrder, theirMergeOrder); //scan theirs for their additions
          }
          else {
            setOrders(theirMergeOrder, yourNewOrder); //scan yours for your additions
          }
        }
      }
    }
    else {
      console.error("conflictList present with neither rebaseSource or mergeSource");
      return baseOrder;
    }
  } else { //No conflicts, just editing
    if(yourNewOrder) {
      setOrders(yourNewOrder, baseOrder); //scan base for any moves you deleted
    }
    else {
      return baseOrder;
    }
  }

  let result: T.MoveOrder[] = [];
  if(!primaryOrder) throw new Error("primaryOrder not defined");
  result = [...primaryOrder];
  // Insert any moves (not categories) from secondaryOrder that's missing 
  if(secondaryOrder) {
    let primaryOrderMap: Map<string, T.MoveOrder> = new Map<string, T.MoveOrder>(primaryOrder.map((item)=>[item.name, item])); //for fast lookups
    let secondaryOrderMap: ReadonlyMap<string, [T.MoveOrder, number]> = new Map<string, [T.MoveOrder, number]>(secondaryOrder.map((item, index)=>[item.name, [item, index]]));
    addMissingMoves(primaryOrderMap, result, secondaryOrderMap, secondaryOrder);
    //for(const item of secondaryOrder) {
      //if(item.isCategory) continue;
      //let insertIndex = insertByNeighbor(item.name, primaryOrderMap, result, secondaryOrderMap, secondaryOrder);
      //if(insertIndex !== -1) {
        //console.log(`inserted item ${item.name} into order at index ${insertIndex}`);
      //}
    //}
  }
  return result;
}
