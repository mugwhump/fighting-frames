import type * as T from '../types/characterTypes'; //== 
import { keys, keyVals } from '../services/util';
import { cloneDeep, isEqual } from 'lodash';

export function applyChangeList(doc: T.CharDoc, changes: T.ChangeDoc) {
  //modify doc, don't return copy
}
export function generateConflicts(theirDoc: T.CharDoc, yourChanges: T.ChangeDoc): T.MoveConflicts[] {
  //walk through your changes, creating a default resolution for any that auto-resolve, or resolution = null for conflicts
  //for(let change of yourChanges.moveChanges) {
    //let theirCols: T.ColumnData[];// = (change.moveName === "universalProps") ? theirDoc.universalProps : (theirDoc.SFDFSFSDF)
    //if(change.moveName === "universalProps") {
      //theirCols = theirDoc.universalProps;
    //} else {
      ////TODO: Finish
    //}
  //}
  return [];
}
export function getMoveConflict(theirCols: T.ColumnData[], yourChanges: T.Changes): T.MoveConflicts | null{
  return null;
}
export function autoResolve(conflict: T.Conflict) {
  let {theirChange: theirs, yourChange: yours, original: og, resolution: res} = {...conflict};
  // need deep compare for T.ColumnData
  //if(theirs )
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
