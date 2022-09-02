// "import type" is a hint ensuring it's not exported to JS. Confuses highlight regex until it sees an = though
import type * as T from '../types/characterTypes'; //== 
import {DataType} from '../types/characterTypes'; //== 
import type { FieldError } from '../types/utilTypes'; //==
import { getChangedCols } from '../services/merging';
import { SegmentUrl } from '../types/utilTypes';

//export function keys<T extends object>(obj: T): Array<keyof T> { //was always insisting keys could be string | number, maybe since number keys get coerced to strings
export function keys<T extends object>(obj: T): Array<string> {
    return Object.keys(obj) as Array<string>;
}
export function keyVals<T extends object>(obj: T): Array<[string, T[keyof T]]> {
    return Object.entries(obj) as Array<[string, T[keyof T]]>;
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

export function getSegmentUri(gameId: string, character: string, segment: SegmentUrl): string {
  return "/game/"+gameId+"/character/"+character+segment;
}
export function getChangeUri(gameId: string, character: string, changeTitle: string): string {
  return getSegmentUri(gameId, character, SegmentUrl.Changes) + '/' +changeTitle;
}

//TODO: how is this at all better than just optional chaining
export function getChangeListMoveOrder(changeList: T.ChangeDoc): T.MoveOrder[] | null {
  let orderChange = changeList?.universalPropChanges?.moveOrder;
  if(orderChange) {
    return orderChange.new;
  }
  return null;
}

export function getNewFromChange(change: T.ColumnChange): T.ColumnData | undefined {
  return (change.type === 'delete') ? undefined : change.new;
}
export function getOldFromChange(change: T.ColumnChange): T.ColumnData | undefined {
  return (change.type === 'add') ? undefined : change.old;
}
export function getOppositeResolution(resolution: "yours" | "theirs"): "yours" | "theirs" {
  return resolution === "yours" ? "theirs" : "yours";
}
export function isConflictMoveOrderMergeBothChange(conflict: T.ConflictMoveOrder): conflict is T.ConflictMoveOrderMergeBothChange {
  return conflict.yours !== "no-op" && conflict.theirs !== "no-op";
}
export function isConflictMoveOrderMergeTheyChange(conflict: T.ConflictMoveOrder): conflict is T.ConflictMoveOrderMergeTheyChange {
  return conflict.yours === "no-op";
}
export function isConflictMoveOrderRebaseBothChange(conflict: T.ConflictMoveOrder): conflict is T.ConflictMoveOrderRebaseBothChange {
  return conflict.theirs === "no-op";
}

//add and remove a specific change from changelist, handling the missing key if there's no changes
//Works when universalProps given as moveName
//Null moveChanges means delete changes
export function updateMoveOrPropChanges(changeList: T.ChangeDoc, moveName: string, moveChanges: Readonly<T.Changes> | null, updateRefs: boolean=false): T.ChangeDoc {
  const isPropChange = moveName === "universalProps";
  if(moveChanges) {
    if(isPropChange) {
      changeList.universalPropChanges = moveChanges as T.PropChanges;
    }
    else {
      if(changeList.moveChanges) {
        changeList.moveChanges[moveName] = moveChanges as T.MoveChanges;
      }
      else { //if this is the first moveChange
        changeList.moveChanges = {[moveName]: moveChanges as T.MoveChanges};
      }
    }
  }
  else { //delete changes
    if(isPropChange) {
      delete changeList.universalPropChanges;
    }
    else {
      if(changeList.moveChanges) {
        delete changeList.moveChanges[moveName];
        if(keys(changeList.moveChanges).length === 0) {
          delete changeList.moveChanges;
        }
      }
    }
  }
  // Update the changeList.moveChanges reference for react rendering updates.
  if(updateRefs) {
    if(!isPropChange && changeList.moveChanges) {
      changeList.moveChanges = {...changeList.moveChanges};
    }
    return {...changeList};
  }
  return changeList;
}


export function updateColumnChange(changeList: T.ChangeDoc, moveName: string, columnName: string, change: Readonly<T.ColumnChange> | null, updateRefs: boolean=false): T.ChangeDoc {
  let changes: T.Changes | null = ((moveName === "universalProps") ? changeList.universalPropChanges : changeList.moveChanges?.[moveName]) ?? null;
  if(change) { //getting one change means move changes can't be null
    changes = {...changes, [columnName]: change} as T.Changes;
  }
  else if(changes) { //deleting what might be the last change
    delete changes?.[columnName];
    if(keys(changes).length === 0) {
      changes = null;
    }
    else changes = {...changes};
  }
  return updateMoveOrPropChanges(changeList, moveName, changes, updateRefs);
}


export function updateColumnConflict(changeList: T.ChangeDoc, moveName: string, columnName: string, conflict: Readonly<T.Conflict> | null, updateRefs: boolean=false): T.ChangeDoc {
  let conflicts: T.Conflicts | null = changeList.conflictList?.[moveName] ?? null;
  if(conflict) { //getting one conflict means move conflicts can't be null
    conflicts = {...conflicts, [columnName]: conflict} as T.Conflicts;
  }
  else if(conflicts) { //deleting what might be the last conflict
    delete conflicts?.[columnName];
    if(keys(conflicts).length === 0) delete changeList.conflictList?.[moveName];
  }
  //update reference to indicate change
  if(updateRefs) {
    if(changeList.conflictList) changeList.conflictList = {...changeList.conflictList};
    return {...changeList};
  }
  return changeList;
}

  // Returns definition/data pairs ordered by provided defs. Data with no definition goes at end with display set to false.
  // If columns and changes both empty (like for new move), returns just definitions
export function getDefsAndData(columnDefs: T.ColumnDefs, columns?: T.Cols, changes?: Readonly<T.Changes>): T.ColumnDefAndData[] {
  let result: T.ColumnDefAndData[] = [];
  let changedCols: T.Cols = {};
  if(columns || changes) changedCols = getChangedCols(columns, changes);
  let keyUnion: Set<string> = new Set(keys(columnDefs).concat(keys(changedCols)));

  for(const key of keyUnion) {
    let def: T.ColumnDef | undefined = columnDefs[key];
    let data: T.ColumnData | undefined = changedCols[key];
    let defData: T.ColumnDefAndData = {columnName: key, def: def, data: data, display: (def?.group !== "meta" && def?.group !== "defaultHide") || false};
    result.push(defData);
  }

  return result;
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
      if(!Array.isArray(maybeOrder)) console.warn("Unable to parse into MoveOrder[]:"+str);
      return maybeOrder.length > 0 ? maybeOrder : undefined;
    }
    case DataType.List: {
      let maybeList = JSON.parse(str) as string[];
      if(!Array.isArray(maybeList)) console.warn("Unable to parse into string[]:"+str);
      return maybeList.length > 0 ? maybeList : undefined;
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
    //Parses "0.17" or ".17[8]" as .17
    let num = Number.parseFloat(data);
    if(!isNaN(num)) {
      numberValue = num;
    }
    else {
      stringValue = data;
      if(!def.allowedValues) { //if there are allowed values, they'll be checked below
        return {columnName: colName, message: "Please enter number without beginning punctuation"};
      }
    }
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
  return dataType === DataType.Ord;
}
export function isList(data: T.ColumnData, dataType: T.DataType): data is string[] {
  return dataType === DataType.List;
}

