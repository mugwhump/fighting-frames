import { groupListAll, ColumnDef, ColumnDefs, DataType } from '../types/characterTypes'; 

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
const requiredPropDefs: Readonly<ColumnDefs> = {};
const metaPropDefs: Readonly<ColumnDefs> = {moveOrder: moveOrderColumnDef};


// --------------------- MOVE COLUMNS --------------------


//Creating or deleting a move generates a new ColumnChange for this 
//When adding new move, editor is passed a new definition with existing move names as forbiddenValues
export const moveNameColumnDef: Readonly<ColumnDef> = {
  columnName: "moveName",
  displayName: "Move Name",
  dataType: DataType.Str,
  required: true,
  forbiddenValues: ["universalProps","moveName","moveOrder","displayName"],
  minSize: 1,
  group: "meta",
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

const requiredColumnDefs: Readonly<ColumnDefs> = {displayName: displayNameColumnDef, wideTest1, wideTest2, wideTest3};
const metaColumnDefs: Readonly<ColumnDefs> = {moveName: moveNameColumnDef};

export const specialDefs = {
  meta: { //Defined purely internally in client, not present in database or editable. Have "meta" group and special handling for how they're displayed.
    universalPropDefs: metaPropDefs, //inserted at end so moveOrder and banner changes/conflicts show at bottom
    columnDefs: metaColumnDefs, //inserted at front so moveName conflict swiper shows at top
  },
  required: { //If not present in database, will be added by client, allowing a degree of editing.
    universalPropDefs: requiredPropDefs,
    columnDefs: requiredColumnDefs,
  },
}

