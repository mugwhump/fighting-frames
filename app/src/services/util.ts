// "import type" is a hint ensuring it's not exported to JS. Confuses highlight regex until it sees an = though
import type * as T from '../types/characterTypes'; //== 
import {DataType} from '../types/characterTypes'; //== 
import type { FieldError } from '../types/utilTypes'; //==
import { getChangedCols } from '../services/merging';
import { SegmentUrl } from '../types/utilTypes';
import * as colUtil from '../services/columnUtil';
import { generatePath } from "react-router";
import { CompileConstants } from '../constants/CompileConstants';
import sanitizeHtml from 'sanitize-html';
import { isEqual } from 'lodash';

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

//Goes through object key by key and compares them, returning a string of any properties that are different
export function recursiveCompare(propName: string, expected: unknown, actual: unknown): string {
  let result = '';
  if(typeof expected === 'object' && expected && typeof actual === 'object' && actual) {
    let keyUnion: Set<string> = new Set(keys(expected).concat(keys(actual)));
    for(const key of keyUnion) {
      let expectedVal = expected[key as keyof typeof expected];
      let actualVal = actual[key as keyof typeof actual]
      result += recursiveCompare(propName+'.'+key, expectedVal, actualVal);
    }
  }
  else {
    if(expected !== actual) {
      return `Error in ${propName}: Expected: ${JSON.stringify(expected)} Actual: ${JSON.stringify(actual)} \n`;
      //console.error(errStr)
    }
  }
  return result;
}


export function sanitizeChangeDoc(changeDoc: T.ChangeDoc): void {
  let allChanges = {...changeDoc.moveChanges, universalPropChanges: changeDoc.universalPropChanges};
  for(const [moveKey, moveChanges] of keyVals(allChanges)) {
    if(!moveChanges) continue;
    for(const [col, change] of keyVals(moveChanges)) {
      if(!change) continue;
      moveChanges[col] = getTrimmedChange(change);
    }
    //trim move keys, ensure they match add/del moveName change. Column keys can stay, there can already be made-up cols with no def
    let trimmedMoveName = moveKey.trim();
    if(moveChanges.moveName) {
      const changeName = getNewFromChange(moveChanges.moveName) || getOldFromChange(moveChanges.moveName);
      if(changeName !== trimmedMoveName) trimmedMoveName = changeName as string;
    }
    if(trimmedMoveName !== moveKey && changeDoc.moveChanges && trimmedMoveName !== 'universalPropChanges') {
      changeDoc.moveChanges[trimmedMoveName] = moveChanges as T.MoveChanges;
      delete changeDoc.moveChanges[moveKey];
    }
  }
}
//Does not modify old values to ensure continuous history
function getTrimmedChange(change: T.ColumnChange): T.ColumnChange {
  if((change.type === 'modify')) {
    //return {type: 'modify', new: trimColumnData(change.new), old: trimColumnData(change.old)};
    return {type: 'modify', new: trimColumnData(change.new), old: change.old};
  }
  else if((change.type === 'add')) {
    return {type: 'add', new: trimColumnData(change.new)};
  }
  //else return {type: 'delete', old: trimColumnData(change.old)};
  else return change;
}
function trimColumnData(data: T.ColumnData): T.ColumnData {
  if(typeof data === 'string') {
    return data.trim();
  }
  else if(Array.isArray(data)) {
    let result = [];
    for(const item of data) {
      if(typeof item === 'string') {
        result.push(item.trim());
      }
      else if(typeof item.name === 'string') {
        result.push({...item, name: item.name.trim()});
      }
    }
    return result as T.ColumnData;
  }
  return data;
}

export function trimStringProperties(record: Record<string, unknown>) {
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string") {
      record[key] = value.trim();
    }
  }
}

export function getGameUrl(gameId: string): string {
  return generatePath(CompileConstants.GAME_MATCH, {gameId: gameId});
}
export function getCharacterUrl(gameId: string, character: string): string {
  return generatePath(CompileConstants.CHARACTER_MATCH, {gameId: gameId, character: character});
}
export function getSegmentUrl(gameId: string, character: string, segment: SegmentUrl): string {
  if(segment === SegmentUrl.Base) return getCharacterUrl(gameId, character); //generatePath doesn't let segment be empty
  return generatePath(CompileConstants.SEGMENT_MATCH, {gameId: gameId, character: character, segment: segment});
}
export function getChangeUrl(gameId: string, character: string, changeTitle: string): string {
  return getSegmentUrl(gameId, character, SegmentUrl.Changes) + '/' + changeTitle;
}
export function getConfigurationUrl(gameId: string): string {
  return generatePath(CompileConstants.CONFIGURATION_MATCH, {gameId: gameId});
}
export function getAddCharacterUrl(gameId: string): string {
  return generatePath(CompileConstants.ADD_CHARACTER_MATCH, {gameId: gameId});
}
export function getDeleteCharacterUrl(gameId: string): string {
  return generatePath(CompileConstants.DELETE_CHARACTER_MATCH, {gameId: gameId});
}
export function getAuthorizedUsersUrl(gameId: string): string {
  return generatePath(CompileConstants.AUTHORIZED_USERS_MATCH, {gameId: gameId});
}
export function getApiUploadChangeUrl(gameId: string, characterId: string, changeTitle: string): string {
  return generatePath(CompileConstants.API_UPLOAD_CHANGE_MATCH, {gameId: gameId, characterId: characterId, changeTitle: changeTitle});
}
export function getApiPublishChangeUrl(gameId: string, characterId: string, changeTitle: string): string {
  return generatePath(CompileConstants.API_PUBLISH_CHANGE_MATCH, {gameId: gameId, characterId: characterId, changeTitle: changeTitle});
}
export function getApiUploadPublishChangeUrl(gameId: string, characterId: string, changeTitle: string): string {
  return generatePath(CompileConstants.API_UPLOAD_AND_PUBLISH_CHANGE_MATCH, {gameId: gameId, characterId: characterId, changeTitle: changeTitle});
}
export function getApiUploadConfigUrl(gameId: string): string {
  return generatePath(CompileConstants.API_UPLOAD_CONFIG_MATCH, {gameId: gameId});
}
export function getCharDocId(character: string): string {
  return 'character/'+character;
}
export function getChangeId(character: string, changeTitle: string): string {
  return `character/${character}/changes/${changeTitle}`;
}
export function getDocEditId(gameId: string, character: string): string {
  return getSegmentUrl(gameId, character, SegmentUrl.Edit);
}

// Gets current time in alphabetically sortable ISO UTC format YYYY-MM-DDTHH:mm:ss.sssZ
export function getDateString(): string {
  return new Date().toISOString();
}

// Needed because "2-" > "100-" > "1-"
export function getRevNumber(_rev: string): number {
  return Number.parseInt(_rev.split('-')[0]);
}

//trims spaces and escapes all tags/attributes. TODO: test how it escapes every instance of <, >, and &
export function cleanUserString(dirty: string): string {
  //disallowedTagsMode: discard turns "<a>foo</a>" into "foo". recursiveEscape turns it into "&lt;a&gt;foo&lt;/a&gt;"
  return sanitizeHtml(dirty.trim(), {allowedTags: [], allowedAttributes: {}, disallowedTagsMode: "discard"});
}
export function sanitizeWithAllowedTags(dirty: string, allowedTags: string[] = ['br', 'b', 'i']): string {
  const res = sanitizeHtml(dirty, {allowedTags: allowedTags, allowedAttributes: {}, disallowedTagsMode: "discard"});
  return res;
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
// unresolved conflict returns undefined. Otherwise returns "new" value of yours or theirs, or baseValue if no-op
export function getConflictNew(conflict: T.Conflict, baseValue: T.ColumnData, resolution?: T.Resolutions): T.ColumnData | undefined {
  if(!resolution) return undefined;
  let preferred = conflict[resolution];
  if(preferred === "no-op") return baseValue;
  return getNewFromChange(preferred);
}
//returns undefined if no resolution
export function getConflictResolvedValue(conflict: T.Conflict, baseValue: T.ColumnData): T.ColumnData | undefined {
  return getConflictNew(conflict, baseValue, conflict.resolution);
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
  if(updateRefs) {
    //if updateRefs is true, want to create new object(s) and avoid changing anything in the old one
    changeList = {...changeList};
    if(!isPropChange && changeList.moveChanges) {
      changeList.moveChanges = {...changeList.moveChanges};
    }
  }
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
  return changeList;
}


export function updateColumnChange(changeList: T.ChangeDoc, moveName: string, columnName: string, change: Readonly<T.ColumnChange> | null, updateRefs: boolean=false): T.ChangeDoc {
  let changes: T.Changes | null = ((moveName === "universalProps") ? changeList.universalPropChanges : changeList.moveChanges?.[moveName]) ?? null;
  if(change) { //getting one change means move changes can't be null
    changes = {...changes, [columnName]: change} as T.Changes;
  }
  else if(changes) { //deleting what might be the last change
    changes = {...changes}; //shallow copy before modifying original
    delete changes?.[columnName];
    if(keys(changes).length === 0) {
      changes = null;
    }
  }
  return updateMoveOrPropChanges(changeList, moveName, changes, updateRefs);
}


//Never really used for adding new conflicts, those are made by rebase/merge functions that generate whole conflict lists
//Resolving conflict for moveName resolves conflict for all other columns in move the same way
export function updateColumnConflict(changeList: T.ChangeDoc, moveName: string, columnName: string, conflict: Readonly<T.Conflict> | null, updateRefs: boolean=false): T.ChangeDoc {
  let conflicts: T.Conflicts | undefined = changeList.conflictList?.[moveName] ?? undefined;
  if(conflict) { //getting one conflict means move conflicts can't be null
    conflicts = {...conflicts, [columnName]: conflict} as T.Conflicts;
  }
  else if(conflicts) { //if removing conflict check if it's only one left
    conflicts = {...conflicts};
    delete conflicts?.[columnName];
    if(keys(conflicts).length === 0) delete changeList.conflictList?.[moveName];
    //applyResolutions handles deleting conflictList if it's empty after everything
  }
  //resolving all-or-nothing move deletion conflicts
  if(columnName === "moveName" && conflict?.resolution && conflicts) {
    for(const [key, otherConflict] of keyVals(conflicts)) {
      if(!otherConflict || key === "moveName") continue;
      if(otherConflict.resolution !== conflict.resolution) {
        conflicts[key] = {...otherConflict, resolution: conflict.resolution};
      }
    }
  }
  //update reference to indicate change
  if(updateRefs) {
    if(changeList.conflictList) changeList.conflictList = {...changeList.conflictList, [moveName]: conflicts};
    return {...changeList};
  }
  return changeList;
}

export function unresolvedConflictInList(conflictList?: Readonly<T.ConflictList>): boolean {
  if(!conflictList) return false;
  for(const moveName in conflictList) {
    const moveConflicts = conflictList[moveName];
    if(!moveConflicts) continue;
    if(unresolvedConflictInMove(moveConflicts)) return true;
  }
  return false;
}
export function unresolvedConflictInMove(moveConflicts: Readonly<T.Conflicts>): boolean {
  for(const col in moveConflicts) {
    const conflict = moveConflicts[col];
    if(!conflict) continue;
    if(!conflict.resolution) return true;
  }
  return false;
}

