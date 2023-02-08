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

export type MoveData = number | string | string[];
export type PropData = number | string | string[] | MoveOrder[];
//export type DataValueTypes = MoveData | PropData;
export type ColumnData = MoveData | PropData;
//export type ColumnDataOld = {
  //readonly columnName: string; //matches a ColumnDef.columnName
  //readonly data: DataValueTypes
//}
export enum DataType { 
  Int = "INTEGER",
  Num = "NUMBER", //floats are likely to be used for sizes/distances/speeds
  Str = "STRING",
  //String with allowedValues restriction functions as a select
  //Txt = "TEXT",
  Ord = "MOVE_ORDER",
  //Img = "IMAGE", //would probably be a url or base64 blob
  List = "LIST", //array of strings, allowed values can be constrained. For tags. No duplicates.
  //ORDER?? For conflicts, same items in different order may be seen as different. react-select keeps them in order defined by allowedValues.
  //TODO: a string which is searched for keywords which are used as tags? When filtering for tag, just searches the string?
  //keywords could also be moveNames
  TagStr = "TAG_STRING",
  // Can parse a List of allowedValues from a TagStr, can parse a Num or Str out of a NumStr
  NumStr = "NUMERIC_STRING", //for things that are usually numeric/sortable, but can be strings like "KDN" or "STN" or "LAUNCH"
  // Can also be strings like 18(10+4+4) eg for multihit, or 8[-2] for moves that change, or KDN[-2]. Takes beginning until punctuation as number or string. Parses as float.
};

export type ColumnDef = {
  columnName: string;
} & ColumnDefDisplayText & ColumnDefRestrictions & ColumnDefStyling;

// Text shown to user describing this column
export type ColumnDefDisplayText = {
  displayName?: string; //allows easier changing. Show columnName if absent.
  shortName?: string; //like IMP, GRD, DMG, etc. Fits xs column widths.
  hintText?: string; //Explain field to users
  allowedValuesHints?: {[allowedValue: string]: string};
  prefix?: string; //display 12 as i12
  suffix?: string; //display 6.5 as 6.5%
}
// Expresses the shape of the data and restrictions on it, has everything needed for validation.
export type ColumnDefRestrictions = {
  dataType: DataType;
  required: boolean; // Can't submit without required columns.
  // Allowed and forbidden values do nothing with numbers (except numeric strings)
  //mostly for strings or tags. For Numeric Strings, says the allowed strings. ORDERED LIST where # means number. ['-','#','KND','STN'] says how to sort. Reject if parses to float (eg '1A')
  allowedValues?: string[];
  forbiddenValues?: string[]; //for moveNames
  minSize?: number; //length of [numeric] strings, number of tags, value of number.
  maxSize?: number;
  allowedRegex?: string;
  _compiledAllowedRegex?: RegExp;
  //hasMoveReference?: boolean, //whether to parse TagStr for references to another move, ie for cancels+followups, could click to jump to that move
  //listDupesALlowed?: boolean; //would be for when lists allow dupes of same value eg) attack heights H,H,L,M... but react-select doesn't support dupes! Need to use tag str I guess
}
// Info about how column is styled, inc size and group
export type ColumnDefStyling = {
  group: DefGroup;
  //cols without width specified will share remaining space, minimum width same as "auto". "auto" fits to content... but could be awkward. 
  // "size" prop by default specifies xs and up; more entries override larger breakpoints. Must define xs.
  widths?: {[key in SizeBreakpoint]?: number}; //can give key undefined value to share remaining space in row. If needsHeader, must define numeric widths. Warn if first cols don't add to 12.
  dontRenderEmpty?: boolean; //if true, does not display this column when it has no data. Doesn't work in needsHeader group. Should this be a group? Must they be adjacent?
  _calculatedTableHeaderHideClass ?: string;
  _calculatedMoveHeaderHideClass ?: string;
  // Performance hack, compile regexes when defs are loaded instead of every time column renders.
  _compiledNumStrRegex?: RegExp;
  _compiledTagStrRegex?: RegExp;
  //compile after loading. If applyViaSplit, use string.split(regex) to apply to individual spans of text instead of the outer cell
  cssRegex?: {regex: string, _compiled_regex?: RegExp, css: string, applyViaSplit?: boolean}[]; 
}

export type Breakpoint =  "xs" | "sm" | "md" | "lg" | "xl";
export const BPList: Readonly<Breakpoint[]> = ["xs", "sm", "md", "lg", "xl"];
export type SizeBreakpoint =  `size-${Breakpoint}`;

//columndef editor forces columns in groups to be put next to each other. Also where order determined. no-definition isn't choosable, it's assigned to columns missing a definition.
//meta column defs aren't in design doc, they're added by the client. Is "meta" not specific enough?
//could have special handling for display, changed display, conflict swiper, edit modal
//e.g. displayName displayed inline (though kinda special), but banner would be elsewhere
export type DefGroup = "meta" | "title" | "needsHeader" | "normal" | "defaultHideNeedsHeader" | "defaultHide" | "no-definition";
export const groupList : Readonly<DefGroup[]> = ["title", "needsHeader", "normal", "defaultHideNeedsHeader", "defaultHide"]; //groups that can actually be assigned to by users
export const groupListAll : Readonly<DefGroup[]> = ["meta", "title", "needsHeader", "normal", "defaultHideNeedsHeader", "defaultHide", "no-definition"];

export type ColumnDefs = {
  [columnName: string]: ColumnDef | undefined;
}
/*Design doc defines how columns display relative to each other, how they collapse, what's hidden, etc
3 APPROACHES ----
1) Single row multiple headers, everything's a column with header, horizontal scrolling
2) Multiple rows no headers, like smash app.
3) Hybrid; some columns get headers, others get rows. Way to define what can share a row without needing headers (eg name+height, tags+notes, etc)
HIDE/SHOW APPROACHES (how do these interact with showing what's changed or conflicting? Something next to expand/collapse icon?) ----
0) show everything. 
1) expand/collapse accordion. Shove low priority here IF too many cols. Too-long notes should collapse. Filtering/sorting by a collapsed col should expand all moves.
What if no-show item not ordered at end?
2) modal/popup (like sf app). Column per row? Already have the editmodal.

Use ionic flex grid and breakpoints to construct header row that auto-hides things at certain breakpoints, and lets overflow columns occupy half-lines with their column name
Only show floating header on small screens, big screens can always show per-col headers. NeedsHeader cols must know how far into the row they are, if previous widths + their width > max width, they'll be pushed to new row. Do calculation for every breakpoint to determine header hiding. Auto and undefined widths tho... needsHeader cols must specify size?
//TODO: each group could be a row on mobile, or a column containing a row of columns on desktop. So title columns could stack on left. Complex... unless I always do that, and just set the inner column to full-width on mobile! But... really doesn't seem worth it just for title cols.
COLUMN DEF EDITOR: copy MoveOrder modal, "categories" make groups, use indent controls for col width? Doesn't work for multiple widths.
*/

//internal utility type to help rendering, lets us show empty columns with no data, or data with no definition (to prompt for deletion)
//Can apply css classes to do various highlighting or showing/hiding
export type ColumnDefAndData = {
  columnName: string;
  def?: ColumnDef;
  data?: ColumnData;
  //display: boolean;
  cssClasses: string[];
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
  displayName: string; //for the game. Useful, but duplicated in DBListDocItem.name in top db...
  universalPropDefs: ColumnDefs,
  columnDefs: ColumnDefs,
} & {_id: string, _rev: string}

export type CharDoc = {
  charName: string,
  displayName: string,
  updatedAt: string, // created via new Date().toString()
  updatedBy: string,
  changeHistory: string[]; //array of changelist IDs used to create this. Full doc Id, not just title updateTitle. Changes not listed can be cleaned up after a time to make room?
  // ^^ would be nice if size of changeHistory matched revision #...
  universalProps: PropCols,
  moves: MoveList; //will be empty object when first created
}
//export type CharDocWithMeta = PouchDB.Core.Document<CharDoc> & PouchDB.Core.IdMeta & PouchDB.Core.GetMeta;
export type CharDocWithMeta = CharDoc & {_id: string, _rev: string};

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>> //utility type to make one or more props optional
export type ChangeDoc = Optional<ChangeDocServer, 'updateTitle'> & {
  conflictList?: ConflictList; 
  rebaseSource?: CharDocWithMeta; //chardoc that current changedoc saw and rebase conflicts were generated from, needed if an even newer charDoc comes in mid-rebase.
  // Gets set on all docs that are rebased even if they have no conflicts, then used to update metadata when resolutions applied.
  mergeSource?: CharDocWithMeta; //chardoc that changeDocs causing merge conflicts were based on
  // If conflicts came from a merge, nothing from the other changelist is needed, just the base
}
// Separate ChangeDoc type used internally and ChangeDocServer type used for server-side validation (which requires title and excludes all validation stuff)
export type ChangeDocServer = {
  //_id is blabla/local-edit when saved/loaded locally, blabla/updateTitle on the server
  updateTitle: string; //user slug
  updateDescription?: string; //users give more details, say who they are
  updateVersion?: string; //game version. Can't enforce accuracy.
  createdAt: string; //server-side validation
  createdBy: string; //server-side validation, will usually be "public"
  baseRevision: string; //version of charDoc that these changes have seen and accounted for. The "old" values of changes match this doc.
  //Previous _id of WRITER change before this, latest item in baseRev doc's history, can follow chain back to construct history even if doc is nuked. First change doesn't have.
  //API publish call validates.
  previousChange?: string; 
  //NON-WRITER changes that were merged in. Copied when non-writers pull in. Useful? Guess it tells writers "x already merged y, don't need both."
  //Starts empty when you begin editing, added to by every version/change you merge in.
  //Can't tell what changes were previously merged into base, seems pointless
  //mergedChanges: string[]; 
  universalPropChanges?: PropChanges; //better to separate them, even at the cost of many undefined checks
  moveChanges?: MoveChangeList;
}
export type ChangeDocWithMeta = ChangeDocServer & {_id: string, _rev: undefined}; //_rev key must be present to put(), but don't allow updating change docs
//export type ChangeDocServer = Omit<ChangeDoc, "conflictList"> & {updateTitle: NonNullable<ChangeDoc['updateTitle']>};
//Meh, just do manual checks on optional properties

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
type GetDataType<ChangeType> = ChangeType extends ColumnChange<infer D> ? D : never;
export type GetChangesType<D extends ColumnData> = D extends MoveData ? MoveChanges : PropChanges;

export type Changes = MoveChanges | PropChanges;
export interface MoveChanges {
  moveName?: Add<string> | Delete<string>; 
  moveOrder?: never;
  [columnName: string]: ColumnChange<MoveData> | undefined;
}
export interface PropChanges {
  moveOrder?: Modify<MoveOrder[]>; //moveOrder is always there, creating char doc makes empty array
  moveName?: never;
  [columnName: string]: ColumnChange<PropData> | undefined;
}
export interface AddMoveChanges  extends MoveChanges {
  moveName: Add<string>; //purely internal, removed before written to db
  [columnName: string]: Add<MoveData> | undefined;
}
export interface DeleteMoveChanges extends MoveChanges {
  moveName: Delete<string>; 
  [columnName: string]: Delete<MoveData> | undefined;
}
export type MoveChangeList = {
  [moveName: string]: MoveChanges | undefined;
}

export type ConflictList = {
  universalProps?: ConflictsProps ;
  [moveName: string]: Conflicts | undefined;
}


// ----------------------------------- INDIVIDUAL CONFLICTS ----------------------------------- 
export interface Conflict<T extends ColumnData = ColumnData> {
  readonly yours: ColumnChange<T> | "no-op";
  readonly theirs: ColumnChange<T> | "no-op";
  resolution?: Resolutions;
}
export type Resolutions = "yours" | "theirs";
export interface ConflictGeneric<Yours extends ColumnChange<D> | "no-op", 
                          Theirs extends ColumnChange<D> | "no-op" = Yours, 
                          D extends ColumnData = GetDataType<Yours> //must specify this if Yours is no-op
                          > extends Conflict<D> {
  readonly yours: Yours;
  readonly theirs: Theirs;
  resolution?: Resolutions;
}
/*                        Failed attempt to let D be inferred from Theirs if Yours is no-op
                          D extends ColumnData = [Yours, Theirs] extends ["no-op", "no-op"] ? never 
                            : [Yours, Theirs] extends [ColumnChange<ColumnData>, "no-op"] ? GetDataType<Yours> 
                            : [Yours, Theirs] extends ["no-op", ColumnChange<ColumnData>] ? GetDataType<Theirs> 
                            : GetDataType<Yours> 
*/
export interface ConflictGenericAutoResolve<Yours extends ColumnChange<D> | "no-op", 
                          Theirs extends ColumnChange<D> | "no-op" = Yours, 
                          D extends ColumnData = GetDataType<Yours> //must specify this if Yours is no-op
                          > extends ConflictGeneric<Yours, Theirs, D> {
  readonly yours: Yours;
  readonly theirs: Theirs;
  resolution: Resolutions;
}
export type ConflictRebase<T extends ColumnData = ColumnData> = ConflictGeneric<ColumnChange<T>, "no-op">;
//export interface ConflictRebase<T extends ColumnData = ColumnData> extends Conflict {
  //readonly yours: ColumnChange<T>;
  //readonly theirs: "no-op";
//}
export type ConflictAutoNoop = ConflictGenericAutoResolve<"no-op">;
//export interface ConflictAutoNoop extends Conflict {
  //readonly yours: "no-op";
  //readonly theirs: "no-op"; 
  //resolution: "yours";
//}
export type ConflictMerge<T extends ColumnData = ColumnData> = ConflictGeneric<ColumnChange<T>, ColumnChange<T>>;
//export interface ConflictMerge<T extends ColumnData = ColumnData> extends Conflict {
  //readonly yours: ColumnChange<T>; 
  //readonly theirs: ColumnChange<T>;
//}
// Autoresolve to theirs when they change and you ignore
export type ConflictMergeTheirs<T extends ColumnData = ColumnData> = ConflictGenericAutoResolve<"no-op", ColumnChange<T>, T>;
//export interface ConflictMergeTheirs<T extends ColumnData = ColumnData> extends Conflict<T> {
  //readonly yours: "no-op";
  //readonly theirs: ColumnChange<T>;
  //resolution: NonNullable<Conflict["resolution"]>;
//}
export type ConflictMergeAllOrNothing<T extends ColumnData = ColumnData> = ConflictGeneric<ColumnChange<T> | "no-op">;
//export interface ConflictMergeAllOrNothing<T extends ColumnData = ColumnData> extends Conflict<T> {
  //readonly yours: ColumnChange<T> | "no-op"; //yours is noop if they add column while you delete move
  //readonly theirs: ColumnChange<T> | "no-op"; //theirs is noop if you add column while they delete move
//}
// -------------------- CONFLICTS FOR SPECIFIC COLUMNS --------------------- 
export type ConflictMoveOrder = ConflictMoveOrderMergeBothChange | ConflictMoveOrderMergeTheyChange | ConflictMoveOrderRebaseBothChange;
export type ConflictMoveOrderMergeBothChange = ConflictGeneric<Modify<MoveOrder[]>>;
//export interface ConflictMoveOrderMergeBothChange extends ConflictMerge<MoveOrder[]> {
  //readonly yours: Modify<MoveOrder[]>;
  //readonly theirs: Modify<MoveOrder[]>;
//}
export type ConflictMoveOrderMergeTheyChange = ConflictGeneric<"no-op", Modify<MoveOrder[]>, MoveOrder[]>;
//export interface ConflictMoveOrderMergeTheyChange extends ConflictMergeTheirs<MoveOrder[]> {
  //readonly yours: "no-op"; //no-op if merging their uncontested changes
  //readonly theirs: Modify<MoveOrder[]>;
//}
export type ConflictMoveOrderRebaseBothChange = ConflictGeneric<Modify<MoveOrder[]>, "no-op">;
//export interface ConflictMoveOrderRebaseBothChange extends ConflictRebase<MoveOrder[]> {
  //readonly yours: Modify<MoveOrder[]>; 
  //readonly theirs: "no-op"; 
//}
export type ConflictMoveName = ConflictGeneric<Add<string> | Delete<string> | "no-op">; 
let moveNameExample: ConflictMoveName = {
  yours: {type: "add", new: "banan"},
  //theirs: {type: "delete", old: "bonon"}
  theirs: "no-op"
}
//export interface ConflictMoveName extends Conflict<string> {
  //readonly yours: Add<string> | Delete<string> | "no-op";
  //readonly theirs: Add<string> | Delete<string> | "no-op";
//}

// ----------------------------------- COLLECTIONS OF CONFLICTS ----------------------------------- 
export interface Conflicts<T extends ColumnData = ColumnData> {
  [columnName: string]: Conflict<T> | undefined;
}
interface ConflictCollectionGeneric<MoveName extends ConflictMoveName, Others extends Conflict> {
  moveName?: MoveName;
  [columnName: string]: Others | MoveName | undefined;
}
export interface ConflictsMoves  extends Conflicts <MoveData> {
  moveName?: ConflictMoveName;
}
export interface ConflictsProps  extends Conflicts <PropData> {
  moveOrder?: ConflictMoveOrder;
}
export interface ConflictsRebase<T extends ColumnData = ColumnData> extends Conflicts<T> {
  [columnName: string]: ConflictRebase<T> | ConflictAutoNoop | undefined;
}
export interface ConflictsMerge<T extends ColumnData = ColumnData> extends Conflicts<T> {
  [columnName: string]: ConflictMerge<T> | ConflictMergeTheirs<T> | ConflictMergeAllOrNothing<T> | undefined;
}
// -------------- CONFLICT COLLECTIONS INVOLVING MOVE ADDITION/DELETION ---------------- 
export interface ConflictsRebaseRedundantAddOrDelete extends ConflictsRebase<MoveData> {
  moveName: ConflictAutoNoop;
  //no restrictions on other columns
}
export interface ConflictsMergeRedundantAddOrDelete extends ConflictsMerge<MoveData> {
  moveName?: never; //no conflict for moveName
  //no restrictions on other columns
}
// --------------- ALL-OR-NOTHING CONFLICT COLLECTIONS --------------
export interface ConflictsRebaseStealthAdd extends ConflictsRebase<MoveData> {
  moveName: {yours: Add<string>, theirs: "no-op"};
  //for other conflicts, yours are adds or no-ops, theirs all no-ops 
  [columnName: string]: {yours: Add<MoveData>, theirs: "no-op"} | ConflictAutoNoop /*for your deletions*/ | undefined;
}
//You delete a move base changed
export interface ConflictsRebaseYouDeleteTheyChange extends ConflictsRebase<MoveData> {
  moveName: {yours: Delete<string>, theirs: "no-op"};
  [columnName: string]: {yours: Delete<MoveData>, theirs: "no-op"} | ConflictAutoNoop /*redundant deletions*/ | undefined; 
}
//They add a move you ignore (aka you don't add), autoresolve
export type ConflictsMergeTheyAdd = ConflictCollectionGeneric<
                                                  ConflictGenericAutoResolve<"no-op", Add<string>, string>, 
                                                  ConflictGenericAutoResolve<"no-op", Add<MoveData>, MoveData>>
//export interface ConflictsMergeTheyAdd extends ConflictsMerge<MoveData> {
  //moveName: {yours: "no-op", theirs: Add<string>, resolution: "yours" | "theirs"};
  //[columnName: string]: {yours: "no-op", theirs: Add<MoveData>, resolution: "yours" | "theirs"} | undefined; 
//}
//They delete a move you ignore, autoresolve
export type ConflictsMergeTheyDelete = ConflictCollectionGeneric<
                                                  ConflictGenericAutoResolve<"no-op", Delete<string>, string>, 
                                                  ConflictGenericAutoResolve<"no-op", Delete<MoveData>, MoveData>>
//export interface ConflictsMergeTheyDelete extends ConflictsMerge<MoveData> {
  //moveName: {yours: "no-op", theirs: Delete<string>, resolution: "yours" | "theirs"};
  //[columnName: string]: {yours: "no-op", theirs: Delete<MoveData>, resolution: "yours" | "theirs"} | undefined; 
//}
//They delete a move you change
export type ConflictsMergeTheyDeleteYouChange = ConflictCollectionGeneric<
                                                  ConflictGeneric<"no-op", Delete<string>, string>, 
                                                  ConflictGeneric<Add<MoveData>, "no-op"> | ConflictGeneric<Modify<MoveData>, Delete<MoveData>>>
  //If you added column, must be nooped out if choose theirs
  //No conflicts for your deletions, they go through no matter what
//export interface ConflictsMergeTheyDeleteYouChange extends ConflictsMerge<MoveData> {
  //moveName: {yours: "no-op", theirs: Delete<string>};
  //[columnName: string]: {yours: Add<MoveData>, theirs: "no-op"}
    //| {yours: Modify<MoveData>, theirs: Delete<MoveData>}
    //| {yours: "no-op", theirs: Delete<MoveData>} //for moveName
    //| undefined; 
//}
export type ConflictsMergeYouDeleteTheyChange = ConflictCollectionGeneric<
                                                  ConflictGeneric<Delete<string>, "no-op">, 
                                                  ConflictGeneric<"no-op", Add<MoveData>, MoveData> | ConflictGeneric<Delete<MoveData>, Modify<MoveData>>>
  //them adding a new column should have yours as no-op
//export interface ConflictsMergeYouDeleteTheyChange extends ConflictsMerge<MoveData> {
  //moveName: {yours: Delete<string>, theirs: "no-op"};
  //[columnName: string]: {yours: "no-op", theirs: Add<MoveData>}
    //| {yours: Delete<MoveData>, theirs: Modify<MoveData>}
    //| {yours: Delete<MoveData>, theirs: "no-op"} //for moveName
    //| undefined; 
//}











type Test<T extends ColumnData = ColumnData> = {
  a: ColumnChange<T>;
  b: ColumnChange<T>;
}
let x: Test = {a: {type: "add", new: 7}, b: {type: "add", new: '7'} } //TODO: how ensure subtypes match w/o manually specifying generic?

type CumflictYours<C extends Conflict> = C["yours"];
type CumflictTheirs<C extends Conflict> = C["theirs"];
function getConflict<C extends Conflict<ColumnData>>(yours: C["yours"], theirs: C["theirs"]): C {
  return {yours: yours, theirs: theirs } as C;
}
//let merge: ConflictMerge = getConflict<ConflictMerge<number>>( {type: "add", new: 7}, {type: "add", new: '7'} );
//let merge2: ConflictMergeTheirs = {yours: {type: "add", new: 7}, theirs: {type: "add", new: '7'} };
let mergetheirs: ConflictMergeTheirs = {yours: "no-op", theirs: {type: "add", new: '7'}, resolution: "theirs" };
//let rebase: ConflictRebase = getConflict<ConflictRebase>( {type: "add", new: 7}, {type: "add", new: '7'});
//let order = getConflict<ConflictOrder>( {type: "add", new: 7}, {type: "add", new: '7'} );
let test: Conflict<string> = {
  yours: {type: "add", new: '7'},
  theirs: {type: "add", new: '7'},
}

//export type Conflict = {
  //theirs: ColumnData | undefined; 
  //yours: ColumnData | undefined;
  //baseValue: ColumnData | undefined; //(matches theirs in rebase, is your old value aka base in merge)
  ////make sure to maintain reference equality between theirs/yours and resolution moveOrders, moveOrder resolution depends on it
  //resolution: ColumnChange | "no-op", //represents change to YOUR changeList (noop means delete your change)
  //otherResolution?: ColumnChange, //represents rejected resolution. If empty but resolution present, means autoresolution with no options
  //chosenResolution?: "yours" | "theirs";

//}

  //IF REBASING: resolution = baseValue -> yours or theirs(no-op)
  //IF MERGING OLD: resolution = baseValue -> yours or theirs
  //REBASING IS SAME AS MERGING NEWER ACCEPTED CHANGE(S)(which isn't allowed, yours must be up-to-date to merge)

  //AUTORESOLUTIONS: rebase autoresolutions are no-op w/o choice, merges have choice
  //rebasing, if they make same change you did, autoresolve to no-op, no other choice. Don't even show these conflicts to user.
  //merging, if you don't change, autoResolve base->theirs, other choice is rejecting theirs

  //ALL-OR-NOTHING WHEN ONE CHOICE IS MOVE NOT BEING THERE, happens every time there's moveName conflict (except auto-noop rebase redundant addition/deletion)
  //Must make moveName conflict if one changes and other deletes, in rebase or merge. 

  //Rebase stealth addition (aka they delete), ALL-OR-NOTHING choice between keeping deleted or turning all modified columns into additions
  //-Choosing deletion: moveName nop, modified->nop, add->nop, del->nop
  //-Choosing addition: moveName add, modified->add, add->add, del->nop
  //Rebase you delete, they change: conflict, ALL OR NOTHING
  //-Choosing deletion: moveName del, everything rebased deletion
  //-Choosing changes: moveName no-op, take all of theirs

  //merge, they add or delete, you ignore: autoresolve preferring adder/deleter, ALL OR NOTHING
  //merge, one changes, one deletes: conflict, ALL OR NOTHING

  //Rebase redundant addition/deletion, no-choice autoresolve to noop out your moveName add/delete in rebase, not all-or-nothing
  //Merge redundant addition/deletion, ignore moveName, not all-or-nothing


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
  //MERGING: theirs is first rebased to a change from yourOld, resolution is yourOld->yours/theirs, can't no-op because that kinda change (theirs->your old) doesn't generate conflict
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

// Change to maps? nah, local serialization + react state too useful
//export type Conflicts = {
  //[columnName: string]: Conflict;
//}





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


// ------------- THOUGHTS BEFORE REBASING MERGES ------------

  //AUTORESOLUTIONS: rebase autoresolutions are no-op w/o choice, merges have choice
  //rebasing, if they make same change you did, autoresolve to no-op, no other choice. Don't even show these conflicts to user.
  //merging, if you don't change, autoResolve base->theirs, other choice is rejecting theirs

  //ALL-OR-NOTHING WHEN ONE CHOICE IS MOVE NOT BEING THERE, happens EVERY time there's moveName conflict

  //For stealth addition, ALL-OR-NOTHING choice between keeping deleted or turning all modified columns into additions
  //-Choosing deletion: moveName nop, modified->nop, add->nop, del->nop
  //-Choosing addition: moveName add, modified->add, add->add, del->nop
  //merge, they modify, not in base, you ignore: stealth add moveName
  //merge, they modify, not in base, you add move: ignore moveName
  //Rebase redundant addition, no-choice autoresolve to noop out your moveName add in rebase, not all-or-nothing
  //Merge redundant addition, ignore moveName, not all-or-nothing

  //For explicit deletion... 
  //Rebase redundant deletion, autoresolve all(????) to no-choice noop
  //Merge, both delete = no conflict
  //you deleted, they changed: choice between their (rebased) changes and your deletions. ALL OR NOTHING
  //you deleted, they added/modified: choice between their (rebased) changes and your deletions. ALL OR NOTHING 
  //they deleted, you changed: choice between their (rebased) deletions and your changes. ALL OR NOTHING
  //they deleted, you ignored, move in base: autoresolve their deletions vs keeping. ALL OR NOTHING
  //they deleted, you ignored, move absent: ignore them, no conflict

  //Deletion vs addition in merge can't happen or makes no conflict, except they add you delete
  //they delete, you add, move in base: can't happen
  //they delete, you add, move absent: no conflict since it's theirs->your old
  //they add(can be stealth), you delete, move in base: covered above
  //they add, you delete, move absent: can't happen
