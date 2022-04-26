// "import type" is a hint ensuring it's not exported to JS. Confuses highlight regex until it sees an = though
import type * as Types from '../types/characterTypes'; //== 

export function shallowCompare(obj1: any, obj2: any): boolean {
  if(!obj1 && !obj2) { //true if both null/undefined
    return true;
  }
  else {
    return (obj1 && obj2) && //false if only one null/undefined
    Object.keys(obj1).length === Object.keys(obj2).length &&
    Object.keys(obj1).every(key => 
      obj2.hasOwnProperty(key) && obj1[key] === obj2[key]
    );
  }
}
export function getColsByMoveName(doc: Types.CharDoc, name: string): Types.ColumnData[] | undefined {
  if(name === "universalProps") return doc.universalProps;
  let move: Types.Move | undefined = doc.moves.find((move) => move.moveName === name);
  return move ? move.columnProps : undefined;
}
export function getColDefByName(ddoc: Types.DesignDoc, columnName: string): Types.ColumnDef | undefined {
  return ddoc.columnDefs.find((def) => {return def.columnName === columnName});
}
export function getChangesByMoveName(moveName: string, changes: Types.MoveChanges[]): Types.MoveChanges | undefined {
  return changes.find((change) => {return change.moveName === moveName});
}
export function getConflictsByMoveName(moveName: string, conflicts: Types.MoveConflicts[]): Types.MoveConflicts | undefined {
  return conflicts.find((conflict) => {return conflict.moveName === moveName});
}

//export * as Util; not needed (or possible), just do import * as Util
