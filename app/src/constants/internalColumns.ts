import { ColumnDef, DataType } from '../types/characterTypes'; 

// These "built-in" columns have special handling. Defs are still stored in DB for consistency.
// Automatically added to defs if not found

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
  width: "xl",
}

//const charBannerDef: ColumnDef = {
  //columnName: "charBanner",
  //displayName: "Character Banner Image",
  //dataType: DataType.Img,
  //required: false,
  //defaultShow: false,
//}
export const requiredPropDefs: Readonly<ColumnDef[]> = [moveOrderColumnDef];


// --------------------- MOVE COLUMNS --------------------

export const moveNameColumnDef: Readonly<ColumnDef> = {
  columnName: "moveName",
  displayName: "Move Name",
  dataType: DataType.Str,
  required: true,
  forbiddenValues: ["universalProps","moveName","moveOrder","displayName"],
  minSize: 1,
  group: "meta",
  width: "xl",
}
// Suggested columns
export const displayNameColumnDef: Readonly<ColumnDef> = {
  columnName: "displayName",
  displayName: "Display Name",
  dataType: DataType.Str,
  required: false,
  forbiddenValues: ["universalProps","moveName","moveOrder","displayName"],
  group: "title",
  width: "sm",
}
export const damageColumnDef: Readonly<ColumnDef> = {
  columnName: "damage",
  displayName: "Damage",
  shortName: "DMG",
  dataType: DataType.Num, //Hard to say what should be NumStr to let users enter multi-hit info...
  required: false,
  group: "needsHeader",
  width: "xs",
}
export const startupFramesColumnDef: Readonly<ColumnDef> = {
  columnName: "startup",
  displayName: "Startup",
  shortName: "IMP",
  prefix: 'i',
  dataType: DataType.Int,
  required: false,
  group: "needsHeader",
  width: "xs",
}
export const guardFramesColumnDef: Readonly<ColumnDef> = {
  columnName: "onBlock",
  displayName: "On Block",
  shortName: "GRD",
  dataType: DataType.Int,
  required: false,
  group: "needsHeader",
  width: "xs",
}
export const hitFramesColumnDef: Readonly<ColumnDef> = {
  columnName: "onHit",
  displayName: "On Hit",
  shortName: "HIT",
  dataType: DataType.NumStr,
  allowedValues: ['#','-','STN','KDN','LNC'],
  required: false,
  group: "needsHeader",
  width: "xs",
}
export const totalFramesColumnDef: Readonly<ColumnDef> = {
  columnName: "totalFrames",
  displayName: "Total Frames",
  shortName: "GRD",
  dataType: DataType.Int,
  required: false,
  group: "needsHeader",
  width: "xs",
}
//active frames, recovery frames, move inputs
