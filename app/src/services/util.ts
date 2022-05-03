// "import type" is a hint ensuring it's not exported to JS. Confuses highlight regex until it sees an = though
import type * as T from '../types/characterTypes'; //== 
import {DataType} from '../types/characterTypes'; //== 

//export function keys<T extends object>(obj: T): Array<keyof T> { //was always insisting keys could be string | number, maybe since number keys get coerced to strings
export function keys<T extends object>(obj: T): Array<string> {
    return Object.keys(obj) as Array<string>;
}
export function keyVals<T extends object>(obj: T): Array<[keyof T, T[keyof T]]> {
    return Object.entries(obj) as Array<[keyof T, T[keyof T]]>;
}

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
export function getConflictsByMoveName(moveName: string, conflicts: T.MoveConflicts[]): T.MoveConflicts | undefined {
  return conflicts.find((conflict) => {return conflict.moveName === moveName});
}
export function isMoveOrder(data: T.ColumnData): data is T.MoveOrder[] {
  //returns true for empty array
  return Array.isArray(data) && (data.length === 0 || "name" in data[1]);
}
export function getChangeListMoveOrder(changeList: T.ChangeDoc): T.MoveOrder[] | null {
  let orderChange = changeList?.universalPropChanges?.moveOrder;
  if(orderChange) {
    if(orderChange.type === "add" || orderChange.type === "modify") {
      return orderChange.new;
    }
  }
  return null;
}

//export function isEmptyData(data: T.ColumnData): boolean {
  //if(typeof data === "string") return data.length === 0;
  //else if(Array.isArray(data)) return data.length === 0;
  //return false;
//}
//returns string converted to columnData, with "empty" or unconvertable data as undefined
export function strToColData(str: string, type: T.DataType): T.ColumnData | undefined {
  if(str.length ===0) return undefined;
  switch(type) {
    case DataType.Int: {
      return Number.parseInt(str);
    }
    case DataType.Num: {
      return Number.parseFloat(str);
    }
    case DataType.Str:
    case DataType.Txt: {
      return str;
    }
    case DataType.Ord: {
      let maybeOrder = JSON.parse(str) as T.MoveOrder[];
      return maybeOrder.length > 0 ? maybeOrder : undefined;
    }
  }
  return assertUnreachable(type);
}
export function assertUnreachable(x: never): never {
    throw new Error("Return this at end of switch statement with value being switched on to type check exhaustiveness");
}

//export * as Util; not needed (or possible), just do import * as Util
