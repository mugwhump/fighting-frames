// NOTE: there's no run-time checks that DB structure actually matches these types since 
// type info doesn't exist at runtime.
// If something's missing, it's just null or empty.

// Universal properties: columns can define their data, but they'd only have one col instead of array
export type UniversalPropDef = {
  propName: string,
  dataType: DataType,
}

export type UniversalPropData = {
  propName: string,
  data: any,
  outdated?: number | boolean, //false for up-to-date, true for mistake, version # for old patch properties
}
/*export type UniversalPropData = {*/
  /*[propName: string]: any,*/
  /*outdated?: number | boolean, //false for up-to-date, true for mistake, version # for old patch properties*/
/*}*/

export type ColumnDef = {
  columnName: string,
  dataType: DataType,
  defaultShow: boolean,
  cssRegexes?: {regex: RegExp, css: string}
}
export type ColumnData = {
  columnName: string, //matches a ColumnDef.columnName
  data: any 
}

export type Move = {
  //universal stuff
  moveName: string, // Must enforce uniqueness
  category: string,
  //tags: string[], //will surely be useful for somethin
  outdated?: number | boolean, //false for up-to-date, true for mistake, version # for old patch properties
  children?: Move[], //TODO: will this cause confusion with people unsure if moves should be their own things?
  columnProps: [ColumnData],
}

export enum DataType { //these mostly determine the editing interface presented
  Int = "INTEGER",
  Num = "NUMBER",
  Str = "STRING",
  Txt = "TEXT"
}

export type DBListDocItem = {
  id: string,
  name: string 
}
export type DBListDoc = {
  dbs: [DBListDocItem]
}

export type DesignDoc = {
  universalPropDefs: UniversalPropDef[],
  columnDefs: ColumnDef[],
  //different sections/categories have different column display options.
  //categoryColumns: [{category: string, cols: Column[]}], 
  //sorting options? Categories would be intermixed
}

export type CharDoc = {
  charName: string,
  updatedAt: Date, //remember validation functions run on replication if this is where I want to add this
  updatedBy: string,
  universalProps: UniversalPropData[],
  moves: Move[],
}
