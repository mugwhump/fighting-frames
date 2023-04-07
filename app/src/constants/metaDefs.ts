import { groupList, ColumnDef, DesignDoc, Breakpoint, SizeBreakpoint, BPList, ColumnDefRestrictions, ColumnDefDisplayText, ColumnDefs, ColumnData, DataType } from '../types/characterTypes'; 
import { keys, keyVals, trimStringProperties } from '../services/util';
import { forbiddenNames, specialDefs, isMandatory } from './internalColumns';
import * as colUtil from '../services/columnUtil';
import type { FieldError } from '../types/utilTypes'; //==
import CompileConstants from './CompileConstants';


export type MetaDefKey = keyof ColumnDef | ExtraMetaDefKey;
export type ExtraMetaDefKey = 'required' | 'dontRenderEmpty' | 'allowedValuesHints' | `allowedValuesHints-${string}` | SizeBreakpoint;
export type DefPropertyFieldErrors = {[Property in MetaDefKey]?: {columnName: MetaDefKey, message: string} }; 

// These are meta-definitions that describe each field of a column's definition, used by admins when editing/creating columns
// There are other restrictions on some of these that are coded into the editor
export let metaDefs: {[Property in keyof Partial<ColumnDef>]: ColumnDefRestrictions & ColumnDefDisplayText} = {
  columnName: {
    displayName: "Column ID",
    hintText: "A unique identifier for this column, used internally. Cannot be changed.",
    dataType: DataType.Str,
    required: true,
//mandatory columns bypass error checks for their own names in forbiddenValues. 
    forbiddenValues: forbiddenNames, 
    maxSize: 30,
    minSize: 1,
  },
  displayName: {
    displayName: "Column Display Name",
    hintText: "The name of this column as shown to users.",
    dataType: DataType.Str,
    required: false,
    forbiddenValues: forbiddenNames,
    maxSize: 40,
  },
  shortName: {
    displayName: "Short column name",
    hintText: "Shortened name of this column when space is limited. Example: 'DMG' for 'Damage'",
    dataType: DataType.Str,
    required: false,
    forbiddenValues: forbiddenNames,
    maxSize: 4,
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
    hintText: "A prefix shown before the column's data. Example: a column for startup frames with a prefix of 'i' and data of 12 would display as 'i12'.",
    dataType: DataType.Str,
    required: false,
    maxSize: 5,
  },
  suffix: {
    displayName: "Suffix",
    hintText: "A suffix shown after the column's data. Example: a column for character height with a suffix of 'ft' and data of 6 would display as '6ft'.",
    dataType: DataType.Str,
    required: false,
    maxSize: 5,
  },
  group: { //NOTE: this is changed via reordering. Put here for server-side checks.
    dataType: DataType.Str,
    required: true,
    allowedValues: [...groupList],
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
      'TAG_STRING': 'A string where specified allowed values function as tags, which users can insert by selecting them from a drop-down or adding them inside brackets. Users could write "[Unblockable] in air" and Unblockable would show as a tag and be useable for filtering/sorting. Functionally, this is a List with extra descriptive text.'
    }
  },
  allowedValues: { 
    displayName: "Allowed Values",
    hintText: `For String or List columns, users may only select from these values. For Numeric String columns, use this to specify the string values that are allowed. 
        For example, a column for a move's frame advantage on hit would usually contain a number, but a move that knocks opponents down might say 'KDN' instead. The order of these entries determines how they are sorted when users sort by this column. Use '#' to represent the sort order of numeric values (users won't be able to select '#', it's just for sorting).`,
    dataType: DataType.List,
    required: false,
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
  maxSize: { 
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

const templateWidthDef: ColumnDefRestrictions & ColumnDefDisplayText = {
  hintText: `How wide the column will appear at various screen sizes, in twelfths. 
    All columns in the same group will be placed in one row, or multiple rows if the sum of the columns' widths exceed 12.
    Define larger widths at smaller screen sizes. On phones (the xs breakpoint), columns should get a larger portion of the row, or a full row (12 is a full row).
    On PC (the xl breakpoint), multiple columns can fit in one row.
    Leave undefined to share space equally among other columns of the same row that don't have any defined widths.`,
  dataType: DataType.Int,
  required: false, 
  minSize: 1,
  maxSize: 12,
  suffix: '/12',
}

// These defs are for properties that require conversion between ColumnData and the actual ColumnDef property type

export let extraMetaDefs: {[Property in ExtraMetaDefKey]: ColumnDefRestrictions & ColumnDefDisplayText} = {
  required: {
    displayName: "Required?",
    hintText: "Indicates whether this column needs a value before the move can be submitted.",
    dataType: DataType.Str,
    required: true,
    allowedValues: ['required', 'optional'], //gets converted to boolean before storing
  },
  dontRenderEmpty: {
    displayName: "Don't display if no data?",
    hintText: "If true, this column will not display if it has no data. Doesn't work with required columns or columns in the 'Needs Header' group. Best used with full-row columns, like a 'Notes' column, where you can be sure vertical space will actually be saved and the layout won't be changed unpredictably.",
    dataType: DataType.Str,
    required: false,
    allowedValues: ['true', 'false'], //gets converted to boolean before storing
  },
  allowedValuesHints: { //copied for each allowedValue, columnName is allowedValuesHints-[allowedVal]
    displayName: 'Description for allowed value ', //modified with the value at the end
    hintText: "Will show next to the allowed value in a drop-down menu",
    dataType: DataType.Str,
    required: false,
    maxSize: 200,
  },
  'size-xs': {
    ...templateWidthDef, displayName: "Width (phones/extra small screens)"
  },
  'size-sm': {
    ...templateWidthDef, displayName: "Width (phablets/small screens)"
  },
  'size-md': {
    ...templateWidthDef, displayName: "Width (tablets/medium screens)"
  },
  'size-lg': {
    ...templateWidthDef, displayName: "Width (laptops/large screens)"
  },
  'size-xl': {
    ...templateWidthDef, displayName: "Width (desktops/extra large screens)"
  },
}

export function getMetaDef(key: keyof ColumnDef): ColumnDef | undefined {
  let def = metaDefs[key];
  return def ? {...def, group: "normal", columnName: key} : undefined;
}

export function getExtraMetaDef(key: ExtraMetaDefKey): ColumnDef {
  let def = extraMetaDefs[key];
  if(!def) {
    if(key.startsWith('allowedValuesHints-')) {
      def = extraMetaDefs['allowedValuesHints'];
      let allowedVal = key.split('allowedValuesHints-')[1];
      def = {...def, displayName: def.displayName + allowedVal};
    }
    else throw new Error("No definition for field" + key);
  }

  return {...def, group: "normal", columnName: key};
}

export function getPropertyAsColumnData(columnDef: ColumnDef, defProperty: MetaDefKey): ColumnData | undefined {
  let val: ColumnData | undefined;
  if(defProperty === "required") val = (columnDef.required ? "required" : "optional");
  else if(defProperty === "dontRenderEmpty") val = (columnDef.dontRenderEmpty ? "true" : "false");
  else if(columnDef.allowedValuesHints && defProperty.startsWith("allowedValuesHints-")) {
    const allowedVal = defProperty.split('allowedValuesHints-')[1];
    val = columnDef.allowedValuesHints[allowedVal];
  }
  else if(columnDef.widths && defProperty.startsWith("size-")) {
    val = columnDef.widths[defProperty as SizeBreakpoint];
  }
  //else if(propertyName === "cssRegex") return Object.values(val); 
  else {
    val = columnDef[defProperty as keyof ColumnDef] as ColumnData | undefined;
  }
  return val;
}

//run by server. Builds error msg for server to return. Also removes unused props and trims whitespace.
//result contains tags to be displayed in IonicSafeString (make sure to sanitize)
export function getDesignDocErrorMessageAndClean(doc: Readonly<DesignDoc>): string | false {
  let errorMsg: string = "";
  for(const isUniversalProps of [true, false]) {
    const path = isUniversalProps ? "universalPropDefs" : "columnDefs";
    for(const [key, def] of keyVals(doc[path])) {
      if(!def) continue;
      //first trim whitespace around stringus
      stripWhitespace(def);
      //remove unused props before error check
      removeUselessProperties(def);

      const errors: DefPropertyFieldErrors = getErrorsForColumnDef(def, isMandatory(key, isUniversalProps));
      if(keys(errors).length > 0) {
        const defErrorString = Object.values(errors).map((errorObj) => `${errorObj?.columnName || ""}: ${errorObj?.message || ''}`).join(',<br>'); // `?
        errorMsg += `<br>Errors in ${isUniversalProps ? 'universal property' : 'move column'} ${def.displayName || key}:<br> ${defErrorString}`;
      }
    }
  }
  return errorMsg.length > 0 ? errorMsg : false;
}

// Do error checking for any of the definition's properties that need conversion
export function getErrorsForColumnDef(columnDef: ColumnDef, isMandatory?: boolean): DefPropertyFieldErrors {
  //let result: {[Property in keyof Partial<ColumnDef>]: FieldError} = {};
  let result: DefPropertyFieldErrors = {};
  for(const [prop, metaDef] of keyVals(metaDefs)) {
    if(prop && metaDef) {
      const key = prop as keyof ColumnDef;
      const err = getDefPropError(columnDef, key, isMandatory );
      if(err) {
        result[key] = err as {columnName: MetaDefKey, message: string};
      }
    }
  }
  //now loop through extra defs, must create for allowedValsHints
  for(const [prop, extraDef] of keyVals(extraMetaDefs)) {
    if(prop && extraDef) {
      const key = prop as ExtraMetaDefKey;
      let err: FieldError | false = false;
      if(key === 'allowedValuesHints' && columnDef.allowedValues) {
        for(const allowedVal of columnDef.allowedValues) {
          const allowedValHintErr = getExtraDefPropError(columnDef, `allowedValuesHints-${allowedVal}`);
          if(allowedValHintErr) {
            result[`allowedValuesHints-${allowedVal}`] = allowedValHintErr as {columnName: MetaDefKey, message: string};
          }
        }
      }
      else {
        err = getExtraDefPropError(columnDef, key);
      }
      if(err) {
        result[key] = err as {columnName: MetaDefKey, message: string};
      }
    }
  }
  //if this is a mandatory column, loop through its values and make sure they're equal. Eh, if the UI forbids changes and clients overwrite changes, can forego server-side checks.
  //const mandatoryFixedProperties: Readonly<ColumnDef> | undefined = specialDefs.mandatory['universalPropDefs'][columnDef.columnName] 
        //|| specialDefs.mandatory['columnDefs'][columnDef.columnName]; 
  //if(mandatoryFixedProperties) {
    //for(const key in mandatoryFixedProperties) { //keys with undefined values must be kept undefined
      //const fixedVal = mandatoryFixedProperties[key as keyof ColumnDef];
    //}
  //}
  return result as DefPropertyFieldErrors;
}

export function getDefPropError(columnDef: ColumnDef, defProperty: keyof ColumnDef, isMandatory ?: boolean): FieldError | false {
  let metaDef = metaDefs[defProperty];
  if(!metaDef) return false;
  //Ensure allowedValues meet other constraints
  if(defProperty === 'allowedValues') {
    if(columnDef.allowedValues) {
      for(const allowedVal of columnDef.allowedValues) {
        //NumStr allowedValues can't start with numbers
        if(columnDef.dataType === DataType.NumStr && !isNaN(Number.parseFloat(allowedVal))) {
          return {columnName: 'allowedValues', message: `Allowed Value ${allowedVal} for Numeric String may not start with a number`};
        }
        if(columnDef.forbiddenValues) {
          for(const forbiddenVal of columnDef.forbiddenValues) { //if 'foo' in forbiddenValues, can't make 'foobar' an allowedValue
            if(allowedVal.indexOf(forbiddenVal) !== -1) {
              return {columnName: 'allowedValues', message: `Allowed Value ${allowedVal} contains Forbidden Value ${forbiddenVal}`};
            }
          }
        }
      }
      if(columnDef.dataType === DataType.List && columnDef.minSize !== undefined && columnDef.minSize > columnDef.allowedValues.length) {
        return {columnName: 'allowedValues', message: `If the min size of a list is ${columnDef.minSize} and you define allowed values, there must be at least ${columnDef.minSize} of them`};
      }
    }
    else if(columnDef.dataType === DataType.TagStr) {
      return {columnName: 'allowedValues', message: 'Must have one or more allowed values for TAG_STRING data type'};
    }
  }
  if(defProperty === 'columnName' && columnDef.columnName !== undefined) {
    if(columnDef.columnName.startsWith('_')) {
      return {columnName: 'columnName', message: 'Cannot start with underscore'};
    }
    const forbiddenMatches = CompileConstants.FORBIDDEN_COL_ID_REGEX.exec(columnDef.columnName);
    if(forbiddenMatches) {
      return {columnName: 'columnName', message: 'Cannot contain '+forbiddenMatches.join(' or ')};
    }
  }
  //maxSize > minSize. Non-number maxsize can't be negative. 
  if(defProperty === 'maxSize' && columnDef.maxSize !== undefined) {
    if(columnDef.minSize !== undefined && columnDef.minSize > columnDef.maxSize) {
      return {columnName: 'maxSize', message: `Max size can't be less than min size`};
    }
    if(columnDef.maxSize <= 0 && !colUtil.dataTypeIsNumber(columnDef.dataType)) {
      return {columnName: 'maxSize', message: `Max size for non-number data types must be above 0`};
    }
  }

  let err: FieldError | false = false;
  // Mandatory columns skip the forbiddenValues check for columnNames, otherwise couldn't submit themselves
  if(isMandatory  && defProperty === 'columnName' && forbiddenNames.includes(columnDef.columnName)) {
    err = colUtil.checkInvalid(getPropertyAsColumnData(columnDef, defProperty), {columnName: defProperty, ...metaDef, forbiddenValues: undefined});
  }
  else {
    err = colUtil.checkInvalid(getPropertyAsColumnData(columnDef, defProperty), {columnName: defProperty, ...metaDef});
  }
  return err;
}


export function getExtraDefPropError(columnDef: ColumnDef, defProperty: ExtraMetaDefKey): FieldError | false {
  let metaDef = getExtraMetaDef(defProperty);
  if(!metaDef) return false;

  if(defProperty === "dontRenderEmpty" && columnDef.dontRenderEmpty) {
    //if(columnDef.group === "needsHeader") {
      //return {columnName: defProperty, message: `Cannot set "${metaDef.displayName}" for columns in "Needs Header" group.`};
    //}
    if(columnDef.required) {
      return {columnName: defProperty, message: `Cannot set "${metaDef.displayName}" for required columns.`};
    }
  }
  if(columnDef.widths) {
    if(defProperty === 'size-xs' && !columnDef.widths['size-xs']) { //must define xs if others defined
      return {columnName: 'size-xs', message: `Must define size-xs if any other sizes are defined`};
    }
    //make sure any breakpoints for previous sizes are larger or equal
    if(defProperty.startsWith('size-') && columnDef.widths[defProperty as SizeBreakpoint]) {
      const thisWidth: number = columnDef.widths[defProperty as SizeBreakpoint]!;
      const thisIndex = BPList.indexOf(defProperty.split('size-')[1] as Breakpoint);
      let colWidths = colUtil.getColWidths(columnDef.widths);
      if(thisIndex >= 0 && colWidths !== undefined) {
        for(let i = 0; i < thisIndex; i++) {
          if(colWidths[i] !== undefined && colWidths[i]! < thisWidth) {
            return {columnName: defProperty, message: `Column width at larger screen sizes should be less than or equal to width at smaller screen sizes`};
          }
        }
      }
    }
  }
  else{
    //if(defProperty === 'size-xs' && columnDef.group === "needsHeader") { //must define widths if needsHeader
      //return {columnName: 'size-xs', message: `Must define width for any column in the needsHeader group`};
    //}
  }

  let err = colUtil.checkInvalid(getPropertyAsColumnData(columnDef, defProperty), metaDef);
  return err;
}

//Warn users about useless properties and delete them upon submission. 
//can run server-side, server will handle deletions (after server's error-check to ensure consistency).
export function getUselessProperties(def: Readonly<ColumnDef>): DefPropertyFieldErrors {
  //let result: {[Property in keyof Partial<T.ColumnDef>]: {columnName: Property, message: string} } = {};
  let result: DefPropertyFieldErrors = {};

  if(def.allowedValues !== undefined) {
    //forbidden values does nothing when allowed values are present
    if(def.forbiddenValues !== undefined) {
      result.forbiddenValues = {columnName: 'forbiddenValues', message: 'Forbidden values have no effect when allowed values are defined'};
    }
    //min/max size useless w/ single select
    if(def.dataType === DataType.Str) {
      if(def.maxSize !== undefined) {
        result.maxSize = {columnName: 'maxSize', message: 'Max size has no effect with String data with allowed values defined'}
      }
      if(def.minSize !== undefined) {
        result.minSize = {columnName: 'minSize', message: 'Min size has no effect with String data with allowed values defined'}
      }
    }
  }
  //strip out allowedValuesHints if no matching allowedValues. 
  if(def.allowedValuesHints !== undefined) {
    if(!def.allowedValues) {
      result.allowedValuesHints = {columnName: 'allowedValuesHints', message: 'No allowed values present to give hints for'}
    }
    else {
      for(const hintKey in def.allowedValuesHints) {
        if(!def.allowedValues.includes(hintKey)) {
          result[`allowedValuesHints-${hintKey}`] = {columnName: `allowedValuesHints-${hintKey}`, message: 'No matching allowed value'}
        }
      }
    }
  }
  //allowedValues and forbidden values useless w/ number types
  if(colUtil.dataTypeIsNumber(def.dataType)) {
    if(def.allowedValues !== undefined) {
      result.allowedValues = {columnName: 'allowedValues', message: 'Allowed values have no effect with number-type data (excluding numeric strings)'};
    }
    if(def.forbiddenValues !== undefined) {
      result.forbiddenValues = {columnName: 'forbiddenValues', message: 'Forbidden values have no effect with number-type data (excluding numeric strings)'};
    }
  }
  return result;
}

export function removeUselessProperties(def: ColumnDef, uselessProps?: DefPropertyFieldErrors) {
  if(!uselessProps) uselessProps = getUselessProperties(def);
  for(const key in uselessProps) {
    //any ExtraMetaDefKeys need special handling
    if(key.startsWith('allowedValuesHints-') && def.allowedValuesHints) {
      let allowedVal = key.split('allowedValuesHints-')[1];
      delete def.allowedValuesHints[allowedVal];
      if(keys(def.allowedValuesHints).length === 0) delete def.allowedValuesHints;
    }
    else delete def[key as keyof ColumnDef];
  }
}

export function stripWhitespace(def: ColumnDef) {
  trimStringProperties(def);
  for(const arr of [def.allowedValues, def.forbiddenValues]) {
    if(arr) {
      for(let i = 0; i < arr.length; i++) {
        arr[i] = arr[i].trim();
      }
    }
  }
  if(def.allowedValuesHints) trimStringProperties(def.allowedValuesHints);
}
