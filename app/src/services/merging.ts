import type {CharDoc, ChangeList, ColumnChange, MoveConflicts, Conflict, MoveChanges, ColumnData, ColumnDef} from '../types/characterTypes'; //== 
import { cloneDeep } from 'lodash';

export function applyChangeList(doc: CharDoc, changes: ChangeList) {
  //modify doc, don't return copy
}
export function generateConflicts(theirDoc: CharDoc, yourChanges: ChangeList): MoveConflicts[] {
  //walk through your changes, creating a default resolution for any that auto-resolve, or resolution = null for conflicts
  for(let change of yourChanges.moveChanges) {
    let theirCols: ColumnData[];// = (change.moveName === "universalProps") ? theirDoc.universalProps : (theirDoc.SFDFSFSDF)
    if(change.moveName === "universalProps") {
      theirCols = theirDoc.universalProps;
    } else {
      //TODO: Finish
    }
  }
  return [];
}
export function getMoveConflict(theirCols: ColumnData[], yourChanges: MoveChanges): MoveConflicts | null{
  return null;
}
export function autoResolve(conflict: Conflict) {
  let {theirChange: theirs, yourChange: yours, original: og, resolution: res} = {...conflict};
  // need deep compare for ColumnData
  //if(theirs )
}
export function columnsMatch(a: ColumnData, b: ColumnData): Boolean {
  return a.columnName === b.columnName && a.data === b.data;
}
// Note this doesn't do sorting, new columns are added to the end.
export function getChangedCols(originals: Readonly<ColumnData[]>, changes: MoveChanges): ColumnData[] {
  let newCols: ColumnData[] = [...originals];
  // replace existing columns with changes
  //for(const change of changes.modified) {
    //const index = newCols.findIndex((col) => col.columnName === change.new.columnName);
    //if(index !== -1) { //if there's a change to a column that's not present, ignore it
      //newCols[index] = change.new;
    //}
  //}
  //// add new columns to the end
  //for(const addition of changes.added) {
    //newCols.push(addition);
  //}
  //// delete specified columns
  //for(const deletion of changes.deleted) {
    //const index = newCols.findIndex((col) => col.columnName === deletion.columnName);
    //if(index !== -1) { //if column was already deleted, ignore
      //newCols.splice(index,1);
    //}
  //}
  //Iterate over originals while modifying the copy
  //TODO: test that deletion doesn't mess this up
  originals.forEach((col, index) => {
    const change: ColumnChange | undefined = changes.changes[col.columnName];
    if(change.type === "modify") {
      newCols[index] = change.new;
    }
    else if(change.type === "add") {
      newCols.splice(index,1); //delete the original, new will be added below
      console.warn(`Adding ${JSON.stringify(change)} to ${changes.moveName} despite existing data ${JSON.stringify(originals[index])}`);
    }
    else if(change.type === "delete") {
      newCols.splice(index,1);
    }
  });
  //loop over looking for newly added columns
  for(const key in changes.changes) {
    let change: ColumnChange = changes.changes[key];
    if(change.type === "add") {
      newCols.push(change.new);
    }
  }
  console.log(`Changed columns for ${changes.moveName} from ${JSON.stringify(originals)} to ${JSON.stringify(newCols)} `);
  return newCols;
}

//Can be called recursively on an array of MoveChanges using array.reduce and passing this function.
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
export function reduceChanges(accumulator: Readonly<MoveChanges>, newChanges: Readonly<MoveChanges>, compress: boolean = true): MoveChanges {
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
    ////if not null, these MoveChanges must have 2 empty arrays, and 1 array with 1 item.
    //oldChange: MoveChanges | null; 
    //newChange: MoveChanges | null;
  //}
  let result: MoveChanges = cloneDeep<MoveChanges>(accumulator);
  
  //iterate over newChanges, checking acc for changes to same column
  for(const key in newChanges) {
    let change: ColumnChange = newChanges.changes[key];
  }


  return result;
}
