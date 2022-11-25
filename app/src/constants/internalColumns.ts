import { ColumnDef, ColumnDefs, DataType } from '../types/characterTypes'; 

// These "built-in" columns have special handling. Defs are still stored in DB for consistency.
// Automatically added to defs if not found

  // mobile:  xs=2/12 sm=3/12 md=4/12 lg=6/12 xl=row
  // desktop: xs=1/12 sm=2/12 md=3/12 lg=4/12 xl=6/12
export const predefinedWidths = {
  "extra small": {"size-xs": 2, "size-md": 1},
  "small": {"size-xs": 3, "size-md": 2},
  "medium": {"size-xs": 4, "size-md": 3},
  "large": {"size-xs": 6, "size-md": 4},
  "extra large": {"size-xs": 12, "size-md": 6},
  "test": {"size-xs": 12, "size-sm": 10, "size-md": 8, "size-lg": 6, "size-xl": 4},
  "full": {"size-xs": 12},
} as const;

// --------------------- UNIVERSAL PROP COLUMNS --------------------
//Creating or deleting a move must generate a new ColumnChange for this 
//ColumnDataEdit must be passed the list of allowed values... the ColumnChange upon add/delete should work?
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

//const charBannerDef: ColumnDef = {
  //columnName: "charBanner",
  //displayName: "Character Banner Image",
  //dataType: DataType.Img,
  //required: false,
  //defaultShow: false,
//}
export const requiredPropDefs: Readonly<ColumnDefs> = {moveOrder: moveOrderColumnDef};


// --------------------- MOVE COLUMNS --------------------


export const moveNameColumnDef: Readonly<ColumnDef> = {
  columnName: "moveName",
  displayName: "Move Name",
  dataType: DataType.Str,
  required: true,
  forbiddenValues: ["universalProps","moveName","moveOrder","displayName"],
  minSize: 1,
  group: "title",
  widths: predefinedWidths['full'],
}
// Suggested columns
export const displayNameColumnDef: Readonly<ColumnDef> = {
  columnName: "displayName",
  displayName: "Display Name",
  dataType: DataType.Str,
  required: false,
  forbiddenValues: ["universalProps","moveName","moveOrder","displayName"],
  group: "title",
  widths: predefinedWidths['medium'],
}
export const damageColumnDef: Readonly<ColumnDef> = {
  columnName: "damage",
  displayName: "Damage",
  shortName: "DMG",
  dataType: DataType.Num, //Hard to say what should be NumStr to let users enter multi-hit info...
  required: false,
  group: "needsHeader",
  widths: predefinedWidths['extra small'],
}
export const startupFramesColumnDef: Readonly<ColumnDef> = {
  columnName: "startup",
  displayName: "Startup",
  shortName: "IMP",
  prefix: 'i',
  dataType: DataType.Int,
  required: false,
  group: "needsHeader",
  widths: predefinedWidths['extra small'],
}
export const guardFramesColumnDef: Readonly<ColumnDef> = {
  columnName: "onBlock",
  displayName: "On Block",
  shortName: "GRD",
  dataType: DataType.Int,
  required: false,
  group: "needsHeader",
  widths: predefinedWidths['extra small'],
}
export const hitFramesColumnDef: Readonly<ColumnDef> = {
  columnName: "onHit",
  displayName: "On Hit",
  shortName: "HIT",
  dataType: DataType.NumStr,
  allowedValues: ['#','-','STN','KDN','LNC'],
  required: false,
  group: "needsHeader",
  widths: predefinedWidths['extra small'],
}
export const totalFramesColumnDef: Readonly<ColumnDef> = {
  columnName: "totalFrames",
  displayName: "Total Frames",
  shortName: "GRD",
  dataType: DataType.Int,
  required: false,
  group: "needsHeader",
  widths: predefinedWidths['extra small'],
}
//active frames, recovery frames, move inputs
export const wideTest1: Readonly<ColumnDef> = {
  columnName: "wide1",
  displayName: "wide-1",
  shortName: "WID1",
  dataType: DataType.Str,
  required: false,
  group: "needsHeader",
  widths: predefinedWidths['small'],
}
export const wideTest2: Readonly<ColumnDef> = {
  columnName: "wide2",
  displayName: "wide-2",
  shortName: "WID2",
  dataType: DataType.Str,
  required: false,
  group: "needsHeader",
  widths: predefinedWidths['small'],
}
export const wideTest3: Readonly<ColumnDef> = {
  columnName: "wide3",
  displayName: "wide-3",
  shortName: "WID3",
  dataType: DataType.Str,
  required: false,
  group: "needsHeader",
  widths: predefinedWidths['extra large'],
}

export const requiredColumnDefs: Readonly<ColumnDefs> = {moveName: moveNameColumnDef, displayName: displayNameColumnDef, };
