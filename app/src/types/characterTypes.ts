// NOTE: there's no run-time checks that DB structure actually matches these types since 
// type info doesn't exist at runtime.
// If something's missing, it's just null or empty.

//export type ColumnOrPropDef = {
  //propName: string,
  //dataType: DataType,
//}

//export type ColumnOrPropData = {
  //propName: string,
  //data: any,
  ////outdated?: number | boolean, //false for up-to-date, true for mistake, version # for old patch properties
//}

//// Universal properties: columns can define their data, but they'd only have one col instead of array
//export type UniversalPropDef = ColumnOrPropDef;

//export type UniversalPropData = ColumnOrPropData;

/*export type UniversalPropData = {*/
  /*[propName: string]: any,*/
/*}*/

export type MoveData = number | string;
export type PropData = number | string | MoveOrder[];
//export type DataValueTypes = MoveData | PropData;
export type ColumnData = MoveData | PropData;
//export type ColumnDataOld = {
  //readonly columnName: string; //matches a ColumnDef.columnName
  //readonly data: DataValueTypes
//}
export enum DataType { //these mostly determine the editing interface presented and if shown in a column (Str) vs on its own line (Txt)
  Int = "INTEGER",
  Num = "NUMBER", //floats are likely to be used for sizes/distances/speeds
  Str = "STRING",
  Txt = "TEXT",
  Ord = "MOVE_ORDER",
  //Img = "IMAGE", //would probably be a url or base64 blob
  //List = "LIST", //array of strings, allowed values can be constrained. For move order and tags... but they want different interfaces...
  NumStr = "NUMERIC_STRING", //for things that are usually numeric/sortable, but can be strings like "KDN" or "STN" or "LAUNCH"
};

export type ColumnDef = {
  columnName: string,
  displayName?: string, //allows easier changing. Show columnName if absent.
  dataType: DataType,
  defaultShow: boolean, //TODO: this only really makes sense for metadata columns
  // Things db admins can set as required (damage etc) vs universalProps *I* can set as required (character display name, move order)
  // If they're my requirements, hardcode that into the codebase
  required: boolean; // Can't submit without required columns.
  allowedValues?: string[];//mostly for strings or tags. For Numeric Strings, says the allowed strings.
  forbiddenValues?: string[]; //for moveNames
  minSize?: number, //length of strings, number of tags, value of number
  maxSize?: number,
  allowedRegex?: RegExp; //TODO: can RegExp serialize?
  cssRegex?: {regex: RegExp, css: string}; //TODO: can RegExp serialize?
}
export type ColumnDefs = {
  [columnName: string]: ColumnDef | undefined;
}

//internal utility type lets us show empty columns with no data, or data with no definition (to prompt for deletion)
//also useful for sorting/hiding columns
export type ColumnDefAndData = {
  columnName: string;
  def?: ColumnDef;
  data?: ColumnData;
  display: boolean;
}
export interface Cols<T extends ColumnData = ColumnData> {
  [columnName: string]: T | undefined; //forces checking that column's actually there... but keys can exist with value undefined, thus show up in loops :(
}
export interface MoveCols extends Cols<MoveData> {
}
export interface PropCols extends Cols<PropData> {
  moveOrder: MoveOrder[];
}
export interface MoveOrder {
  name: string;
  isCategory?: true;
  indent?: number;
}
// Properties don't have an equivalent list type
export type MoveList = {
  [moveName: string]: MoveCols | undefined;
}

export type DBListDocItem = {
  id: string,
  name: string 
}
export type DBListDoc = {
  dbs: DBListDocItem[]
}

export type DesignDoc = {
  displayName: string; //for the game. Probably unused since grabbed from DBListDocItem.name in top db
  universalPropDefs: ColumnDefs,
  columnDefs: ColumnDefs,
}

export type CharDoc = {
  charName: string,
  displayName: string,
  updatedAt: Date, //remember validation functions run on replication if a VDU is where I want to add this... not running VDU locally then
  updatedBy: string,
  changeHistory: string[]; //array of changelist IDs used to create this. Changes not listed can be cleaned up after a time to make room?
  // ^^ would be nice if size of changeHistory matched revision #...
  universalProps: PropCols,
  moves: MoveList,
  //movesObj: {[moveName: string]: MoveData}; //TODO: maybe do it this way?
}

//generics can enforce that both pieces of data in a modify change are the same
export type ColumnChange<T extends ColumnData = ColumnData> = Modify<T> | Add<T> | Delete<T>;
export interface Modify<T extends ColumnData = ColumnData> {
  readonly type: "modify";
  readonly new: T;
  readonly old: T;
}
export interface Add<T extends ColumnData = ColumnData> {
  readonly type: "add";
  readonly new: T;
}
export interface Delete<T extends ColumnData = ColumnData> {
  readonly type: "delete";
  readonly old: T;
}
export interface Changes<T extends ColumnData = ColumnData> {
  [columnName: string]: ColumnChange | undefined;
}
export interface MoveChanges extends Changes<MoveData> {
}
//TODO: explicit changetype to help keep track of additions/deletions and manage moveOrder???
//Let's say addition/deletion of moveName indicates whole move addition/deletion??!?!?!?
//Or, could add 2 new types of column change, "add-new-move" and "delete-move"...
/*
   -if merging their change that modifies move they had, but isn't in your base...
   --applying resolution should be add, have moveName column
   -if they delete move you're working with, must still parse out column-by-column conflict resolution and identify what resolution means deletion :(
*/
export interface AddMoveChanges  extends MoveChanges {
  moveName: Add<string>; //purely internal, removed before written to db... or is it?
  [columnName: string]: Add | undefined;
}
export interface DeleteMoveChanges extends MoveChanges {
  moveName: Delete<string>; 
  [columnName: string]: Delete | undefined;
}
export interface PropChanges extends Changes<PropData> {
  moveOrder?: Modify<MoveOrder[]>; //moveOrder is always there, creating char doc makes empty array
}
export type MoveChangeList = {
  [moveName: string]: MoveChanges | undefined;
}
export type ChangeDoc = {
  id: string; //auto-generate?
  updateDescription: string;
  createdAt: Date;
  createdBy: string; //couch username
  baseRevision: string; //version of doc that these changes have seen and accounted for. The "old" values of changes match this doc.
  previousChange: string; //previous WRITER change before this, latest item in baseRev doc's history, can follow chain back to construct history even if doc is nuked
  //NON-WRITER changes that were merged in. Copied when non-writers pull in. Useful? Guess it tells writers "x already merged y, don't need both."
  //Starts empty when you begin editing, added to by every version/change you merge in.
  mergedChanges?: string[]; 
  universalPropChanges?: PropChanges; //better to separate them, even at the cost of many undefined checks
  moveChanges?: MoveChangeList;
  conflictList?: ConflictList;
}


export type Conflict = {
  theirs: ColumnData | undefined; 
  yours: ColumnData | undefined;
  baseValue: ColumnData | undefined; //(matches theirs in rebase, is your old value or base in merge)
  //make sure to maintain reference equality between theirs/yours and resolution moveOrders, moveOrder resolution depends on it
  resolution?: ColumnChange | "no-op", //represents change to YOUR changeList (noop means delete your change)
  //IF REBASING: resolution = baseValue -> yours or theirs(no-op)
  //IF MERGING OLD: resolution = baseValue -> yours or theirs
  //REBASING IS SAME AS MERGING NEWER ACCEPTED CHANGE(S)

  //!!! Old values always irrelevant, they were already used in deciding whether a change existed in the first place!
  //........actually rebasing their changes stores the base value for things you didn't change
  /* REBASING:
  they 2, you 3->4: 2->2 (noop) or 2->4
  they 3, you 3->4: no conflict generated, change goes through
  they 4, you 3->4: autoresolve noop
  they del, you 3->4: noop or del->4. Check if move addition needed.
  they del, you 3->del: autoresolve noop. Check if addition needed.
  they 2, you 3->del: noop or 2->del
  they 2, you don't have: no conflict generated
  */
  //MERGING: theirs is first rebased to a change from yourOld, resolution is yourOld->yours/theirs, can't no-op because that kinda change doesn't generate conflict
  /* if your change is 3->4...
  they 1->2(made 3->2): 3->2 or 3->4
  they 1->3(made noop): no conflict generated
  they 1->4(made 3->4): no conflict generated
  they 1->del(made 3->del): 3->del or 3->4
  they noop (made nothing): no conflict generated
  they 3->2(made 3->2): yeah same
  they del->2(made 3->2): 3->2 or 3->4
  they del->3(made noop): no conflict
  they del->4(made 3->4): no conflict
  they 4->del(made 3->del): 3->del or 3->4

  if your change is 3->del...
  they 1->2(made 3->2): 3->2 or 3->del
  they 1->3(made noop): no conflict generated
  they 1->del(made 3->del): no conflict

  if you have no change (base is 3)...
  they 1->2(made 3->2): autoresolve 3->2
  they 1->3(made noop): no conflict generated
  they 1->del(made 3->del): autoresolve 3->del

  if base is del... (ADD means add if base lacks move entirely)
  they 1->2(made del->2), you noop: autoresolve del->2 (ADD)
  they del->2(made del->2), you noop: same ^^
  they 1->2(made del->2), you del->3: del->2 or del->3 (ADD if theirs)
  they 1->del(made noop), you noop: no conflict
  they 1->del(made noop), you del->3: noop or del->3 (add would already be in yours)
  */
}

// Change to maps? nah, local serialization + react state too useful
export type Conflicts = {
  [columnName: string]: Conflict;
}
export type ConflictList = {
  [moveName: string]: Conflicts;
}


/*

export type ColumnChange = Modify | Add | Delete;
export interface Modify {
  readonly type: "modify";
  readonly new: ColumnData;
  readonly old: ColumnData;
}
export interface Add {
  readonly type: "add";
  readonly new: ColumnData;
}
export interface Delete {
  readonly type: "delete";
  readonly old: ColumnData;
}
export interface MoveChanges {
  [columnName: string]: ColumnChange;
}
*/



/*TODO: Maps vs objects? Maps have:
  + iterability in insertion order, probably more performant, can be reordered by recreating a new map e.g. new Map([...map].sort())
  + override set to validate data (but... could just manually call validator... and moving ColumnData's columnName into keys instead of stored props dodges that error...)
  + overriding set allows handling more complex datatypes in future (eg a column stores object, arrays, images...)
  + instant length calculation (for EditChar to decide of movelist or conflictlist are empty)
  - manual deserialization: once when loading, have a state flag
  - manual serialization: every write whenever move change is submitted
  - awkward as react state, react can't see internal data
  - DefsAndData might be complicated...
  * for React lists, need array.map() since it returns value (an array). Could write map function for my maps, or use Array.from(myMap, ([key, value]) => [key, value + 1]), or lodash map
  
  Object Plus Metadata field: stores stuff like order, length... data used w/ processing or admins that's not character data? 
  Already have ID, display name, updated by/at
  Store order, length, schema version?, permissions?
  BUT if row order is stored as a mandatory, hidden universalProp with special interface, it can be changed easily

  MoveLists, DefList, ChangeLists, and ConflictLists could all be maps of maps (move maps and column maps)
  -ConflictList is no-brainer since it's not serialized
  -MoveList is the one that needs manual ordering. Storing as nested arrays gives storage savings and can convert to maps when/where desired.
  -Map for columns mite b more useful than move map, columns are more frequently compared and changed, and order comes from defs

  What DB representation allows easiest (de)serialization? Object, or nested arrays [[moveKey, [[columnKey, value]]]] used by Map and Object.entries?
  -nested arrays have clearly generic structure

  What about Discord API calls? Would they like movename? 
*/
export interface MoveChangesOld {
  moveName: string;
  changes: {[columnName: string]: ColumnChange};
}

//export type Move = {
  ////universal stuff
  //moveName: string, // Must enforce uniqueness. 
  ////category: string, // make a default column
  ////tags: string[], //better as column
  ////children?: Move[], //TODO: too confusing. To make a child move, include the parent's name in its name, or maybe have a 'parent' column, since editing IDs is risky
  //columnProps: ColumnData[],
//}
//// Convenience type for code that can handle either
//export type MoveOrProps = Move | ColumnData[];
//export function isMove(moveOrProp: MoveOrProps): moveOrProp is Move {
  //return (moveOrProp as Move).moveName !== undefined;
//}
// Typescript is structurally, not nominally typed, so two types that alias to the same type are interchangeable.
// Can make them incompatible with a "brand": type ColumnName = string & {__columnBrand: any}
//export type ColumnName = string;
//export type MoveName = string;


// Describes how a move is changed. If a col's value is modified, store both new and old columns. 
// Can't tell just from this if adding/deleting an entire move or just adding/deleting cols in an existing one.
//export type MoveChanges = {
  //moveName: string;
  ////newCols: ColumnData[];
  ////oldCols: ColumnData[];
  //modified: {new: ColumnData, old: ColumnData}[];
  //added: ColumnData[];
  //deleted: ColumnData[]; //This is the original data before deletion!
//}
// Local edits or versions are stored as this. 
//TODO: should changes also be an object?
//export type ChangeListOld = {
  //updateName: string,
  //updatedAt: Date,
  //updatedBy: string,
  //baseRevision: string;
  //moveChanges: MoveChanges[]; //if universalProps were changed, include them as an object with moveName=universalProps
//}

