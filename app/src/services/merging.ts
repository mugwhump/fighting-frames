import type * as T from '../types/characterTypes'; //== 
import * as util from '../services/util';
import { cloneDeep, isEqual } from 'lodash';

export function applyChangeDoc(doc: T.CharDoc, changeDoc: T.ChangeDoc) {
  //modify doc, don't return copy
  //Reject if changeDoc.baseRev !== doc._rev
  //Chardoc has changes added to changeHistory
}
export function unapplyChangeDoc(doc: T.CharDoc, changeDoc: T.ChangeDoc) {
  //modify doc, don't return copy
  //Reject if changeDoc._id !== doc.changeHistory.pop()
  //Chardoc has last changeHistory popped
}

export function invertChangeDoc(changeDoc: T.ChangeDoc): void {
  //Just swap additions/deletions and modify new/old
  if(changeDoc.moveChanges) {
    for(const [moveName, changes] of util.keyVals(changeDoc.moveChanges)) {
      if(!changes) continue;
      changeDoc.moveChanges[moveName]! = getInvertedMoveChanges(changes) as T.MoveChanges;
    }
  }
  if(changeDoc.universalPropChanges) changeDoc.universalPropChanges = getInvertedMoveChanges(changeDoc.universalPropChanges) as T.PropChanges;
}
function getInvertedMoveChanges(changes: Readonly<T.Changes>): T.Changes {
  let result: T.Changes = {};
  for(const [col, change] of util.keyVals(changes)) {
    if(!change) continue;
    if(change.type === "modify") {
      result[col] = {type: "modify", new: change.old, old: change.new} as T.Modify;
    }
    else if(change.type === "add") {
      result[col] = {type: "delete", old: change.new} as T.Delete;
    }
    else if(change.type === "delete") {
      result[col] = {type: "add", new: change.old} as T.Add;
    }
  }
  return result;
}

export function rebaseAndResolve(baseDoc: Readonly<T.CharDocWithMeta>, changeDoc: T.ChangeDoc) {
  rebaseChangeDoc(baseDoc, changeDoc); //now full of rebase conflicts without resolutions
  autoResolveConflicts (changeDoc, "yours"); //creates resolutions for all conflicts, favoring given changeDoc
  applyResolutions(baseDoc, changeDoc, false); //apply all resolutions
}

//Create (but don't apply) resolutions for changeDoc's conflicts, preferring yours or theirs 
//(if rebasing a merged change, say that "yours" is what needs rebasing)
export function autoResolveConflicts (changeDoc: T.ChangeDoc, preference: "yours" | "theirs") {
  //if they merge-rebase and have stealth additions (no explicit order changes), they now have explicit moveOrder change... seems fine.
  if(!changeDoc.conflictList) return;
  for(const [move, conflicts] of util.keyVals(changeDoc.conflictList)) {
    if(!conflicts) continue;
    for(const [col, conflict] of util.keyVals(conflicts)) {
      if(!conflict) continue;
      conflict.resolution = preference;
    }
  }
}

export function rebaseChangeDoc(baseDoc: Readonly<T.CharDoc>, changeDoc: T.ChangeDoc) {
  //clone changeDoc??
  //conflictList full of unresolved conflicts and any autoresolved changes needing rebasing
  let conflictList: T.ConflictList = {};
  if(changeDoc.moveChanges) {
    for(const [moveName, changes] of util.keyVals(changeDoc.moveChanges)) {
      if(!changes) continue;
      const rebaseConflicts: T.ConflictsRebase | null = getRebaseConflicts(moveName, changes, baseDoc.moves[moveName]);
      if(rebaseConflicts) {
        conflictList[moveName] = rebaseConflicts;
      }
    }
  }
  if(changeDoc.universalPropChanges) {
    const propConflicts: T.ConflictsProps | null = getRebaseConflicts("universalProps", changeDoc.universalPropChanges, baseDoc.universalProps);
    if(propConflicts) {
      conflictList.universalProps = propConflicts;
    }
  }
  if(util.keys(conflictList).length > 0) {
    changeDoc.conflictList = conflictList;
  }
  else {
    console.log("No conflicts from rebase");
  }
}
//assumes changes are less recent than new basis
//must pass move name so move can be added if changes modify move no longer in base
//undefined baseValues means move is missing, so your changes may be addition
export function getRebaseConflicts(name: string, changes: T.Changes, baseValues?: Readonly<T.Cols>): T.ConflictsRebase | null {
  //iterate through changes
  //  base === old, you have uncontested change, no conflict 
  //  base !== old and base === new, redundant, autoresolve to no-op
  //  base !== old and base !== new, both changed, genuine conflict
  let result: T.ConflictsRebase<T.ColumnData> = {};
  for(let [col, change] of util.keyVals(changes)) {
    if(!change) continue;
    if(col !== "moveName") {
      const baseVal: T.ColumnData | undefined = baseValues?.[col];
      const yourOld: T.ColumnData | undefined = util.getOldFromChange(change);
      const yourNew: T.ColumnData | undefined = util.getNewFromChange(change);

      //if you modify/add col in move not in base without adding whole move and there's no existing conflict to add moveName, make one
      if(!baseValues && change.type !== "delete" && !changes.moveName && !result.moveName) {
        const stealthAdd: T.ConflictRebase = {yours: {type: "add", new: name}, theirs: "no-op"};
        result.moveName = stealthAdd;
      }

      //if base === old, no conflict unless adding col in stealth add
      if(isEqual(baseVal, yourOld)) { 
        if(!baseValues && change.type === "add" && !changes.moveName) {
          const stealthAddedColumnConflict: T.ConflictRebase = {yours: change, theirs: "no-op"};
          result[col] = stealthAddedColumnConflict;
        }
      }
      else { //base !== old
        const rebasedChange: T.ColumnChange | null = createChange(baseVal, yourNew);
        //if change is redundant, noop it out 
        if(!rebasedChange) {
          const noop: T.ConflictAutoNoop = {yours: "no-op", theirs: "no-op", resolution: "yours"};
          result[col] = noop;
        }
        else { //genuine conflict
          const conflict: T.ConflictRebase = {yours: rebasedChange, theirs: "no-op"};
          result[col] = conflict;
        }
      }
    }
    // If you're adding or deleting move...
    else {
      if(change.type === "add") {
        if(baseValues) {
          //redundant addition, noop out your addition
          const noop: T.ConflictAutoNoop = {yours: "no-op", theirs: "no-op", resolution: "yours"};
          result.moveName = noop;
        }
        //if you're adding move uncontested, no conflict
      }
      else if(change.type === "delete") {
        if(!baseValues) {
          //redundant deletion, noop out yours
          const noop: T.ConflictAutoNoop = {yours: "no-op", theirs: "no-op", resolution: "yours"};
          result.moveName = noop;
        }
        else {
          //loop through theirs, see if they modified/added columns which conflicts with your move deletion
          let baseAddedOrModified: boolean = false;
          for(const [baseCol, val] of util.keyVals(baseValues)) {
            if(!val) continue;
            const yourDeletion = changes[baseCol];
            if(!yourDeletion) {
              //they added a brand new column, conflict where yours deletes it
              const del: T.ConflictRebase = {yours: {type: "delete", old: val}, theirs: "no-op"};
              result[baseCol] = del;
              baseAddedOrModified = true;
            }
            else if(yourDeletion.type === "delete" && !isEqual(val, yourDeletion.old)){
              baseAddedOrModified = true;
            }
          }
          if(baseAddedOrModified) {
            const moveNameConflict = {yours: change, theirs: "no-op" as const};
            result.moveName = moveNameConflict;
          }
          //if you're deleting move they ignored, no conflict
        }
      }
    }
  }

  return util.keys(result).length === 0 ? null : result;
  //MOVE ADDITION: If you modified move missing from base, make conflict adding movename+your modifications rebased to additions, other is all-noop
  //Buuut if you manually added move already in base, no-alternative autoresolve your movename addition into no-op
  //MOVE DELETION: If you have explicit deletion and base...
  //...lacks move, they made same change as you, autoresolve moveName del to noop without alternative
  //...has move, no conflict IF they change nothing, otherwise all-or-nothing choice between your deletion. (Make sure to delete any new cols they add)
  //Base deleting while you modify is covered by stealth addition case

  //If moveName deleted in yours while move present, UI presents all-or-nothing choice between "theirs" and "yours" for whole move
  //Result is T.Conflicts where "delete" resolution is Delete-only with moveName Delete, other is all-noop
  //MOVE ORDER: create conflict so users can indicate preference
}


//Fills your changeDoc's conflict list
//Assumes your changes are based on latest.
//If their basis is out of date, rebases their changeDoc (prefer theirs for conflicts)
export function mergeChangeDocs(theirChangeDoc: T.ChangeDoc, yourChangeDoc: T.ChangeDoc, baseDoc: Readonly<T.CharDocWithMeta>) {
  // Check that theirs is up-to-date
  if(theirChangeDoc.baseRevision !== baseDoc._rev) {
    console.log("Their changes out of date, rebasing");
    rebaseAndResolve(baseDoc, theirChangeDoc);
  }
  if(theirChangeDoc.baseRevision !== yourChangeDoc.baseRevision) {
    console.error(`Their base revision ${theirChangeDoc.baseRevision} doesn't match yours ${yourChangeDoc.baseRevision}`);
    console.error("Theirs has unresolved conflicts: " + JSON.stringify(theirChangeDoc.conflictList));
  }

  //loop through their changed moves, generating conflicts
  if(theirChangeDoc.moveChanges) {
    for(const [move, theirChanges] of util.keyVals(theirChangeDoc.moveChanges)) {
      if(!theirChanges) continue;
      let conflicts: T.ConflictsMerge | null = getMergeConflicts(theirChanges, yourChangeDoc?.moveChanges?.[move]);
      if(conflicts) {
        if(!yourChangeDoc.conflictList) yourChangeDoc.conflictList = {};
        yourChangeDoc.conflictList[move] = conflicts;
      }
    }
  }
  //universal props
  if(theirChangeDoc.universalPropChanges) {
    let conflicts: T.ConflictsMerge | null = getMergeConflicts(theirChangeDoc.universalPropChanges, yourChangeDoc?.universalPropChanges);
    if(conflicts) {
      if(!yourChangeDoc.conflictList) yourChangeDoc.conflictList = {};
      yourChangeDoc.conflictList.universalProps = conflicts;
    }
  }
}

//Get conflicts for a single move
//assumes both changes are based on latest
//if you have no changes for move, must still autoresolve all of theirs
//Returns null if changes are identical/redundant
export function getMergeConflicts(theirChanges: T.Changes, yourChanges?: T.Changes): T.ConflictsMerge | null {
  let result: T.ConflictsMerge<T.ColumnData> = {};
  //Iterate over their changed columns
  //If only they changed, create a resolved conflict
  //If only you changed, no conflict. So no need to iterate over union of keys.
  //If both changed, create conflict IF not redundant
  let theyAddedOrModified: boolean = false;
  for(let [col, theirChange] of util.keyVals(theirChanges)) {
    const yourChange: T.ColumnChange | undefined = yourChanges?.[col];
    
    if(!yourChange) {
      //autoresolve 
      let autoResolveTheirs: T.ConflictMergeTheirs = {yours: "no-op", theirs: theirChange!, resolution: "theirs"};
      result[col] = autoResolveTheirs;
    }
    else {
      //check for redundant change
      if(!isEqual(util.getNewFromChange(yourChange), util.getNewFromChange(theirChange!))) {
        let mergeConflict: T.ConflictMerge = {yours: yourChange, theirs: theirChange!};
        result[col] = mergeConflict;
      }
    }

    if(theirChange!.type === "add" || theirChange!.type === "modify") theyAddedOrModified = true;
  }
  //they add or delete move you ignore, fine, interface sees moveName conflict and makes all-or-nothing

  //if one deletes move other changes, handle cases where theirs should be no-op
  const youDeleteMove: boolean = yourChanges?.moveName?.type === "delete";
  const theyDeleteMove: boolean = theirChanges?.moveName?.type === "delete";
  let youAddedOrModified: boolean = false;
  if(yourChanges) {
    if(theyDeleteMove) {
      for(let [col, yourChange] of util.keyVals(yourChanges)) {
        if(yourChange?.type === "add" && col !== "moveName") {
          //if you added a new column while they delete move, make conflict to noop out your add if deletion selected
          let mergeConflict: T.ConflictMergeAllOrNothing = {yours: yourChange, theirs: "no-op"};
          result[col] = mergeConflict;
        }
        if(yourChange?.type === "add" || yourChange?.type === "modify") {
          youAddedOrModified = true;
        }
      }
      if(youAddedOrModified) {
        //don't autoresolve movename if they delete, you change
        delete result!.moveName!.resolution;
      }
    }
    //if you delete move and they have at least one add or modify, make moveName conflict where theirs is no-op
    if(youDeleteMove && theyAddedOrModified) {
      let mergeConflict: T.ConflictMergeAllOrNothing = {yours: yourChanges.moveName!, theirs: "no-op"};
      result.moveName = mergeConflict;
    }
  }

  //If result empty, means there were only redundant changes
  return util.keys(result).length === 0 ? null : result;

  //MOVE ADDITION: If they modified move missing from your base that you didn't explicitly re-add... TAKEN CARE OF, it's rebased
  // Conflict adding moveName. Don't auto-resolve. Changing one col in move that was later deleted shouldn't default to adding the move back.
  // If they explicitly added a move already in base, ignore their moveName add 

  //MOVE DELETION: 
  //If theyDeleted and youDeleted, no conflicts, return null
  //If moveName deleted in one or the other, UI presents all-or-nothing choice between "theirs" and "yours" for whole move, moveName conflict
  //If theyDeleted, choice between their (rebased) Deletes and your changes
  //If youDeleted, choice between their (rebased) changes and your Deletes
  //MOVE ORDER: standard rules, autoresolved conflict if only they changed
}



//Modifies changeDoc by applying resolutions of all conflicts
//If all conflicts resolved, updates changeDoc's metadata and resolves moveOrder. 
//Provide theirChanges if merging
//TODO: what if new rebase comes in while still resolving? Don't allow until conflicts resolved.
//Keep in mind you can do multiple rebases and merges before uploading a changeDoc
export function applyResolutions(baseDoc: Readonly<T.CharDocWithMeta>, yourChanges: T.ChangeDoc, isMerge: boolean): void {
  // Delete moveOrder conflict if it has resolution to manually resolve it after all other conflicts
  // (If there's conflicts without resolutions, it's reinserted)
  let resolvedMoveOrderConflict : T.ConflictMoveOrder | undefined = yourChanges?.conflictList?.universalProps?.moveOrder;
  if(resolvedMoveOrderConflict?.resolution) {
    util.updateColumnConflict(yourChanges, "universalProps", "moveOrder", null);
  }
  else {
    resolvedMoveOrderConflict = undefined;
  }

  //individual conflicts, move conflicts, and the whole conflict list get deleted when all of their component conflicts are resolved
  if(yourChanges.conflictList) {
    for(const [moveName, conflicts] of util.keyVals(yourChanges.conflictList)) {
      if(!conflicts) continue;
      let changes: T.Changes | null = ((moveName === "universalProps") ? yourChanges.universalPropChanges : yourChanges.moveChanges?.[moveName]) ?? null;
      let newChanges: T.Changes | null = applyMoveResolutions(conflicts, changes);
      util.updateMoveOrPropChanges(yourChanges, moveName, newChanges);
      if(util.keys(conflicts).length === 0) delete yourChanges.conflictList[moveName];
    }
    if(util.keys(yourChanges.conflictList).length === 0) delete yourChanges.conflictList;
  }

  // Now resolve moveOrder IF all conflicts have been resolved. Otherwise put it back in.
  if(!yourChanges.conflictList) {
    const newOrder: T.MoveOrder[] = resolveMoveOrder(baseDoc.universalProps.moveOrder, yourChanges, isMerge, resolvedMoveOrderConflict );
    const orderChange: T.ColumnChange<T.MoveOrder[]> | null = createChange(baseDoc.universalProps.moveOrder, newOrder);
    util.updateColumnChange(yourChanges, "universalProps", "moveOrder", orderChange);
  }
  else if(resolvedMoveOrderConflict ) {
    yourChanges.conflictList.universalProps = {...yourChanges.conflictList.universalProps, moveOrder: resolvedMoveOrderConflict };
  }

  //With all conflicts resolved, update changeDoc's metadata
  if(!yourChanges.conflictList) {
    //In rebase, returned changeDoc has baseDoc as baseRev, its last change as prevChange
    if(!isMerge) { 
      yourChanges.baseRevision = baseDoc._rev;
      if(baseDoc.changeHistory.length > 0) {
        yourChanges.previousChange = baseDoc.changeHistory[baseDoc.changeHistory.length -1];
      }
    }
  }
}
// Returns cloned set of changes with resolutions applied
// Deletes conflicts as they're resolved
// If they have uncontested merge changes, you might not have changes for move.
// If changes all deleted since resolutions are all no-ops (for say, a redundant move deletion), returns null.
// Doesn't resolve moveOrder
function applyMoveResolutions(conflictsToModify: T.Conflicts, changes: Readonly<T.Changes> | null): T.Changes | null {
  let result: T.Changes = (changes) ? cloneDeep<T.Changes>(changes) : {};
  for(const [col, conflict] of util.keyVals(conflictsToModify)) {
    if(!conflict) continue;
    if(conflict.resolution && col !== "moveOrder") {
      const resolvedChange: T.ColumnChange | "no-op" = conflict[conflict.resolution];
      if(resolvedChange === "no-op") {
        delete result[col]; 
      }
      else {
        result[col] = resolvedChange;
      }
      delete conflictsToModify[col]; //delete conflict that was just resolved
    }
  }

  return (util.keys(result).length > 0) ? result : null;
}


//Inserts item from source into target at the position of the nearest common predecessor or successor, or at the end if none found
//Returns the insertion index, or -1 if item not inserted (if missing in source or already in target)
//TODO: could probably forego sourceMap if given starting index
function insertByNeighbor(insertName: string, targetMap: Map<string, T.MoveOrder>, targetArray: T.MoveOrder[], 
                          sourceMap: ReadonlyMap<string, [T.MoveOrder, number]>, sourceArray: Readonly<T.MoveOrder[]>): number {
  const startPoint = sourceMap.get(insertName);
  if(!startPoint) return -1;
  if(targetMap.has(insertName)) return -1;

  const [insertItem,startIndex] = startPoint;
  //insert a then b into c,d,e from a,b,c,d,e
  //becomes            a,c,d,e
  //insert d into a,b,c from a,b,c,d
  for(let prevIndex = startIndex-1, nextIndex = startIndex+1; prevIndex >= 0 || nextIndex < sourceArray.length; prevIndex-=1, nextIndex+=1) {
    //check for predecessor
    if(prevIndex >= 0) {
      const prevName: string = sourceArray[prevIndex].name;
      if(targetMap.has(prevName)) {
        const predecessorIndex = targetArray.findIndex((item)=>item.name===prevName);
        if(predecessorIndex === -1) throw new Error ("TargetMap and targetArray out of sync!");
        targetMap.set(insertName, insertItem);
        targetArray.splice(predecessorIndex+1, 0, insertItem);
        return predecessorIndex + 1; //insert after predecessor
      }
    }
    //check for successor
    if(nextIndex < sourceArray.length) {
      const nextName: string = sourceArray[nextIndex].name;
      if(targetMap.has(nextName)) {
        const successorIndex = targetArray.findIndex((item)=>item.name===nextName);
        if(successorIndex === -1) throw new Error ("TargetMap and targetArray out of sync!");
        targetMap.set(insertName, insertItem);
        targetArray.splice(successorIndex, 0, insertItem);
        return successorIndex; //insert before successor
      }
    }
  }
  console.log("No shared neighbors found, inserting "+insertName+" at end");
  targetMap.set(insertName, insertItem);
  targetArray.push(insertItem);
  return targetArray.length;
}


//Return new moveOrder incorporating resolved changes (which may add or delete things)
//The changes in given changeDoc are resolved, except for moveOrder
//If there's an effective deletion/addition from base, there'll be a resolved Delete/Add change for moveName
//Can provide moveOrder conflict as argument, or have it inside changelist's conflicts
export function resolveMoveOrder(baseOrder: Readonly<T.MoveOrder[]>, yourChanges: T.ChangeDoc, isMerge: boolean, conflict?: T.ConflictMoveOrder): T.MoveOrder[] {
  //don't need their changeDoc in merge, their accepted additions/deletions have been added to yourChanges, if they changed moveOrder it's in conflicts

  //This moveOrder's either from yourChange, or from baseDoc (rebase) or theirs (merge)
  let preferredOrder: Readonly<T.MoveOrder[]> = yourChanges.universalPropChanges?.moveOrder?.new || baseOrder;
  //If undefined, no conflict, so only one or neither of you changed moveOrder
  let nonPreferredOrder: Readonly<T.MoveOrder[]> | undefined = undefined;
  
  const moveOrderConflict: T.ConflictMoveOrder | undefined = conflict ?? yourChanges.conflictList?.universalProps?.moveOrder;
  const resolution: "yours" | "theirs" | undefined = moveOrderConflict?.resolution ?? undefined;
  if(moveOrderConflict && resolution) {
    const opposite: "yours" | "theirs" = util.getOppositeResolution(resolution);
    if(util.isConflictMoveOrderMergeTheyChange(moveOrderConflict)) {
      //either rejecting or accepting their uncontested change, no non-preferred
      //TODO: what to actually do with non-preferred? OK to have it if other is base?
      preferredOrder = (resolution === "theirs") ? moveOrderConflict.theirs.new : baseOrder;
      nonPreferredOrder = (resolution === "theirs") ? baseOrder : moveOrderConflict.theirs.new;
    }
    else if(util.isConflictMoveOrderMergeBothChange(moveOrderConflict)) {
      preferredOrder = moveOrderConflict[resolution].new;
      nonPreferredOrder = moveOrderConflict[opposite].new;
    }
    else if(util.isConflictMoveOrderRebaseBothChange(moveOrderConflict)) {
      preferredOrder = (resolution === "yours") ? moveOrderConflict.yours.new : baseOrder;
      nonPreferredOrder = (resolution === "yours") ? baseOrder : moveOrderConflict.yours.new;
    }
  }
  else if(moveOrderConflict && !resolution) {
    console.warn("MoveOrder conflict has no resolution! Taking yours as preferred.");
  }

  //Starts as shallow clone of baseOrder, then updated with resolved move additions/deletions
  let resolvedOrder: T.MoveOrder[] = [...baseOrder]; //for fast ordered insertion
  let resolvedOrderMap: Map<string, T.MoveOrder> = new Map<string, T.MoveOrder>(baseOrder.map((item)=>[item.name, item])); //for fast lookups
  //These maps also contain each item's index for instant lookup
  type OrderIndex = [T.MoveOrder, number];
  let preferredOrderMap: ReadonlyMap<string, OrderIndex> = new Map<string, OrderIndex>(preferredOrder.map((item, index)=>[item.name, [item, index]]));
  let nonPreferredOrderMap: ReadonlyMap<string, OrderIndex> | undefined = 
    nonPreferredOrder ? new Map<string, OrderIndex>(nonPreferredOrder.map((item, index)=>[item.name, [item, index]])) : undefined;

  // If basis is newer than a changelist's basis, conflict resolution can produce a move addition because 
  // the changelist modified a move not present in the basis and the user chose to re-add it.
  // The out-of-date changeList would be yours if rebasing, theirs if merging.
  // UPDATE: their changes are now automatically rebased before merge, any stealth additions from them become explicit changes to moveOrder for guaranteed conflict
  //let mergedStealthAdditions: T.MoveOrder[] = [];
  // Loop through resolved changes, if resolved change has add/delete moveName, add/remove from resolvedOrder
  if(yourChanges.moveChanges) {
    let yourChangeList: T.MoveChangeList = yourChanges.moveChanges;
    for(const name of util.keys(yourChangeList)) {
      const change: T.MoveChanges = yourChangeList[name]!;
      if(change.moveName) { //has change for "moveName" column
        if(change.moveName.type === "add") {
          const found: boolean = resolvedOrderMap.has(name);
          if(!found) {
            console.log("Item "+name+" being added to order by changeList or resolution");
            if(insertByNeighbor(name, resolvedOrderMap, resolvedOrder, preferredOrderMap, preferredOrder) === -1) {
              //wasn't found in preferred order, try nonPreferred
              if(nonPreferredOrder && nonPreferredOrderMap && insertByNeighbor(name, resolvedOrderMap, resolvedOrder, nonPreferredOrderMap, nonPreferredOrder) !== -1) {
                console.log("Found and inserted from nonpreferred");
              }
              else {
                //If not manually added and changelist addition came from didn't otherwise modify its own move order, can't know where the move was in their order.
                console.log("Not found in preferred or nonpreferred, inserting at end");
                let item: T.MoveOrder = {name: name};
                resolvedOrder.splice(resolvedOrder.length, 0, item); 
                resolvedOrderMap.set(name, item);
                //if(isMerge) {
                  ////If merging, you might or not have changed order, but the resolved addition is from them, and it's not present in your order
                  ////TODO: unused if changeList has been auto-rebased, they'll have gone through this resolution process preferring theirs once already
                  //mergedStealthAdditions.push(item);
                //}
              }
            }
            else console.log("Found and inserted from preferred");
          }
        }
        else if(change.moveName.type === "delete") {
          const index: number = resolvedOrder.findIndex((moveOrderItem) => moveOrderItem.name === name);
          resolvedOrder.splice(index, 1);
          resolvedOrderMap.delete(name);
          console.log("Removed "+name+" from resolved");
        }
      }
    }
  }
  //If you made no order changes in rebase, return resolved
  //Or if you changed order but prefer base, resolved now has any adds/deletes from yours
  //If preferred yours in merge and it's baseOrder, you made no changes
  //Can't have preferred theirs in merge when preferred === baseOrder. Can only choose to prefer theirs via conflict, and no conflict created if theirs===base
  if(preferredOrder === baseOrder /*&& resolution !== "no-op"*/) {
    console.log("You made no explicit changes to moveOrder, returning resolved order");
    return resolvedOrder;
  }
  //If you made explicit moveOrder changes but there was no conflict between moveOrders...
  if(!nonPreferredOrder) {
    //If rebasing...
    if(!isMerge) {
      //If you changed w/o conflict means baseOrder=your old, changes were yours and explicit. Can safely return your new aka preferred.
      console.log("You made uncontested moveOrder changes while rebasing, returning your order");
      return preferredOrder as T.MoveOrder[];
      //If you didn't change order and no conflict, resolved was already returned above
    }
    //If merging
    else {
      //If you changed but merging without conflict, means only you changed order
      //If they caused a stealth addition-from-resolution, and you changed order, manually insert additions to preferred
      //TODO: stealthAdditions will be empty if changeList has been rebased, but still want to return preferred if you have uncontested changes
      console.log("You made uncontested moveOrder changes while merging, returning your order"); //with stealth additions " + JSON.stringify(mergedStealthAdditions));
      return preferredOrder as T.MoveOrder[]; //.concat(mergedStealthAdditions);
    }
  }

  //Rebase preferring base already returned resolved
  //Merge preferring yours already returned preferred+stealthAdditions
  // ----------------- RESOLVED NOW HAS EXACTLY WHAT MOVES SHOULD AND SHOULDN'T BE PRESENT -----------------
  // ----------------- THERE IS NOW A NONPREFERRED ORDER AND A LEGITIMATE ORDERING CONFLICT -----------------
  // ----------------- PREFERRED === YOURS (IN REBASE), THEIRS (IN MERGE) -----------------
  // ----------------- NONPREFERRED === RESOLVED (IN REBASE), YOURS W/O RESOLUTION (IN MERGE) -----------------
  //Merge preferring theirs, both changed, nonpreferred/yours has your manual additions but not their manual+stealth additions
  //Merge preferring theirs, only they changed, nonpreferred/yours is base
  if(!nonPreferredOrderMap) throw new Error("nonPreferredOrderMap undefined");
  console.log("Genuine moveOrder conflict, changing preferred order to match resolved");

  //Preferred order will be copied+modified for result
  let result: T.MoveOrder[] = [...preferredOrder];
  let resultMap: Map<string, T.MoveOrder> = new Map<string, T.MoveOrder>(result.map((item)=>[item.name, item])); //for fast lookups
  //Loop through resolved, add anything not in preferred/result
  for(let i=0; i<resolvedOrder.length; i++) {
    const item: T.MoveOrder = resolvedOrder[i];
    const name = item.name;
    if(item.isCategory) continue;
    if(!preferredOrderMap.has(name)) {
      console.log("Adding "+name+" to preferred from nonpreferred")
      //Came from resolved if rebasing, present in yours if merging. So always in nonpreferred.
      if(!nonPreferredOrderMap.has(name)) throw new Error(`Item ${name} not in preferredOrder OR nonPreferredOrder`);
      insertByNeighbor(name, resultMap, result, nonPreferredOrderMap, nonPreferredOrder);
    }
    else {
      //TODO: could perhaps detect if theirs changed the indentation while yours didn't and keep theirs
      //if merging would need their old order
    }
  }

  //{//Loop backwards through result/preferred, delete moves not in resolved
  for(let i=result.length-1; i >= 0; i--) {
    const item: T.MoveOrder = result[i];
    const name = item.name;
    if(item.isCategory) continue;
    if(!resolvedOrderMap.has(name)) {
      console.log("Removing item "+name);
      result.splice(i, 1);
    }
  }

  return result;
}


// Returns columns with changes applied. If columns are null (eg for new move), creates columns from changes.
// Note this doesn't do sorting, new columns are added to the end. Returns a changed deep clone.
// Returns empty object if every column was deleted.
export function getChangedCols(originalCols: Readonly<T.Cols> | undefined, changes: T.Changes | undefined): T.Cols {
  let newCols: T.Cols = originalCols ? cloneDeep<T.Cols>(originalCols) : {};
  if(!changes && !originalCols) throw new Error("originalCols and changes cannot both be undefined");
  if(!changes) return newCols; 

  for(const [key, change] of util.keyVals(changes)) {
    if(!change) continue;
    if(change.type === "modify" || change.type === "add") {
      //if(change.type === "add" && originalCols[key] !== undefined) console.warn(`Adding ${JSON.stringify(change)} to move despite existing data ${JSON.stringify(originalCols[key])}`);
      newCols[key] = change.new;
    }
    else if(change.type === "delete") {
      delete newCols[key];
    }
  };
  //console.log(`Changed columns for ${changes.moveName} from ${JSON.stringify(originalCols)} to ${JSON.stringify(newCols)} `);
  return newCols;
}

/** Can be called recursively on an array of T.Changes using array.reduce and passing this function.
Reconciles places where both changes touched same data, and combines changes to different data.
Returns null if changes cancel each other out */
export function reduceChanges(accumulator: Readonly<T.Changes>, newChanges: Readonly<T.Changes>): T.Changes | null {
/*
   {NOOP} means no change if og value = new value 
   add -> add = [wonky] add
   add -> delete = NOOP {NOOP}
   add -> modify = add
   delete -> add = modify {NOOP}
   delete -> delete = [wonky] delete 
   delete -> modify = [wonky] modify 
   modify -> add = [wonky] modify 
   modify -> delete = delete 
   modify -> modify = modify {NOOP}
   RULES
   1) if og value = new value (including "deleted"), noop.
   2) modify/delete store acc's old value 
*/
  let result: T.Changes = cloneDeep<T.Changes>(accumulator);
  
  //iterate over newChanges, checking acc for changes to same column
  for(const [key, newChange] of util.keyVals(newChanges)) {
    if(!newChange) continue;
    const accChange: T.ColumnChange | undefined = result[key];
    if(accChange) {
      const oldValue: T.ColumnData | undefined = (accChange.type !== "add") ? accChange.old : undefined;
      const newValue: T.ColumnData | undefined = (newChange.type !== "delete") ? newChange.new : undefined;
      const combinedChange: T.ColumnChange | null = createChange(oldValue, newValue);
      if(!combinedChange) { //if no-op
        delete result[key];
      }
      else {
        result[key] = combinedChange;
      }
    }
    else { 
      result[key] = newChange;
    }
  }
  if(util.keys(result).length ===0) {
    return null;
  }
  return result;
}

//used when reducing two MoveChanges which may touch different columns
//oldChange is only used if newChange is missing
export function reduceChange(oldChange: T.ColumnChange, newChange: T.ColumnChange): T.ColumnChange | null {
  let newData: T.ColumnData | undefined;
  throw new Error("Not implemented");
}
export function createChange<F extends T.ColumnData>(oldData: F | undefined, newData: F | undefined): T.ColumnChange<F> | null {
    //CASE: no-op (returning to clonedChange's data, just exit)
    //if(newData === changedData) {
      // NAH, simpler to just overwrite an identical change
    //}
    //CASE: no-op
    if(isEqual(oldData, newData)) {
      return null;
    }
    //CASE: addition
    else if(newData !== undefined && oldData === undefined) {
      return {type: 'add', new: newData};
    }
    //CASE: modification
    else if(newData !== undefined && oldData !== undefined) {
      return {type: 'modify', new: newData, old: oldData};
    }
    //CASE: deletion
    else if(newData === undefined && oldData !== undefined) {
      return {type: 'delete', old: oldData};
    }
    else {
      throw new Error(`unhandled case in createChange: oldData = ${oldData}, newData = ${newData}`);
    }
}

export function deleteMove(doc: T.CharDoc, moveName: string): T.DeleteMoveChanges {
  throw new Error("Not implemented");
}

//let order: T.MoveOrder[] = [{name:"a"}, {name:"b", indent:2}];
//let order2: T.MoveOrder[] = [{name:"c"}, {name:"d", indent:3}];
//let testChanges: T.Changes = {
  //"apples": {type: "modify", new: 70, old: 69},
  ////"cupsize": {type: "add", new: "AAA"},
  //"oranges": {type: "delete", old: order},
//}
//let testChanges2: T.Changes = {
  //"apples": {type: "delete", old: 7000},
  ////"cupsize": {type: "add", new: "AAA"},
  //"oranges": {type: "modify", new: order, old: "PENIS"},
//}


//if their changes need to be rebased, it would be nice to only need conflict resolution once...
//So difference when theirs is outdated is that things you don't change can still be conflicts
//Can rebasing conflicts be generated from a call to rebaseChanges()? Need to "combine" conflicts of case 1) and 2)...
//1)they change col from 1->2, doc=3, you change 3->4: choose between 3->2 and 3->4
//2)they change col from 1->2, doc=3, you ignore: choose between 3->2 and no-op (rebase conflict, need base doc for this)
//3)they change col from 1->3, doc=3, you change 3->4: no conflict, yours
//4)they change col from 1->4, doc=3, you change 3->4: no conflict, yours
//5)they don't change from 2->2, doc=3, you change 3->4: no conflict, yours
//export function combineRebaseAndMergeConflicts(rebaseConflicts: T.ConflictList, mergeConflicts: T.ConflictList): T.ConflictList {
  //throw new Error("Nah fuck this just auto-resolve rebase by preferring baseDoc");
//}
