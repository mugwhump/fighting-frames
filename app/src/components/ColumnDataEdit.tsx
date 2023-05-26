import { IonInput, IonTextarea, IonItem, IonButton, IonLabel, IonSelect, IonSelectOption } from '@ionic/react';
import React, { useState, useEffect, useMemo } from 'react';
import MoveOrdererButton from './MoveOrdererButton';
import { ColumnDef, ColumnDefRestrictions, ColumnData, DataType, MoveOrder } from '../types/characterTypes';
import { isMoveOrder, isList, isString, strToColData, isTagString } from '../services/columnUtil';
import CompileConstants from '../constants/CompileConstants';
import { HelpPopup } from './HelpPopup';
import Select, { components, OptionProps, MultiValue, SingleValue } from 'react-select';
import { HelpTextOption, HelpTextOptionComponent, PreviewMenuList, TextInput, CursorPosition, isMultiValue, arrayMove, SortableSelect, SortableMultiValue, SortableMultiValueLabel, CreateableSortableSelect } from './SelectComponents';
import selectStyles from '../theme/Select.module.css';


type ColumnDataEditProps  = {
  //show: boolean;
  columnName: string;
  colDef: ColumnDef;
  colData?: ColumnData; //if missing, data was deleted or not entered yet despite this column having a definition
  //TODO: show old data + "deleting this" marker? Revert/restore/delete buttons, which require changes? Or put that in modal?
  editSingleColumn: (columnName: string, newData?: ColumnData) => void; //to return edited column data, called repeatedly as data is edited. Undefined for "empty" data.
}

const ColumnDataEdit: React.FC<ColumnDataEditProps> = ({columnName, colData, colDef, editSingleColumn}) => {
  const [inputData, setInputData] = useState<ColumnData | undefined>(colData || undefined); //only moveOrder gets updated
  //if(colData === null && colDef === null) return (<span>Data and definition can't both be null</span>);
  let inputType: "number" | "text" = "text"; //ionic allows more possible types
  let isTextArea: boolean = false; //non-textarea inputs strip out newlines
  let isSelector: boolean = false;
  let isMultiSelect: boolean = false;
  let isCreatableSelect: boolean = false;
  let isTextInputSelect: boolean = false;
  const [textInputCursorPosition, setTextInputCursorPosition] = useState<CursorPosition | undefined>(undefined);
  const [selectMenuIsOpen, setSelectMenuIsOpen] = useState<boolean>(false);
  let maxLength: number | undefined; //used for character limits and the corresponding counter
  const debounceTime: number = 20; //500; //number of MS after keystroke to wait before triggering input change event. If users submit too quick changes are ignored.

  function getAvailableOptions (): HelpTextOption[] {
    //only applies when isSelector or isCreatableSelect
    if(!isSelector && !isCreatableSelect && !isTextInputSelect) return [];

    let options: HelpTextOption [] = [];
    //use allowedVals if present, then user-submitted vals in inputData (for creatable selects), then an empty list
    let initialVals: string[] | undefined = colDef.allowedValues; 
    if(!initialVals) {
      if(inputData && isList(inputData, colDef.dataType)) {
        initialVals = inputData;
      }
      else initialVals = [];
    }

    for(const allowedVal of initialVals) {
      if(colDef.dataType === DataType.NumStr && allowedVal === '#') continue; //for numeric strings, '#' just represents the sorting order
      const optionHelp = colDef.allowedValuesHints?.[allowedVal]; 
      let val = {value: allowedVal, label: allowedVal, helpText: optionHelp};
      options.push(val);
    }
    return options;
  }

  function getSelectedOptions (): HelpTextOption[] {
    if(!availableOptions  || !inputData) return [];

    let currentOptions: HelpTextOption [] = [];

    for(const opt of availableOptions ) {
      if(opt.value === inputData || (inputData && isList(inputData, colDef.dataType) && inputData.includes(opt.value)) ) {
        currentOptions.push(opt);
      }
    }
    return currentOptions;
  }

  function dataChanged(value: string | string[] | undefined) {
    console.log("Column data changed to " + value);
    let newData: ColumnData | undefined;
    if(value === undefined) {
      newData = undefined;
    }
    else if(Array.isArray(value)) {
      newData = value.length > 0 ? [...value] : undefined;
    }
    else {
      newData = strToColData(value, colDef.dataType);
    }

    //this causes a re-render when newData is a number, but not when a string. Some strict mode thing? Doesn't seem to cause problems...
    //Needed to show changed vals when model reopened.
    setInputData(newData); 
    editSingleColumn(columnName, newData);
  }

  //trim whitespace upon blur. Submitting also blurs.
  function itemBlurred() {
    if(typeof inputData === 'string') {
      let trimmed = inputData.trim();
      if(trimmed !== inputData) {
        dataChanged(trimmed);
      }
    }
  }

  function moveOrderChanged(moveOrder: MoveOrder[]) {
    editSingleColumn('moveOrder', moveOrder);
    setInputData(moveOrder);
  }

  function resetChanges(): void {
    //TODO: button will reset this col's changes
    throw new Error("Not implemented");
  }

  switch (colDef.dataType) {
    case DataType.Int: 
    case DataType.Num: {
      inputType = "number";
      break;
    }
    //case DataType.Txt: 
    case DataType.Str: {
      if(colDef.allowedValues) {
        //single-select. Selecting multiple values is a list
        isSelector = true;
        //length restrictions have no meaning for single-select.
        break;
      }
      else if(colDef.maxSize && colDef.maxSize > CompileConstants.TEXT_AREA_CHARACTERS) isTextArea = true;
      inputType = "text";
      maxLength = colDef.maxSize;
      break;
    }
    case DataType.NumStr: {
      inputType = "text";
      maxLength = colDef.maxSize;
      isTextInputSelect = true; 
      break;
    }
    case DataType.TagStr: {
      inputType = "text";
      maxLength = colDef.maxSize;
      isTextInputSelect = true; 
      break;
    }
    case DataType.Ord: {
      break;
    }
    case DataType.List: {
      if(colDef.allowedValues) {
        //multi-select. 
        isSelector = true;
        isMultiSelect = true;
      }
      else {
        //multiple user-entered values
        isCreatableSelect = true;
      }
      break;
    }
    //case DataType.TagStr: {
      //break;
    //}
    default: {
      throw new Error("Unknown DataType "+colDef.dataType);
    }
  }

  const availableOptions: HelpTextOption[] = useMemo<HelpTextOption[]>(getAvailableOptions, 
                                              [colDef.allowedValues, colDef.allowedValuesHints, colDef.dataType, isTextInputSelect, inputData, isSelector, isCreatableSelect]);
  const selectedOptions: HelpTextOption[] = useMemo<HelpTextOption[]>(getSelectedOptions , 
                                              [colDef.dataType, availableOptions , inputData]);

  // special handling for moveOrder
  if(inputData && isMoveOrder(inputData, colDef.dataType)) {
    return <MoveOrdererButton moveOrder={inputData} changeMoveOrder={moveOrderChanged} />
  }
  else if (isSelector) {
    return ( 
      <Select className={selectStyles.editorSelect} options={availableOptions } value={selectedOptions} 
        menuPortalTarget={document.body} //must set portal target so it works inside a modal
        components={{Option: HelpTextOptionComponent}}
        isMulti={isMultiSelect}
        closeMenuOnSelect={!isMultiSelect}
        isClearable={!colDef.required}
        hideSelectedOptions={false} //whether already-selected options display. Either way duplicates aren't allowed.
        onChange={(newVal, actionMeta) => {
          console.log(`actionMeta ${actionMeta.action}, newVal ${JSON.stringify(newVal)}`); //`
          if(newVal !== null) {
            if(!isMultiValue(newVal)) {
              dataChanged(newVal.value);
            }
            else {
              dataChanged(newVal.map((val) => val.value));
            }
          }
          else if(actionMeta.action === 'clear') {
            dataChanged("");
          }
        }} 
        />
    )
  }

  else if (isTextInputSelect) {
    return ( 
      <Select className={selectStyles.editorSelect} 
        options={availableOptions} 
        value={inputData !== undefined ? {value: (inputData as string), label: (inputData as string)} : undefined} //clearIndicator only shows if val selected
        isClearable={true} 
        inputValue={(inputData !== undefined && isString(inputData, colDef.dataType)) ? inputData : ""} 
        placeholder={inputData || "Enter value or add tag from menu"} 
        controlShouldRenderValue={false}
        menuPortalTarget={document.body} 
        components={{Option: HelpTextOptionComponent, Input: TextInput, MenuList: PreviewMenuList}}
        closeMenuOnSelect={false} 
        hideSelectedOptions={false} 
        defData={{columnName: columnName, data: inputData, def: colDef, cssClasses: []}}
        setCursorPosition={(position) => {
          setTextInputCursorPosition(position);
        }}
        filterOption={(candidate, input) => { //called once for every possible option whenever input changes, want to always show all
          return true;
        }}
        onInputChange={(newVal, actionMeta) => { //gets contents of text field when input changes
          console.log(`onInputChange actionMeta ${actionMeta.action}, newVal ${JSON.stringify(newVal)}`); //`
          if(actionMeta.action === 'input-change') {
            dataChanged(newVal);
          }
        }}
        isOptionSelected={(option, selectValue) => {
          return false; //true makes them all dark blue
        }}
        onChange={(newVal, actionMeta) => { 
          console.log(`onChange actionMeta ${actionMeta.action}, newVal ${JSON.stringify(newVal)}`); //`
          if(actionMeta.action === 'select-option' && newVal !== null) {
            if(!isMultiValue(newVal)) {
              let optionToInsert = colDef.dataType === DataType.TagStr ? `[${newVal.value}]` : newVal.value; //wrap TagStr vals in [] brackets
              let textWithOptionInserted = (inputData !== undefined && isString(inputData, colDef.dataType) && textInputCursorPosition)
                ? inputData.slice(0, textInputCursorPosition.cursorStart) + optionToInsert + inputData.slice(textInputCursorPosition.cursorEnd, inputData.length)
                : optionToInsert;
              dataChanged(textWithOptionInserted);
            }
          } 
          else if(actionMeta.action === 'clear') {
            dataChanged("");
          }
        }} 
        onKeyDown={(e) => {
          if (e.keyCode === 32 && !inputData) e.preventDefault(); //space doesn't select option
          if (e.keyCode === 13) { //Enter closes menu
            setSelectMenuIsOpen(false);
            e.preventDefault();
          }
        }}
        menuIsOpen={selectMenuIsOpen}
        onMenuClose={() => setSelectMenuIsOpen(false)}
        onMenuOpen={() => setSelectMenuIsOpen(true)}
        />
    )
  }

  else if(isCreatableSelect) {
    //dupes are forbidden by default
    return (
      <CreateableSortableSelect
        className={selectStyles.editorSelect} 
        useDragHandle
        // react-sortable-hoc props:
        axis="xy"
        onSortEnd={({ oldIndex, newIndex }) => {
          let preMoveOpts = inputData && isList(inputData, colDef.dataType) ? inputData : [];
          const newValue = arrayMove(preMoveOpts, oldIndex, newIndex);
          dataChanged(newValue);
        }}
        distance={4}
        // small fix for https://github.com/clauderic/react-sortable-hoc/pull/352:
        getHelperDimensions={({ node }) => node.getBoundingClientRect()}
        // react-select props:
        menuPortalTarget={document.body} 
        isMulti
        options={availableOptions}
        value={selectedOptions}
        isValidNewOption={(inputValue: string, value: any, options: HelpTextOption[], accessors: any) => {
          let trimmed = inputValue.trim();
          if(trimmed.length === 0 || options.find((opt) => opt.value === trimmed)) {
            return false;
          }
          return true;
        }}
        onChange={(newVal, actionMeta) => {
          console.log(`creatable actionMeta ${actionMeta.action}, newVal ${JSON.stringify(newVal)}`); //`
          if(newVal !== null) {
            dataChanged(newVal.map((val) => val.value.trim()));
          }
        } }
        components={{
          // @ts-ignore We're failing to provide a required index prop to SortableElement
          MultiValue: SortableMultiValue,
          MultiValueLabel: SortableMultiValueLabel,
        }}
        closeMenuOnSelect={false}
      />
    );
  }
  else if((inputData && isList(inputData, colDef.dataType)) || colDef.dataType === DataType.List) { //empty list is undefined
    return <span>List editing handled by selector</span>
  }
  else if(isTextArea) {
    return <IonTextarea value={inputData as string} autoGrow maxlength={maxLength} debounce={debounceTime} onIonChange={(e) => {dataChanged(e.detail.value!)}}
    onIonBlur={(e) => {itemBlurred()}} ></IonTextarea>
  }
  else return (
    <IonInput value={inputData} type={inputType} maxlength={maxLength} debounce={debounceTime} onIonChange={(e) => {
      console.log('newVal is '+e.detail.value);
      dataChanged(e.detail.value!);
    }} onIonBlur={(e) => {itemBlurred()}} ></IonInput>
  );
}


export default ColumnDataEdit;
