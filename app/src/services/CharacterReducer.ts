import { ToastOptions } from '@ionic/react';
import React, { useReducer, Reducer, useEffect }from 'react';
import * as util from '../services/util';
import { reduceChanges, createChange } from '../services/merging';
import { createContainer } from 'react-tracked';
import { cloneDeep } from 'lodash';
import type * as T from '../types/characterTypes'; //==

//multiple eq rules for same column are OR (unless gt & lt both specified, then search in range). So can show mids or lows.
//So string col with allowed vals H/M/L, have multiple EQ rules to allow different heights
//But list col with possible tags LH/TC/TJ/UB, use contains rule for each val it can contain. EQ doesn't make sense I guess.
//String col contains does substring search
//rules for different columns are AND
export interface FilterRule {
  columnName: string;
  operator: "gt" | "lt" | "eq" | "contains"; //column's relation to value
  value: number | string;
}
export interface SortRule {
  columnName: string;
  operator: "asc" | "desc"; //for numeric strings, allowed values array explains how strings are ordered relative to numbers
}
export interface FilterSortRules {
  filterRules: FilterRule[];
  sortRule?: SortRule;
}


function getEmptyCharDoc(): T.CharDocWithMeta {
  return {
    _id: "",
    _rev: "",
    charName: "",
    displayName: "",
    updatedAt: new Date().toString(), 
    updatedBy: "",
    changeHistory: [], 
    universalProps: {moveOrder: []},
    moves: {},
  }
}
function getEmptyChangeList(charDoc: T.CharDocWithMeta): T.ChangeDoc { 
  return {
    updateDescription: "",
    createdAt: new Date().toString(),
    createdBy: "",
    baseRevision: charDoc._rev, //emptry string if emptyCharDoc
  }
} 
function isEmptyChangeList(changeList: T.ChangeDoc): boolean {
  //Conflicts? If you merge in theirs while you have no changes, their changeList should just overwrite yours.
  return (!changeList.moveChanges && !changeList.universalPropChanges);
}
/* Selectors:
  MoveOrder
  character?
  hasConflicts
*/
export function selectMoveOrder(state: State): T.MoveOrder[] {
  return (state.editChanges && util.getChangeListMoveOrder(state.editChanges)) || state.charDoc.universalProps.moveOrder;
}

export type NetworkOperationStatus = "in-progress" | "success" | "error"; //pending tells listener to begin, success/error tell... uh... the UI to do stuff?

export function getInitialState(characterId: string): State {
  return {
    testVal: 0,
    testVal2: 0,
    characterId: characterId,
    characterDisplayName: characterId,
    charDoc: getEmptyCharDoc(),
    initialized: false,
    editsLoaded: false,
    editsNeedWriting: false,
  }
}
export interface State {
  testVal: number;
  testVal2: number;
  characterId: string; //charDoc._id is character/talim, this is just talim
  characterDisplayName: string; //only set alongside initialization status. This would be Talim.
  initialized: boolean; //whether both charDoc and edits are loaded
  editsLoaded: boolean;
  charDoc: T.CharDocWithMeta; //starts as emptyCharDoc until loaded. Provider shouldn't render anything until this and edits are loaded.
  editChanges?: T.ChangeDoc; //NOT created if no changes! Set to undefined if you revert all changes.
  editsNeedWriting: boolean; //reducer sets to true to signify that CharacterDocAccess must write or delete local changes
  //preview and history changes live in their components
  changesToUpload?: T.ChangeDoc; 
  uploadStatus?: NetworkOperationStatus;
  changeIdToPublish?: string;
  publishStatus?: NetworkOperationStatus;

  //TODO: make this a hook? [moveOrder, filters, setFilters] = useFilterSort(baseDoc, changeDoc)
  //Each segment has independent filters that stay over segment switches. Best not to use in Edit, will just confuse ppl.
  //FilterHeader component shows searchbar, indicator of active filters, modal button

  moveToEdit?: string; //If set, shows modal to edit move. If empty string, modal for adding new move.
}
/*
  Actions with side-effects triggered by state changes or which trigger state changes:
  -local edit loading: upon loading any page that might need to know if local edits exist, dispatches setEditChanges upon load
  -local edit deletion: but dispatches deleteEditChanges after deletion
  -local edit writing: whenever editChanges is changed (unless just loaded)
  -uploading:  upon success deletes edits (which dispatches deleteEditChanges) and redirects, upon failure checks for new base and shows alert
  -publishing:  always reloads base (which might dispatch editCharDoc), upon success redirects to base, upon failure shows alert
*/
  export type EditAction = 
    | { actionType: 'testVal1' } 
    | { actionType: 'testVal2' } 

    | { actionType: 'deinitialize', characterId: string } 
    | { actionType: 'openMoveEditModal', moveName: string }
    | { actionType: 'closeMoveEditModal' } 
    | { actionType: 'editMove', moveName: string, moveChanges: T.Changes | null } //pass null to undo changes
    | { actionType: 'addMove', moveChanges: T.AddMoveChanges } 
    | { actionType: 'deleteMove', moveName: string } 
    | { actionType: 'reorderMoves', newMoveOrder: T.MoveOrder[] } 

    | { actionType: 'rebaseChanges', charDoc: T.CharDoc } //can be triggered by setCharDoc or setChangeList
    | { actionType: 'mergeChanges', changes: T.ChangeDoc } 
    | { actionType: 'resolveColumnConflict', moveName: string, columnName: string, resolution: "yours" | "theirs" } 
    | { actionType: 'resolveMoveConflicts', moveName: string, resolution: "yours" | "theirs" } 
    | { actionType: 'resolveAllConflicts', resolution: "yours" | "theirs" } 
    | { actionType: 'applyResolutions' } 

    | { actionType: 'setCharDoc', charDoc: T.CharDocWithMeta } //reject if current unresolved conflicts
    | { actionType: 'loadEditsFromLocal', editChanges?: T.ChangeDoc } //when loading from local. Set undefined if can't find local changes
    | { actionType: 'importEdits', editChanges: T.ChangeDoc } //import someone else's edits as yours
    | { actionType: 'deleteEdits' } //for manual deletion
    | { actionType: 'editsWritten' } //to signify that writes to (or deletion of) local edits have been completed in provider
    //should these be inside reducer? Local saving/writing shouldn't be.
    | { actionType: 'uploadChangeList', changes: T.ChangeDoc } //upload current list, redirect to it in changes section, and delete local after success
    | { actionType: 'publishChangeList', changeListId: string } //tells couch to calculate new doc based on that changeList id



//export function characterReducer(state: State, action: EditAction): State {
export const characterReducer: Reducer<State, EditAction> = (state, action) => {
  console.log("Reducer in characterProvider: action=" + JSON.stringify(action));
  let newState = {...state};

  //Update edits and check if they need to be written. Not called if edits being loaded or imported.
  function updateEditsAndCheckForWrite(edits?: T.ChangeDoc) {
    if(edits) { //if there's new edits, they could be real change or empty changelist for implicit deletion
      if(edits === state.editChanges) {
        throw new Error("If updating edits, pass a new object");
      }
      if(isEmptyChangeList(edits)) {
        delete newState.editChanges;
        if(state.editChanges) {
          console.log("Local edits reverted, delete");
          newState.editsNeedWriting = true;
        }
      }
      else { 
        console.log("Updating local edits, write");
        newState.editChanges = edits;
        newState.editsNeedWriting = true;
      }
    }
    else { //setting edits to undefined
      if(state.editChanges) { 
        console.log("Edits manually deleted");
        delete newState.editChanges;
        newState.editsNeedWriting = true;
      }
      else { //checked for edits in initialization and none found
        console.log("Edits loaded, none found");
      }
    }
  }

  //make sure there's some changeList to work off of (if making very first changes)
  function getEditsOrEmptyChangeList(): T.ChangeDoc {
    return state.editChanges ?? getEmptyChangeList(state.charDoc);
  }

  function setInitialized() {
    newState.editsLoaded = true;
    newState.initialized = true;
    if(newState.editChanges && newState.editChanges.baseRevision === "") {
      newState.editChanges.baseRevision = newState.charDoc._rev;
    }
    console.log("character initialized");
  }

  //If not initialized, only allow actions that perform initialization
  if(!state.initialized && !(action.actionType==='loadEditsFromLocal' || action.actionType==='setCharDoc')) {
    console.error("Cannot handle action "+action.actionType+" until initialization complete");
    return state;
  }

  switch(action.actionType) {
    case 'testVal1': {
      newState.testVal++;
      break;
    }
    case 'testVal2': {
      newState.testVal2++;
      break;
    }

    case 'deinitialize': {
      if(state.initialized) {
        console.log("Reinitializing, possibly due to character switch");
        newState = getInitialState(action.characterId);
      }
      else if(state.characterId !== action.characterId) {
        console.log("Reinitializing due to character switch before first init finished");
        newState = getInitialState(action.characterId);
      }
      break;
    }

    case 'setCharDoc': {
      const characterId = action.charDoc.charName;
      const characterDisplayName = action.charDoc.displayName;
      console.log("Loaded chardoc for "+characterId);
      //TODO: check that document matches current character?
      newState.charDoc = action.charDoc;
      newState.characterId = characterId;
      newState.characterDisplayName = characterDisplayName;
      if(state.editsLoaded) {
        setInitialized();
      }
      else {
        console.log("chardoc loaded but edits not")
      }
      //TODO: check if editChanges exists and needs rebasing. Reject if unresolved conflicts?
      break;
    }

    case 'loadEditsFromLocal': {
      newState.editChanges = action.editChanges;
      newState.editsLoaded = true;
      if(state.charDoc._id !== "") {
        setInitialized();
      }
      else {
        console.log("Edits loaded but charDoc not")
      }
      //TODO: check if editChanges needs rebasing
      break;
    }

    case 'importEdits': { //unlike loading your own edits, this should trigger a local write
      updateEditsAndCheckForWrite(action.editChanges);
      //TODO: check if editChanges needs rebasing
      break;
    }

    case 'deleteEdits': {
      updateEditsAndCheckForWrite(undefined);
      break;
    }

    case 'editsWritten': {
      newState.editsNeedWriting = false;
      break;
    }

    case 'openMoveEditModal': {
      newState.moveToEdit = action.moveName;
      break;
    }

    case 'closeMoveEditModal': {
      newState.moveToEdit = undefined;
      break;
    }

    case 'editMove': {
      let edits = util.updateMoveOrPropChanges(getEditsOrEmptyChangeList(), action.moveName, action.moveChanges, true);
      updateEditsAndCheckForWrite(edits);
      break;
    }

    case 'addMove': {
      let edits = addMoveToChangeList(getEditsOrEmptyChangeList(), action.moveChanges, state.charDoc.universalProps.moveOrder);
      updateEditsAndCheckForWrite(edits);
      break;
    }

    case 'deleteMove': {
      if(action.moveName === "universalProps") {
        console.warn("Cannot delete universalProps");
        break;
      }
      let edits = deleteMove(getEditsOrEmptyChangeList(), state.charDoc, action.moveName);
      updateEditsAndCheckForWrite(edits);
      break;
    }

    case 'reorderMoves': { //only called after adding new move, not when editing props
      //let moveOrderChange: T.Modify<T.MoveOrder[]> = {type:'modify', new: action.newMoveOrder, old: selectMoveOrder(state)};
      let moveOrderChange: T.Modify<T.MoveOrder[]> | null = createChange(state.charDoc.universalProps.moveOrder, action.newMoveOrder) as T.Modify<T.MoveOrder[]> | null;
      let edits = util.updateColumnChange(getEditsOrEmptyChangeList(), "universalProps", "moveOrder", moveOrderChange, true);
      updateEditsAndCheckForWrite(edits);
      break;
    }

    case 'uploadChangeList': {
      // Remember entered title+description+version for next submission
      updateEditsAndCheckForWrite(action.changes);
      break;
    }
  }
  return newState;
}

function deleteMove(edits: Readonly<T.ChangeDoc>, charDoc: Readonly<T.CharDoc>, moveName: string): T.ChangeDoc {
  let deleteChanges: T.DeleteMoveChanges | null = {moveName: {type: 'delete', old: moveName}};
  let moveData: T.MoveCols | undefined = charDoc.moves[moveName];
  if(moveData) {
    for(let col in moveData) {
      if(moveData[col] !== undefined) {
        deleteChanges[col] = {type:'delete', old: moveData[col]!};
      }
    }
  }
  else {
    console.log("Deleting move "+moveName+", which was previously added");
    deleteChanges = null;
  }
  let result = util.updateMoveOrPropChanges(edits, moveName, deleteChanges, true);

  //also remove it from moveOrder
  let baseMoveOrder: T.MoveOrder[] = charDoc.universalProps.moveOrder;
  const moveOrder = edits.universalPropChanges?.moveOrder?.new ?? baseMoveOrder;
  let newMoveOrder = cloneDeep<T.MoveOrder[]>(moveOrder);
  let index = moveOrder.findIndex((orderItem) => orderItem.name === moveName);
  if(index !== -1) {
    newMoveOrder.splice(index, 1);
  }
  else {
    console.warn("Deleting move "+moveName+", but can't locate it in move order");
  }
  let moveOrderChange: T.Modify<T.MoveOrder[]> | null = createChange(baseMoveOrder, newMoveOrder) as T.Modify<T.MoveOrder[]> | null;
  result = util.updateColumnChange(result, "universalProps", "moveOrder", moveOrderChange, false);
  return result;
}

//TODO: test in delete->add, whether move order changes get nooped out
function addMoveToChangeList(edits: T.ChangeDoc, moveChanges: T.AddMoveChanges, baseMoveOrder: T.MoveOrder[]): T.ChangeDoc {
    const moveName = moveChanges.moveName.new;
    //delete moveChanges.moveName;
    //consolidate deletion->addition into modification, check for existing changes and merge them. Addition->deletion handled in Modal... or maybe not?
    const oldChanges: T.MoveChanges | null = edits?.moveChanges?.[moveName] || null;
    const newOrMergedChanges: T.MoveChanges | null = oldChanges ? (reduceChanges(oldChanges, moveChanges) as T.MoveChanges) : moveChanges;

    //if(!newOrMergedChanges) {
      ////if re-adding deleted move, no change. Still prompt to re-add to moveOrder though.
      //console.warn("No changes to move.");
      //util.updateMoveOrPropChanges(edits, moveName, null);
    //}

    console.log(`Adding new move ${moveName} with changes ${JSON.stringify(newOrMergedChanges)}`);

    // add to the bottom of moveOrder with a change to universalProps
    const moveOrder = edits.universalPropChanges?.moveOrder?.new ?? baseMoveOrder;
    let newMoveOrder = cloneDeep<T.MoveOrder[]>(moveOrder);
    newMoveOrder.push({name: moveName});
    //let moveOrderChange: T.Modify<T.MoveOrder[]> = {type: "modify", new: newMoveOrder, old: edits.universalPropChanges?.moveOrder?.old ?? moveOrder};
    let moveOrderChange: T.Modify<T.MoveOrder[]> | null = createChange(baseMoveOrder, newMoveOrder) as T.Modify<T.MoveOrder[]> | null;
    //let newUniversalPropChange: T.PropChanges = {...edits.universalPropChanges, moveOrder: moveOrderChange};

    // add move change and moveorder change. Removes change if undoing a previous deletion.
    let result = util.updateMoveOrPropChanges(edits, moveName, newOrMergedChanges, true);
    //result.universalPropChanges = newUniversalPropChange;
    result = util.updateColumnChange(result, "universalProps", "moveOrder", moveOrderChange, false);
    return result;
}


export const CharacterContext = React.createContext<State | null>(null);
export function useCharacterContext(): State {
  const contextValue = React.useContext(CharacterContext);
  if(contextValue === null) {
    throw new Error("useCharacterContext must be used within CharacterProvider");
  }
  return contextValue;
}

//export const DispatchContext = React.createContext<Dispatch<ReducerAction<typeof Reducer>>| null>(null);
//export function useCharacterDispatch(): Dispatch<ReducerAction<typeof Reducer>> {
  //const contextValue = React.useContext(DispatchContext); 
  //if(contextValue === null) {
    //throw new Error("useCharacterDispatch must be used within CharacterProvider");
  //}
  //return contextValue;
//}

export const {
  Provider: CharacterContextProvider,
  useTracked: useCharacterStateUpdate,
  useUpdate: useCharacterDispatch,
  useTrackedState: useTrackedCharacterState,
  useSelector: useCharacterSelector,
//} = createContainer(() => useReducer(characterReducer, getInitialState('notarealcharacter')));
} = createContainer(useValue);

export type MiddlewareFn = ((state: State, action: EditAction, dispatch: (action: EditAction)=>void, noMiddlewareDispatch: (action: EditAction)=>void) => void);
export type MiddlewareDict = {[A in EditAction['actionType']]?: MiddlewareFn | undefined};
export type Middleware = {[componentName: string]: MiddlewareDict};

export const MiddlewareContext = React.createContext<Middleware | null>(null);
function useMiddlewareContext(): Middleware {
  const contextValue = React.useContext(MiddlewareContext);
  if(contextValue === null) {
    throw new Error("useMiddlewareContext must be used within MiddlewareProvider");
  }
  return contextValue;
}
export const MiddlewareSetterContext = React.createContext<React.Dispatch<React.SetStateAction<Middleware>> | null>(null);
function useMiddlewareSetter(): React.Dispatch<React.SetStateAction<Middleware>> {
  const contextValue = React.useContext(MiddlewareSetterContext);
  if(contextValue === null) {
    throw new Error("useMiddlewareSetter must be used within MiddlewareProvider");
  }
  return contextValue;
}

function useValue() { //any args to useValue are passed to Provider as props
  const middleware = useMiddlewareContext();
  return useReducerWithMiddleware(characterReducer, getInitialState('notarealcharacter'), middleware);
}

const useReducerWithMiddleware = (
  reducer: Reducer<State, EditAction>,
  initialState: State,
  middleware: Middleware
): [State, (action:EditAction)=>void] => {
  const [state, dispatch] = React.useReducer(reducer, initialState);

  //const dispatchWithMiddleware = (action: EditAction): void => {
  function dispatchWithMiddleware(action: EditAction): void {
    for(const component of util.keys(middleware)) {
      const dict: MiddlewareDict = middleware[component];
      const mwCallback = dict[action.actionType];
      if(mwCallback) {
        console.log(`Executing middleware from ${component} for ${action.actionType}`);
        mwCallback(state, action, dispatchWithMiddleware, dispatch);
      }
    }
    dispatch(action);
  };

  return [state, dispatchWithMiddleware];
};

//actually used by components to set their middleware functions
//Each component will provide a constant number of mw funcs, whose references will update if their deps change
export function useMiddleware(componentName: string, localDict: MiddlewareDict) {
  const setMiddleware = useMiddlewareSetter();

  useEffect(() => {
    console.log("Middleware init for "+componentName);
  }, []);
  //update callbacks
  useEffect(()=> {
    setMiddleware((mw) => {
      let changed = false;
      let updatedMW = {...mw};
      const dict: MiddlewareDict = mw[componentName] || {};
      let actionType: EditAction['actionType'];
      for(actionType in localDict) {
        if(localDict[actionType] !== dict[actionType]) {
          console.log(`${componentName}'s middleware updated for action ${actionType}`);
          changed = true;
          updatedMW[componentName] = localDict;
        }
      }
      return changed ? updatedMW : mw;
    });
  }, [localDict]);
  //delete callbacks on unmount
  useEffect(()=> {
    return(()=>{
      console.log("Unmounting "+componentName+", removing middleware");
      setMiddleware((mw) => {
        delete mw[componentName];
        return {...mw};
      });
    });
  }, []);
}
