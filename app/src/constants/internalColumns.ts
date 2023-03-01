import { groupList, ColumnDef, Breakpoint, ColumnDefRestrictions, ColumnDefDisplayText, ColumnDefs, ColumnData, DataType } from '../types/characterTypes'; 
import { keys } from '../services/util'; //hewwo

  // mobile:  xs=2/12 sm=3/12 md=4/12 lg=6/12 xl=row
  // desktop: xs=1/12 sm=2/12 md=3/12 lg=4/12 xl=6/12
export const predefinedWidths = {
  "extra small": {"size-xs": 2, "size-md": 1},
  "small": {"size-xs": 3, "size-md": 2},
  "medium": {"size-xs": 4, "size-md": 3},
  "large": {"size-xs": 6, "size-md": 4},
  "extra large": {"size-xs": 12, "size-md": 6},
  "full": {"size-xs": 12},
  "test": {"size-xs": 12, "size-sm": 10, "size-md": 8, "size-lg": 6, "size-xl": 4},
  "share": undefined,
} as const;

export const groupDescriptions = {
  "title": {title: "Title", desc: "Columns in the first row with the move's name."},
  "needsHeader": {title: "Needs Header", desc: "Columns that need a header saying what they are (uses the column's short name or display name). Often numeric values like frame data aren't self-explanatory. Must have defined widths. If more than one column fits in a row at a given breakpoint (ie their combined widths are <= 12), then a floating header bar for these columns will stay at the top of the screen (at that breakpoint). Columns that don't fit have headers above each piece of data."},
  "normal": {title: "Normal", desc: "Regular data that doesn't need a header."},
  "defaultHideNeedsHeader": {title: "Needs Header + Hide", desc: "Columns for 'extra' data that needs a header but shouldn't be shown by default"},
  "defaultHide": {title: "Hide by Default", desc: "Columns for 'extra' data that doesn't need a header and shouldn't be shown by default"},
}

// --------------------- UNIVERSAL PROP COLUMNS --------------------
//EditCharacter must apply changes to this 
//use with ion-reorder and ion-reorder-group
export const moveOrderColumnDef: ColumnDef = {
  columnName: "moveOrder",
  displayName: "Move Order & Categories",
  dataType: DataType.Ord,
  required: true,
  group: "meta",
  //width: "xl",
  widths: predefinedWidths["full"],
}

//if these show in the character list, doc function would need to emit thumbnail urls or base64 data
//const charBannerDef: ColumnDef = {
  //columnName: "charBanner",
  //displayName: "Character Banner Image",
  //dataType: DataType.Img,
  //required: false,
  //group: "meta",
  //defaultShow: false,
//}
const builtinPropDefs: Readonly<ColumnDefs> = {moveOrder: moveOrderColumnDef};
const mandatoryPropDefs : Readonly<ColumnDefs> = {};
const mandatoryPropDefSuggested : Readonly<ColumnDefs> = {};
const suggestedPropDefs: Readonly<ColumnDefs> = {};


// --------------------- MOVE COLUMNS --------------------


// Builtin column
//Creating or deleting a move generates a new ColumnChange for this 
//When adding new move, editor is passed a new definition with existing move names as forbiddenValues
export const moveNameColumnDef: Readonly<ColumnDef> = {
  columnName: "moveName",
  displayName: "Move ID",
  hintText: "A unique identifier for this move, used internally. Cannot be changed.",
  dataType: DataType.Str,
  required: true,
  forbiddenValues: ["universalProps","moveName","moveOrder","displayName"],
  minSize: 1,
  maxSize: 30,
  group: "meta",
  widths: predefinedWidths['full'],
}
// Mandatory columns
export const displayNameColumnDefFixed: Readonly<ColumnDef> = { //these properties can't be overriden
  columnName: "displayName",
  displayName: "Display Name",
  dataType: DataType.Str,
  required: false,
  dontRenderEmpty: false,
  allowedValues: undefined, //don't want admins accidentally turning this into a drop-down select
  forbiddenValues: ["universalProps","moveName","moveOrder","displayName"],
  group: "title",
}
export const displayNameColumnDefSuggested: Readonly<ColumnDef> = { //these can be overriden
  ...displayNameColumnDefFixed, 
  hintText: 'Name of move as displayed to users. Unlike Move ID, can be changed.',
  widths: predefinedWidths['medium'],
}

// Suggested columns
// Make sure to use defined widths for anything in needsHeader column
export const damage: Readonly<ColumnDef> = {
  columnName: "damage",
  displayName: "Damage",
  shortName: "DMG",
  dataType: DataType.Num, //Hard to say what should be NumStr to let users enter multi-hit info...
  required: false,
  group: "needsHeader",
  widths: predefinedWidths['extra small'],
}
export const startup: Readonly<ColumnDef> = {
  columnName: "startup",
  displayName: "Startup",
  shortName: "IMP",
  prefix: 'i',
  dataType: DataType.Int,
  required: false,
  group: "needsHeader",
  widths: predefinedWidths['extra small'],
}
export const onBlock: Readonly<ColumnDef> = {
  columnName: "onBlock",
  displayName: "On Block",
  shortName: "GRD",
  dataType: DataType.Int,
  required: false,
  group: "needsHeader",
  widths: predefinedWidths['extra small'],
}
export const onHit: Readonly<ColumnDef> = {
  columnName: "onHit",
  displayName: "On Hit",
  shortName: "HIT",
  dataType: DataType.NumStr,
  allowedValues: ['#','-','STN','KDN','LNC'],
  required: false,
  group: "needsHeader",
  widths: predefinedWidths['extra small'],
}
export const totalFrames: Readonly<ColumnDef> = {
  columnName: "totalFrames",
  displayName: "Total Frames",
  shortName: "GRD",
  dataType: DataType.Int,
  required: false,
  group: "needsHeader",
  widths: predefinedWidths['extra small'],
}
//active frames, recovery frames, move inputs
export const wide1: Readonly<ColumnDef> = {
  columnName: "wide1",
  displayName: "wide-1",
  shortName: "WID1",
  suffix: "wi",
  hintText: "You need to leave",
  dataType: DataType.Str,
  required: false,
  group: "normal",
  widths: predefinedWidths['small'],
  forbiddenValues: ['melon'],
}
export const wide2: Readonly<ColumnDef> = {
  columnName: "wide2",
  displayName: "wide-2",
  shortName: "WID2",
  prefix: "wiwi",
  suffix: "wo",
  dataType: DataType.Str,
  required: false,
  dontRenderEmpty: true,
  group: "defaultHide",
  widths: predefinedWidths['full'],
}
export const wide3: Readonly<ColumnDef> = {
  columnName: "wide3",
  displayName: "wide-3 foobar tagstr",
  shortName: "WID3",
  dataType: DataType.TagStr,
  required: false,
  group: "normal",
  widths: predefinedWidths['extra large'],
  maxSize: 81,
  allowedValues: ['foo','bar'],
}

const builtinColumnDefs: Readonly<ColumnDefs> = {moveName: moveNameColumnDef};
const mandatoryColumnDefs: Readonly<ColumnDefs> = {displayName: displayNameColumnDefFixed, wide1, wide2};
const mandatoryColumnDefSuggested: Readonly<ColumnDefs> = {displayName: displayNameColumnDefSuggested};
const suggestedColumnDefs: Readonly<ColumnDefs> = {damage, startup, onBlock, onHit};

export const specialDefs = {
  builtin: { //Defined purely internally in client, not present in database or editable. Have "meta" group and special handling for how they're displayed.
    universalPropDefs: builtinPropDefs, //inserted at end so moveOrder and banner changes/conflicts show at bottom
    columnDefs: builtinColumnDefs, //inserted at front so moveName conflict swiper shows at top
  },
  mandatory: { //If present in database, the properties in these will overwrite those defined by admins, allowing limited editing
    universalPropDefs: mandatoryPropDefs,
    columnDefs: mandatoryColumnDefs,
  },
  mandatoryWithSuggested: { //If not present in database at all, will be added by client. Subset of mandatory columns; everything here must have a matching mandatory column.
    universalPropDefs: mandatoryPropDefSuggested,
    columnDefs: mandatoryColumnDefSuggested,
  },
  suggested: { //Templates for common definitions offered when admins add new columns
    universalPropDefs: suggestedPropDefs,
    columnDefs: suggestedColumnDefs,
  }
}

export const forbiddenNames: string[] = keys(builtinPropDefs).concat(keys(builtinColumnDefs)).concat(keys(mandatoryPropDefs)).concat(keys(mandatoryColumnDefs)).concat(['columnName']);

export function isMandatory(columnName: string, isUniversalProps: boolean): boolean {
  const path = isUniversalProps ? "universalPropDefs" : "columnDefs";
  return columnName in specialDefs.mandatory[path];
}
