import type * as T from '../types/characterTypes'; //== 
import { keyVals } from '../services/util';
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
// Note this doesn't do sorting, new columns are added to the end. Returns a changed deep clone.
// Returns empty object if every column was deleted.
export function getChangedCols(originalCols: Readonly<T.Cols>, changes: T.Changes): T.Cols {
  let newCols: T.Cols = cloneDeep<T.Cols>(originalCols);
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

//Can be called recursively on an array of T.Changes using array.reduce and passing this function.
//Reconciles places where both changes touched same data, and combines changes to different data.
//NewChanges assumes changes are made to RESULT of last changes.
//If compress=true, it becomes a no-op if the final value matches the starting value, and the original is used for history.
//Set to false if combining changes from multiple people and want history of every step. 
//Point is to make a useable delta from original state... only "compressing" actually does that.
//If you want to apply long list of canon changes (which I don't yet), non-compressed allows that without constantly applying change to state.
// A modify B modify C modify D = compressed produces A-modify-D, uncompressed produces C-modify-D
// A-modify-D is a delta representing shortest path from A to D, lets you roll back to A
// Non-compressed vs just newChanges: Non-compressed includes previous changes newChanges didn't touch. Otherwise same.
// What use is the history of a delta? Compressed allows rollback to original, 
// uncompressed's history lets each column rollback 1 change. How's that useful?
export function reduceChanges(accumulator: Readonly<T.Changes>, newChanges: Readonly<T.Changes>, compress: boolean = true): T.Changes {
/*
   {NOOP} means no change if og value = new value and compressing
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
   1) if compressing and og value = new value (including "deleted"), noop.
   2) modify/delete store acc's old value if compressing 
   3) if not compressing, just do union of accumulator and newChanges, with latter taking priority if same column has eg add and delete and modify
*/
  //type columnChange = {
    //colName: string;
    ////if not null, these T.Changes must have 2 empty arrays, and 1 array with 1 item.
    //oldChange: T.Changes | null; 
    //newChange: T.Changes | null;
  //}
  let result: T.Changes = cloneDeep<T.Changes>(accumulator);
  
  //iterate over newChanges, checking acc for changes to same column
  for(const key in newChanges) {
    //let change: T.ColumnChange = newChanges.changes[key];
  }

  return result;
}
//apply single change to column. Undefined originalData means it wasn't present.
export function applyChange(originalData: T.ColumnData | undefined, change: T.ColumnChange): T.ColumnData | undefined {
  if(change.type === "modify" || change.type === "add") {
    return change.new;
  }
  else if(change.type === "delete") {
    return undefined;
  }
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
