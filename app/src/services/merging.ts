import type * as T from '../types/characterTypes'; //== 
import { keys, keyVals } from '../services/util';
import { cloneDeep, isEqual } from 'lodash';

export function applyChangeList(doc: T.CharDoc, changeDoc: T.ChangeDoc) {
  //modify doc, don't return copy
  //Reject if changeDoc.baseRev !== doc._rev
  //Chardoc has changes added to changeHistory
}
export function unapplyChangeList(doc: T.CharDoc, changeDoc: T.ChangeDoc) {
  //modify doc, don't return copy
  //Reject if changeDoc._id !== doc.changeHistory.pop()
  //Chardoc has last changeHistory popped
}


export function rebaseChangeDoc(baseDoc: T.CharDoc, changeDoc: T.ChangeDoc): T.ChangeDoc {
  //clone changeDoc??
  //Returned changeDoc has baseDoc as baseRev, its last change as prevChange, mergedChanges are uhhhhhh
  //conflictList full of unresolved conflicts and any autoresolved changes needing rebasing
  throw new Error("Not implemented");
}
//assumes changes are less recent than new basis
//undefined baseValues means move is missing, so your changes may be addition
export function getRebaseConflicts(baseValues: T.Cols | undefined, changes: T.Changes): T.Conflicts | null {
  //iterate through changes
  //  base === old and base !== new, you have uncontested change, no conflict 
  //  base !== old and base === new, autoresolve to no-op
  //  base !== old and base !== new, both changed, genuine conflict

  //MOVE ADDITION: If you modified/added move missing from base, make conflict adding movename+your modifications rebased to additions
  //MOVE DELETION: can't know if base is missing a move because of manual deletion, so only possibly if you deleted
  //If moveName deleted in yours while move present, UI presents all-or-nothing choice between "theirs" and "yours" for whole move
  //Result is T.Conflicts where "delete" resolution is Delete-only with moveName Delete, other is all-noop
  //MOVE ORDER: create conflict so users can indicate preference
  throw new Error("Not implemented");
}


//assumes your changes are based on latest.
//Their doc's accumulatedChanges are added to yours.
export function mergeChangeDocs(theirChangeDoc: T.ChangeDoc, yourChangeDoc: T.ChangeDoc, baseDoc?: T.CharDoc): T.ChangeDoc {
  // returned changeDoc has theirs added to mergedChanges, filled conflictList
  throw new Error("Not implemented");
}
//assumes your changes have an as recent or more recent basis
//Pass latest baseValues if their changes have an older basis (since you might not have a change to provide the old value)
export function getMergeConflicts(theirChanges: T.Changes, yourChanges: T.Changes, baseValues?: T.Cols): T.Conflicts | null {
  let theyDeleted: boolean = false;
  let youDeleted: boolean = false;
  //Iterate over their changes
  //If only they changed, create a resolved conflict from your old or baseValue IF their new !== base
  //^^this rebases their uncontested changes
  //If only you changed, no conflict. So no need to iterate over union of keys.
  //If both changed, create conflict IF their new isn't your new OR old

  //MOVE ADDITION: If they added/modified cols for move missing from your base that you didn't change...
  // Conflict adding moveName. Don't auto-resolve. Changing one col in move that was later deleted shouldn't default to adding the move back.
  //MOVE DELETION: If moveName deleted in either, UI presents all-or-nothing choice between "theirs" and "yours" for whole move
  //If theyDeleted and youDeleted, no conflicts, return null
  //If theyDeleted, choice between their (rebased) Deletes and your changes
  //If youDeleted, choice between their (rebased) changes and your Deletes
  //MOVE ORDER: standard rules, autoresolved conflict if only they changed
  throw new Error("Not implemented");
}


export function applyResolutions(changeDoc: T.ChangeDoc): T.ChangeDoc {
  //Resolution choices can result in move additions or deletions, spelled out explicitly by presence of autoresolved moveName Add/Delete conflict
  //If rebasing from more than one rev ago, can need to "parse out" non-explicit additions
  //E.g. if merger worked with columns not in yours, or yours worked with those not in basis, resolution must parse move addition
  //If moveName column always stored... doesn't help (except w/ awkwardness of empty moves)

  //All-or-nothing choices rather than per-column if deleting/adding
  throw new Error("Not implemented");
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
//The changes themselves are resolved
//If there's an effective deletion/addition from base, there'll be a resolved Delete/Add change for moveName
export function resolveMoveOrder(baseDoc: T.CharDoc, yourChanges: T.ChangeDoc, isMerge: boolean): T.MoveOrder[] {
  //changeDoc is yours after resolution, baseDoc is relevant in rebase, not sure if need theirChanges
  //don't need their changeDoc in merge, their accepted additions/deletions have been added to yourChanges, if they changed moveOrder it's in conflicts

  //REBASING: this order just needs your resolved additions/deletions
  //MERGING: yes still just needs resolved additions/deletions
  let baseOrder: Readonly<T.MoveOrder[]> = baseDoc.universalProps.moveOrder;

  //This moveOrder's either from yourChange, or from baseDoc (rebase) or theirs (merge)
  let preferredOrder: Readonly<T.MoveOrder[]> = yourChanges.universalPropChanges?.moveOrder?.new || baseOrder;
  //If undefined, no conflict, so only one or neither of you changed moveOrder
  let nonPreferredOrder: Readonly<T.MoveOrder[]> | undefined = undefined;
  
  const moveOrderConflict: T.Conflict | undefined = yourChanges.conflictList?.universalProps?.moveOrder;
  const resolution: T.Conflict["resolution"] | undefined = moveOrderConflict?.resolution ?? undefined;
  if(moveOrderConflict && resolution && resolution !== "no-op" && resolution.type === "modify") {
    preferredOrder = resolution.new as T.MoveOrder[];
    nonPreferredOrder = ( (preferredOrder === moveOrderConflict.yours) ? moveOrderConflict.theirs : moveOrderConflict.yours ) as T.MoveOrder[];
  }
  //In rebase, preferring theirs is a no-op (can't no-op in merge)
  if(resolution === "no-op") {
    nonPreferredOrder = preferredOrder; //aka your new
    preferredOrder = baseOrder;
  }

  //Starts as shallow clone of baseOrder, then updated with resolved move additions/deletions
  let resolvedOrder: T.MoveOrder[] = [...baseOrder]; //for fast ordered insertion
  let resolvedOrderMap: Map<string, T.MoveOrder> = new Map<string, T.MoveOrder>(baseOrder.map((item)=>[item.name, item])); //for fast lookups
  //These maps also contain each item's index for instant lookup
  type OrderIndex = [T.MoveOrder, number];
  let preferredOrderMap: ReadonlyMap<string, OrderIndex> = new Map<string, OrderIndex>(preferredOrder.map((item, index)=>[item.name, [item, index]]));
  let nonPreferredOrderMap: ReadonlyMap<string, OrderIndex> | undefined = 
    nonPreferredOrder ? new Map<string, OrderIndex>(nonPreferredOrder.map((item, index)=>[item.name, [item, index]])) : undefined;

  // If basis more than one revision newer than a changelist's basis, conflict resolution can produce a move addition because 
  // the changelist modified a move not present in the basis and the user chose to re-add it.
  // The out-of-date changeList would be yours if rebasing, theirs if merging.
  let mergedStealthAdditions: T.MoveOrder[] = [];
  // Loop through resolved changes, if resolved change has add/delete moveName, add/remove from resolvedOrder
  if(yourChanges.moveChanges) {
    let yourChangeList: T.MoveChangeList = yourChanges.moveChanges;
    for(const name of keys(yourChangeList)) {
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
                if(isMerge) {
                  //If merging, you might or not have changed order, but the resolved addition is from them, and it's not present in your order
                  mergedStealthAdditions.push(item);
                }
              }
            }
            else console.log("Found and inserted from preferred");

            //let item: T.MoveOrder;
            //let index: number;
            ////If one of the changeLists manually added the move, or it was added by resolution and the changelist made other alterations to its moveorder
            //let additionIndex: OrderIndex | undefined = preferredOrderMap.get(name) || nonPreferredOrderMap?.get(name);
            //if(additionIndex) {
              //[item, index] = additionIndex;
            //}
            //else {
              ////If not manually added and changelist addition came from didn't otherwise modify its own move order, can't know where the move was in their order.
              ////In that case, shove it at the end.
              //[item, index] = [{name: name}, resolvedOrder.length];
              //if(theirChanges) {
                ////If merging, you might or not have changed order, but the resolved addition is from them, and it's not present in your order
                //mergedStealthAdditions.push(item);
              //}
            //}
            //resolvedOrder.splice(index, 0, item); //naively shove it in the same position
            //resolvedOrderMap.set(name, item);
            //TODO: if there's multiple adjacent additions (common if series added), not sure they'll keep their order...
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
      //If you changed but merging without conflict, means only you changed order, NOPE->or nobody changed (return resolved), or they changed to your old or new (precludes resolution addition)
      //If they caused a stealth addition-from-resolution, and you changed order, manually insert additions to preferred
      console.log("You made uncontested moveOrder changes while merging, returning your order with stealth additions " + JSON.stringify(mergedStealthAdditions));
      return preferredOrder.concat(mergedStealthAdditions);
    }
  }

  //Rebase preferring base already returned resolved
  //Merge preferring yours already returned preferred+stealthAdditions
  // ----------------- RESOLVED NOW HAS EXACTLY WHAT MOVES SHOULD AND SHOULDN'T BE PRESENT -----------------
  // ----------------- THERE IS NOW A NONPREFERRED ORDER AND A LEGITIMATE ORDERING CONFLICT -----------------
  // ----------------- PREFERRED === YOURS (IN REBASE), THEIRS (IN MERGE) -----------------
  // ----------------- NONPREFERRED === RESOLVED (IN REBASE), YOURS W/O RESOLUTION (IN MERGE) -----------------
  //Merge preferring theirs, both changed, nonpreferred/yours has your manual additions but not their manual+stealth additions
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



export function invertChanges(changeDoc: T.ChangeDoc): T.ChangeDoc {
  //Just swap additions/deletions and modify new/old
  throw new Error("Not implemented");
}
// Returns columns with changes applied. If columns are null (eg for new move), creates columns from changes.
// Note this doesn't do sorting, new columns are added to the end. Returns a changed deep clone.
// Returns empty object if every column was deleted.
export function getChangedCols(originalCols: Readonly<T.Cols> | undefined, changes: T.Changes | undefined): T.Cols {
  let newCols: T.Cols = originalCols ? cloneDeep<T.Cols>(originalCols) : {};
  if(!changes && !originalCols) throw new Error("originalCols and changes cannot both be undefined");
  if(!changes) return newCols; 

  for(const [key, change] of keyVals(changes)) {
    if(!change) continue;
    if(change.type === "modify" || change.type === "add") {
      //if(change.type === "add" && originalCols[key] !== undefined) console.warn(`Adding ${JSON.stringify(change)} to move despite existing data ${JSON.stringify(originalCols[key])}`);
      newCols[key] = change.new;
    }
    else if(change.type === "delete") {
      delete newCols[key];
    }
  };
  console.log(`Changed columns for ${changes.moveName} from ${JSON.stringify(originalCols)} to ${JSON.stringify(newCols)} `);
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
  for(const [key, newChange] of keyVals(newChanges)) {
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
  if(keys(result).length ===0) {
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
