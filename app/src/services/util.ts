// "import type" is a hint ensuring it's not exported to JS. Confuses highlight regex until it sees an = though
import type * as T from '../types/characterTypes'; //== 
import {DataType} from '../types/characterTypes'; //== 
import type { FieldError } from '../types/utilTypes'; //==

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
//export function getConflictsByMoveName(moveName: string, conflictList: T.ConflictList): T.Conflicts | undefined {
  //return conflictList.find((conflict) => {return conflict.moveName === moveName});
//}
export function getChangeListMoveOrder(changeList: T.ChangeDoc): T.MoveOrder[] | null {
  let orderChange = changeList?.universalPropChanges?.moveOrder;
  if(orderChange) {
    return orderChange.new;
  }
  return null;
}

//add and remove a specific change from changelist, handling the missing key if there's no changes
export function addMoveChange(changeList: T.ChangeDoc, moveName: string, moveChanges: T.MoveChanges): void {
  if(changeList.moveChanges) {
    changeList.moveChanges[moveName] = moveChanges;
  }
  else { //if this is the first moveChange
    changeList.moveChanges = {[moveName]: moveChanges};
  }
}
export function deleteMoveChange(changeList: T.ChangeDoc, moveName: string): void {
  if(changeList.moveChanges) {
    delete changeList.moveChanges[moveName];
    if(keys(changeList.moveChanges).length === 0) {
      delete changeList.moveChanges;
    }
  }
}

//returns string converted to columnData, with "empty" or unconvertable data as undefined
export function strToColData(str: string | undefined, type: T.DataType): T.ColumnData | undefined {
  if(!str || str.length === 0) return undefined;
  switch(type) {
    case DataType.Int: {
      return Number.parseInt(str);
    }
    case DataType.Num: {
      return Number.parseFloat(str);
    }
    case DataType.Str:
    case DataType.NumStr:
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

export function colDataToPrintable(data: T.ColumnData | undefined, type: T.DataType): string | number {
  if(data === undefined) return '-';
  else if(isNumber(data, type)) return data;
  else if(isString(data, type)) return data;
  return JSON.stringify(data);
}



export function checkInvalid(data: T.ColumnData | undefined, def: T.ColumnDef): false | FieldError {
  const colName = def.columnName;
  const dataType: DataType = def.dataType;

  //TODO: check that this function receives undefined instead of empty strings or arrays
  // If column not required, undefined data passes all other checks
  if(data === undefined) {
    if(def.required) {
      return {columnName: colName, message: "Required column"};
    }
    else {
      return false;
    }
  }

  // Parse out NumericStrings which could effectively be a number or string value
  let stringValue: null | string = (isBasicString(data, dataType)) ? data : null;
  let numberValue: null | number = (isNumber(data, dataType)) ? data : null;
  if(isNumericString(data, dataType)) {
    let num = Number.parseInt(data);
    if(isNaN(num)) num = Number.parseFloat(data);
    if(!isNaN(num)) {
      numberValue = num;
    }
    else stringValue = data;
  }

  if(def.allowedValues) {
    if(stringValue !== null) {
      if(!def.allowedValues.includes(stringValue)) {
        const numsAllowed = (dataType === DataType.NumStr) ? "Numbers or " : "";
        return {columnName: colName, message: "Allowed values: " + numsAllowed + JSON.stringify(def.allowedValues)};
      }
    }
  }

  if(def.forbiddenValues) {
    if(stringValue !== null) {
      if(def.forbiddenValues.includes(stringValue)) {
        return {columnName: colName, message: "Forbidden value"};
      }
    }
  }

  if(def.minSize) {
    if(stringValue !== null) {
      if(stringValue.length < def.minSize) {
        return {columnName: colName, message: "Minimum length:"+def.minSize};
      }
    }
    else if(numberValue !== null) {
      if(numberValue < def.minSize) {
        return {columnName: colName, message: "Minimum value:"+def.minSize};
      }
    }
  }

  if(def.maxSize) {
    if(stringValue !== null) {
      if(stringValue.length > def.maxSize) {
        return {columnName: colName, message: "Maximum length:"+def.maxSize};
      }
    }
    else if(numberValue !== null) {
      if(numberValue > def.maxSize) {
        return {columnName: colName, message: "Maximum value:"+def.maxSize};
      }
    }
  }

  return false;
}


export function isString(data: T.ColumnData, dataType: T.DataType): data is string {
  return dataType === DataType.Str || dataType === DataType.Txt || dataType === DataType.NumStr;
}
export function isStringColumn(data: T.ColumnData, columnName: string): data is string {
  return columnName === "moveName";
}
export function isBasicString(data: T.ColumnData, dataType: T.DataType): data is string {
  return dataType === DataType.Str || dataType === DataType.Txt;
}
export function isNumber(data: T.ColumnData, dataType: T.DataType): data is number {
  return dataType === DataType.Num || dataType === DataType.Int;
}
export function isNumericString(data: T.ColumnData, dataType: T.DataType): data is string {
  return dataType === DataType.NumStr;
}
export function isMoveOrder(data: T.ColumnData, dataType: T.DataType): data is T.MoveOrder[] {
  //return Array.isArray(data) && (data.length === 0 || "name" in data[1]);
  return dataType === DataType.Ord;
}
//export * as Util; not needed (or possible), just do import * as Util
