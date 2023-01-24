import { groupList, ColumnDef, ColumnDefRestrictions, ColumnDefDisplayText, ColumnDefs, DataType } from '../types/characterTypes'; 
import { keys } from '../services/util';

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
  suffix: "wi",
  hintText: "You need to leave",
  dataType: DataType.Str,
  required: false,
  group: "needsHeader",
  widths: predefinedWidths['share'],
  forbiddenValues: ['melon'],
}
export const wideTest2: Readonly<ColumnDef> = {
  columnName: "wide2",
  displayName: "wide-2",
  shortName: "WID2",
  prefix: "wiwi",
  suffix: "wo",
  dataType: DataType.Str,
  required: false,
  group: "needsHeader",
  widths: predefinedWidths['share'],
}
export const wideTest3: Readonly<ColumnDef> = {
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


const forbiddenNames: string[] = keys(metaPropDefs).concat(keys(metaColumnDefs)).concat(keys(requiredPropDefs)).concat(keys(requiredColumnDefs));
// These are meta-definitions that describe each field of a column's definition, used by admins when editing/creating columns
// There are other restrictions on some of these that are coded into the editor
// TODO: any difference between props and move columns?
export let metaDefs: {[Property in keyof ColumnDef]: ColumnDefRestrictions & ColumnDefDisplayText} = {
//export let metaDefs = {
  columnName: {
    displayName: "Column ID",
    hintText: "A unique identifier for this column, used internally. Cannot be changed.",
    dataType: DataType.Str,
    required: true,
    forbiddenValues: forbiddenNames,
    maxSize: 25,
  },
  displayName: {
    displayName: "Column Name",
    hintText: "The name of this column as shown to users.",
    dataType: DataType.Str,
    required: false,
    forbiddenValues: forbiddenNames,
    maxSize: 25,
  },
  shortName: {
    displayName: "Short column name",
    hintText: "Shortened name of this column when space is limited. Example: 'DMG' for 'Damage'",
    dataType: DataType.Str,
    required: false,
    forbiddenValues: forbiddenNames,
    maxSize: 3,
  },
  hintText: {
    displayName: "Hint Text",
    hintText: "Extra text about the column that users can view, just like this very text.",
    dataType: DataType.Str,
    required: false,
    maxSize: 200,
  },
  prefix: {
    displayName: "Prefix",
    hintText: "A prefix shown before the column's data. Example: a column for startup frames with a prefix of 'i' and data of 12 would display as 'i12'. Can add trailing spaces to separate.",
    dataType: DataType.NumStr,
    allowedValues: ['i','%','KDN'], //TODO: TESTING
    allowedValuesHints: {'i': 'like big butts', '%': 'foo', 'KDN': 'And I get up again'},
    required: false,
    maxSize: 5,
  },
  suffix: {
    displayName: "Suffix",
    hintText: "A suffix shown after the column's data. Example: a column for character height with a suffix of 'ft' and data of 6 would display as '6ft'. Can add leading spaces to separate.",
    dataType: DataType.Str,
    required: false,
    maxSize: 5,
  },
  group: { //NOTE: this is changed via reordering
    dataType: DataType.Str,
    required: true,
    allowedValues: [...groupList],
  },
  widths: { //TODO: this one needs special handling
    displayName: "Column Widths",
    hintText: `How wide the column will appear at various screen sizes, in twelfths. 
      All columns in the same group will be placed in one row, or multiple rows if the sum of the columns' widths exceed 12.
      Define larger widths at smaller screen sizes. On phones (the xs breakpoint), columns should get a larger portion of the row, or a full row.
      On PC (the xl breakpoint), multiple columns can fit in one row.
      Leave undefined to share space equally among other columns of the same row that don't have defined widths.`,
    suffix: "/12",
    dataType: DataType.List,
    required: false,
    minSize: 1,
    maxSize: 5,
  },
  dataType: {
    displayName: "Data Type",
    hintText: "What type of data this column contains.", //TODO: explain here
    dataType: DataType.Str,
    required: true,
    allowedValues: Object.values(DataType).filter((val) => val !== "MOVE_ORDER"),
    allowedValuesHints: {'NUMBER': 'Decimal number', 'INTEGER': 'Whole number', 
      'STRING': 'Letters, numbers, and symbols. Specifying allowed values makes users select one value from a drop-down, which can be used for true/false values.', 
      'LIST': 'Multiple strings. Specifying allowed values means the list must be made of one or more items from a drop-down menu. Useful for tags.',
      'NUMERIC_STRING': 'A value that starts with a number (or one of any allowed strings you may specify), which can be followed by other characters. Users could enter 7(-2) and it will be parsed as 7 for filtering and sorting purposes. Add "KDN" to your allowed values and users can write "KDN" or KDN(-2).',
    }
  },
  required: {
    displayName: "Required?",
    hintText: "Indicates whether this column needs a value before the move can be submitted.",
    dataType: DataType.Str,
    required: true,
    allowedValues: ['required', 'optional'], //TODO: convert this to boolean before storing
  },
  allowedValues: { //ensure no overlap with forbiddenValues
    displayName: "Allowed Values",
    hintText: `For String or List columns, users may only select from these values. For Numeric String columns, use this to specify the string values that are allowed. 
        For example, a column for a move's frame advantage on hit would usually contain a number, but a move that knocks opponents down might say 'KDN' instead. The order of these entries determines how they are sorted when users sort by this column. Use '#' to represent the sort order of numeric values (users won't be able to select '#', it's just for sorting).`,
    dataType: DataType.List,
    required: false,
    //allowedValues: ['test1', 'test2', 'test3'],
    //TODO: admins putting '#' in allowedValues of NumStr cols is for sorting order, not an option for users. Perhaps put # in forbiddenValues of NumStr...?
    minSize: 1,
    maxSize: 100,
  },
  forbiddenValues: {
    displayName: "Forbidden Values",
    hintText: "Values users cannot enter",
    dataType: DataType.List,
    required: false,
    minSize: 1,
    maxSize: 100,
  },
  maxSize: { //also ensure minSize < maxSize
    displayName: "Max size/length",
    hintText: "For numbers, the maximum value. For strings or numeric strings, the maximum # of characters. For lists, the maximum # of items.",
    dataType: DataType.Int,
    required: false,
  },
  minSize: {
    displayName: "Minimum size/length",
    hintText: "For numbers, the minimum value. For strings or numeric strings, the minimum # of characters. For lists, the minimum # of items.",
    dataType: DataType.Int,
    required: false,
  },
};
