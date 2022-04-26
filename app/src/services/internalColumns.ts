import { ColumnDef, DataType } from '../types/characterTypes'; 

// These "built-in" columns have special handling. Defs are still stored in DB for consistency.
// Automatically added to defs if not found

// --------------------- UNIVERSAL PROP COLUMNS --------------------
//Creating or deleting a move must generate a new ColumnChange for this 
//ColumnDataEdit must be passed the list of allowed values... the ColumnChange upon add/delete should work?
//EditCharacter must apply changes to this 
//Categories are like "__Category Name"
//use with ion-reorder and ion-reorder-group
const moveOrderColumnDef: ColumnDef = {
  columnName: "moveOrder",
  displayName: "Move Order & Categories",
  dataType: DataType.Ord,
  required: true,
  defaultShow: false,
}


// --------------------- MOVE COLUMNS --------------------

//Should be edited alongside order, children gotta be after parent
const parentColumnDef: ColumnDef = {
  columnName: "parent",
  displayName: "Parent",
  dataType: DataType.Str,
  required: false,
  defaultShow: false,
}
