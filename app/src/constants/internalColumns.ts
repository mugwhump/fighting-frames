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
  defaultShow: false,
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

export const moveNameColumnDef: ColumnDef = {
  columnName: "moveName",
  displayName: "Move Name",
  dataType: DataType.Str,
  required: true,
  forbiddenValues: ["universalProps","moveName","moveOrder","displayName"],
  minSize: 1,
  defaultShow: true,
}
export const displayNameColumnDef: ColumnDef = {
  columnName: "displayName",
  displayName: "Display Name",
  dataType: DataType.Str,
  required: false,
  forbiddenValues: ["universalProps","moveName","moveOrder","displayName"],
  defaultShow: true,
}
