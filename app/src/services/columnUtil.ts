//import { groupListAll, ColumnDef, ColumnDefs, DataType } from '../types/characterTypes'; 
import * as T from '../types/characterTypes'; 
import * as util from '../services/util';
import type { FieldError } from '../types/utilTypes'; //==
import { specialDefs } from '../constants/internalColumns';
import { cloneDeep, sortBy } from 'lodash';

//Inserts mandatory definitions defined in internalColumns, and meta/builtin definitions if desired.
//Also optionally compile regexes to do highlighting for NumStr and TagStr columns.
export function insertDefsSortGroupsCompileRegexes(defs: Readonly<T.ColumnDefs>, isUniversalProps: boolean, insertBuiltin: boolean, compileRegexes: boolean) {
  const path = isUniversalProps ? "universalPropDefs" : "columnDefs";
  let newDefs = cloneDeep<T.ColumnDefs>(defs);

  //builtin defs at front
  if(insertBuiltin) {
    newDefs = {...specialDefs.builtin[path], ...newDefs}; 
  }
  //insert mandatory defs if missing, but don't overwrite
  console.log("Defs before mandatory added: " + util.keys(newDefs));
  for(const [key, def] of util.keyVals(specialDefs.mandatory[path])) {
    if(!def) continue;
    if(!newDefs[key]) {
      newDefs[key] = specialDefs.mandatoryWithSuggested[path][key] ?? def;
    }
    else { //if admins have a definition for this column, just override the properties they can't change
      newDefs[key] = {...newDefs[key], ...def};
    }
  }
  console.log("Defs after mandatory added: " + util.keys(newDefs));
  let result: T.ColumnDefs = {};
  const order: Readonly<string[]> = util.keys(newDefs);

  // Loop over groups to ensure they're all present and newDefs are properly ordered, also compile regexes
  let nextItemIndex = 0;
  for(let group of T.groupListAll) {
    for(let key of order) {
      const def: T.ColumnDef | undefined = newDefs[key];
      if(!def) throw new Error("Cannot find definition for "+key);
      if(def.group === group) {
        if(order[nextItemIndex] !== key) {
          //console.log(`definition ${key} in group ${group} is out of order`);
          //everything between the misplaced item and where it's moved to will be considered misplaced
        }
        result[key] = def;
        nextItemIndex++;
        if(compileRegexes) {
          if(def.dataType === T.DataType.NumStr && !def._compiledNumStrRegex) {
            def._compiledNumStrRegex = getNumStrColRegex(def);
          }
          else if(def.dataType === T.DataType.TagStr && !def._compiledTagStrRegex) {
            def._compiledTagStrRegex = getTagStrColRegex(def);
          }
        }
      }
    }
  }
  return result;
}

export function repairOrder(order: Readonly<string[]>, defs: Readonly<T.ColumnDefs>): string[] {
  let newOrder: string[] = sortBy(order, (key: string) => {
    let keyDef = defs[key];
    if(!keyDef) console.error(`Error repairing order, cannot find def for ${key}`);
    return keyDef ? T.groupList.indexOf(keyDef.group) : 999;
  });
  return newOrder;
}

// Returns an ordered array of widths at each breakpoint, using widths from lower BPs if current BP has no width. 
// If no width for size-xs, items will be undefined until a width is specified. But the def editor is not supposed to allow that.
export function getColWidths(widths?: T.ColumnDef['widths']): (number | undefined)[] | undefined {
  if(widths) {
    if(!widths['size-xs']) {
      //console.warn(`Widths are defined, but not for the xs breakpoint.`);
    }
    let result: (number | undefined)[] = [];
    let lastWidth: number | undefined;
    for(const bp of T.BPList) {
      const width = widths[`size-${bp}`];
      result.push(width || lastWidth);
      if(width) {
        lastWidth = width;
      }
    }
    return result;
  }
  return undefined;
}
export function getWidthAtBP(bp: T.Breakpoint, widths: T.ColumnDef['widths']): number | undefined {
  if(!widths) return undefined;
  const prevWidth: (bp: T.Breakpoint) => T.Breakpoint | undefined = (bp: T.Breakpoint) => bp==='xl' ? 'lg' : bp==='lg' ? 'md' : bp==='md' ? 'sm' : bp==='sm' ? 'xs' : undefined;
  //let width: number | undefined = widths[`size-${bp}`];
  let currentBP: T.Breakpoint | undefined = bp;
  while(currentBP) {
    const width = widths[`size-${currentBP}`];
    if(width) return width;
    currentBP = prevWidth(currentBP);
  }
  return undefined;
}


//returns string converted to columnData, with "empty" or unconvertable data as undefined
export function strToColData(str: string | undefined, type: T.DataType): T.ColumnData | undefined {
  if(!str || str.length === 0) return undefined;
  switch(type) {
    case T.DataType.Int: {
      return Number.parseInt(str);
    }
    case T.DataType.Num: {
      return Number.parseFloat(str);
    }
    case T.DataType.Str:
    case T.DataType.NumStr: 
    case T.DataType.TagStr: {
      return str;
    }
    case T.DataType.Ord: {
      let maybeOrder = JSON.parse(str) as T.MoveOrder[];
      if(!Array.isArray(maybeOrder)) console.warn("Unable to parse into MoveOrder[]:"+str);
      return maybeOrder.length > 0 ? maybeOrder : undefined;
    }
    case T.DataType.List: {
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

export function colDataToPrintable(defData: T.ColumnDefAndData): string | number {
  let data = defData.data;
  const type = defData.def?.dataType;
  if(type) {
    if(data === undefined) return '-';
    else if(isNumber(data, type)) return data;
    else if(isString(data, type)) return data;
    else if(isList(data, type)) return data.join(' ');
  }
  return JSON.stringify(data);
}

export function parseNumStrVal(data: string, def: T.ColumnDefRestrictions): number | string | undefined {
  //Parses "0.17" or ".17[8]" as .17
  let num = Number.parseFloat(data);
  if(!isNaN(num)) {
    return num;
  }
  else {
    for(const allowedVal of def.allowedValues ?? []) {
      if(data.startsWith(allowedVal)) return allowedVal;
    }
  }
  return undefined;
}

//TODO: build this once per definition when ddoc loaded (and make sure defs aren't being cloned or no point). Perhaps integrate with cssRegex?
export function getNumStrColRegex(def: T.ColumnDefRestrictions): RegExp {
  let str = def.allowedValues ?
    // Escape special characters
    def.allowedValues.map(s => s.replace(/[()[\]{}*+?^$|#.,\/\\\s-]/g, "\\$&"))
    // Sort for maximal munch
    .sort((a, b) => b.length - a.length)
    .join("|")
    + '|'
    : '';
  str += "(?:[+-]?\\d*(?:\\.\\d+)?)";
  return new RegExp(str);
}

//TODO: test. 
export function parseTagStrList(data: string, def: T.ColumnDefRestrictions): string[] {
  return def.allowedValues
    ? def.allowedValues.filter((val) => data.includes(`[${val}]`))
    : [];
}
//matches instances of allowedValues inside [] brackets (doesn't capture the brackets though)
export function getTagStrColRegex(def: T.ColumnDefRestrictions): RegExp {
  let str = def.allowedValues ?
    '\\[(' + //whole thing goes in capture group for string.split(), omit brackets from capture group so they get split.
    // Escape special characters
    def.allowedValues.map(s => s.replace(/[()[\]{}*+?^$|#.,\/\\\s-]/g, "\\$&")) 
    // Sort for maximal munch
    .sort((a, b) => b.length - a.length)
    .join("|")
    + ')\\]'
    : '$.^'; //if no allowedValues (which would be weird for a tagStr), return impossible regex matching nothing
  return new RegExp(str, 'g');
}

export function checkInvalid(data: T.ColumnData | undefined, def: T.ColumnDefRestrictions & {columnName: string}): false | FieldError {
  const colName = def.columnName;
  const dataType: T.DataType = def.dataType;

  //check that this function actually receives undefined instead of empty strings or arrays
  //make exception for admins creating new columns that start with empty columnNames
  if((data === "" && colName !== "columnName") || data === null || (Array.isArray(data) && data.length===0)) {
    console.error("checkInvalid received empty-ish data for "+def.columnName+" instead of undefined");
  }

  // If column not required, undefined data passes all other checks
  if(data === undefined) {
    if(def.required) {
      return {columnName: colName, message: "Required column"};
    }
    else {
      return false;
    }
  }

  // Parse out NumericStrings which could effectively be a number or string value. If they have a number, stringValue will be the full string.
  let stringValue: null | string = (isString(data, dataType)) ? data : null;
  let numberValue: null | number = (isNumber(data, dataType)) ? data : null;
  //TODO: listValue... don't think TagStr needs it for anything. Make sure nothing starts/ends with whitespace, and that vals are unique, and they're in allowedVals (if multiselect)

  if(isNumericString(data, dataType)) {
    let numOrStr = parseNumStrVal(data, def);
    if(typeof numOrStr === 'number') {
      numberValue = numOrStr;
    }
    else if(numOrStr === undefined) {
      const allowedMsg = def.allowedValues ? "or one of " + def.allowedValues.join(', ') : "";
      return {columnName: colName, message: "Must begin with number or one of " + allowedMsg};
    }
  }
  else if(isTagString(data, dataType)) {
    //nothing special here
  }
  else if(def.allowedValues) {
    if(stringValue !== null) {
      if(!def.allowedValues.includes(stringValue)) { 
        return {columnName: colName, message: "Allowed values: " + def.allowedValues.join(', ')};
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
    if(stringValue !== null) { //NumStr always checks string length, not number value
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


export function dataTypeIsString(dataType: T.DataType): boolean {
  return dataType === T.DataType.Str || dataType === T.DataType.NumStr || dataType === T.DataType.TagStr;
}
export function isString(data: T.ColumnData, dataType: T.DataType): data is string {
  return typeof data === "string" && dataTypeIsString(dataType);
}
export function isBasicString(data: T.ColumnData, dataType: T.DataType): data is string {
  return typeof data === "string" && dataType === T.DataType.Str;
}
export function dataTypeIsNumber(dataType: T.DataType): boolean {
  return dataType ===T.DataType.Num || dataType ===T.DataType.Int;
}
export function isNumber(data: T.ColumnData, dataType: T.DataType): data is number {
  return typeof data === "number" && dataTypeIsNumber(dataType);
}
export function isNumericString(data: T.ColumnData, dataType: T.DataType): data is string {
  return typeof data === "string" && dataType ===T.DataType.NumStr;
}
export function isTagString(data: T.ColumnData, dataType: T.DataType): data is string {
  return typeof data === "string" && dataType ===T.DataType.TagStr;
}
export function isMoveOrder(data: T.ColumnData, dataType: T.DataType): data is T.MoveOrder[] {
  return Array.isArray(data) && dataType ===T.DataType.Ord;
}
export function dataTypeIsList(dataType: T.DataType): boolean {
  return dataType ===T.DataType.List;
}
export function isList(data: T.ColumnData, dataType: T.DataType): data is string[] {
  return Array.isArray(data) && dataTypeIsList(dataType);
}

export function dataTypesAreCompatible(type1: T.DataType, type2: T.DataType): boolean {
  return (dataTypeIsString(type1) === dataTypeIsString(type2)) &&
    (dataTypeIsNumber(type1) === dataTypeIsNumber(type2)) &&
    (dataTypeIsList(type1) === dataTypeIsList(type2));
}
