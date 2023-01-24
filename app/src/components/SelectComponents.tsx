import Select, { components, OptionProps, MenuListProps, InputProps, MultiValue, SingleValue, MultiValueProps, GroupBase, MultiValueGenericProps, Props } from 'react-select';
import { SortableContainer, SortableContainerProps, SortableElement, SortEndHandler, SortableHandle, } from 'react-sortable-hoc';
import CreatableSelect from 'react-select/creatable';
import React, { MouseEventHandler, useEffect, useState } from 'react';
import DataRenderer from './DataRenderer';
import * as T from '../types/characterTypes';
import selectStyles from '../theme/Select.module.css';

export type CursorPosition = {cursorStart: number, cursorEnd: number};

//no other way to pass extra props without using ts-ignore
declare module 'react-select/dist/declarations/src/Select' {
  export interface Props<
    Option,
    IsMulti extends boolean,
    Group extends GroupBase<Option>
  > {
    setCursorPosition?: (position: CursorPosition) => void; 
    defData?: T.ColumnDefAndData; 
  }
}

export type HelpTextOption = {
  label: string,
  value: string,
  helpText?: string,
}

export const HelpTextOptionComponent = (props: OptionProps<HelpTextOption>) => {
  return (
      <components.Option {...props} >
        {props.label} {props.data.helpText && <span className={selectStyles.helperText}>{props.data.helpText}</span>}
      </components.Option> 
  );
};

export const PreviewMenuList = (props: MenuListProps<HelpTextOption, boolean, GroupBase<HelpTextOption>>) => {
  return <components.MenuList {...props} >
    <div className={selectStyles.previewRow}><div className={selectStyles.previewLabel}>Preview:</div> <div className={selectStyles.previewContent}><DataRenderer defData={props.selectProps.defData ?? {columnName: 'unnamed preview select column', cssClasses: []}} /></div></div>
    {props.children}
  </components.MenuList>
}

// Needed to pass cursor position to parent Select so that option can be inserted at correct place
export const TextInput = (props: InputProps<HelpTextOption, boolean, GroupBase<HelpTextOption>>) => {
  return <components.Input {...props} 
    isHidden={false} //otherwise input and the value get hidden when menu closes for some reason

    onSelect={ (e) => { //onSelect here means when text is selected or the cursor is moved, not when a drop-down item is selected
      if(props.selectProps.setCursorPosition) {
        props.selectProps.setCursorPosition({cursorStart: e.currentTarget.selectionStart ?? 0, cursorEnd: e.currentTarget.selectionEnd ?? 0}); //TODO: when would these be null?
      }
    }}
   />;
}

//function CustomSelect<
  //Option,
  //IsMulti extends boolean = false,
  //Group extends GroupBase<Option> = GroupBase<Option>
//>(props: Props<Option, IsMulti, Group>) {
  //return (
    //<Select {...props} theme={(theme) => ({ ...theme, borderRadius: 0 })} />
  //);
//}

export function isMultiValue<T>(arg: MultiValue<T> | SingleValue<T>): arg is MultiValue<T> {
  return Array.isArray(arg);
}

export function arrayMove<T>(array: readonly T[], from: number, to: number) {
  const slicedArray = array.slice();
  slicedArray.splice(
    to < 0 ? array.length + to : to,
    0,
    slicedArray.splice(from, 1)[0]
  );
  return slicedArray;
}

export const CreateableSortableSelect = SortableContainer(CreatableSelect) as React.ComponentClass<
  Props<HelpTextOption, true> & SortableContainerProps
>;
export const SortableSelect = SortableContainer(Select) as React.ComponentClass<
  Props<HelpTextOption, true> & SortableContainerProps
>;

//pass as a component to SortableSelect
export const SortableMultiValue = SortableElement(
  (props: MultiValueProps<HelpTextOption>) => {
    // this prevents the menu from being opened/closed when the user clicks
    // on a value to begin dragging it. ideally, detecting a click (instead of
    // a drag) would still focus the control and toggle the menu, but that
    // requires some magic with refs that are out of scope for this example
    const onMouseDown: MouseEventHandler<HTMLDivElement> = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const innerProps = { ...props.innerProps, onMouseDown };
    return <components.MultiValue {...props} innerProps={innerProps} />;
  }
);

//pass as a component to SortableSelect or CreatableSortableSelect
export const SortableMultiValueLabel = SortableHandle(
  (props: MultiValueGenericProps) => <components.MultiValueLabel {...props} />
);
