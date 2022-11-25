import { ToastOptions } from '@ionic/react';
import React, { useReducer, Reducer, useEffect }from 'react';
import * as util from '../services/util';
import { rebaseChangeDoc, mergeChangeDocs, reduceChanges, createChange, applyResolutions, insertByNeighbor } from '../services/merging';
import { createContainer } from 'react-tracked';
import { cloneDeep } from 'lodash';
import type * as T from '../types/characterTypes'; //==

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
    previousChange: charDoc.changeHistory.length > 0 ? charDoc.changeHistory[charDoc.changeHistory.length-1] : undefined,
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

//export type NetworkOperationStatus = "in-progress" | "success" | "error"; //pending tells listener to begin, success/error tell... uh... the UI to do stuff?

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

  moveToEdit?: string; //If set, shows modal to edit move. If empty string, modal for adding new move.
  moveToResolve?: string; //If set, shows modal to do conflict resolution for move.
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
    | { actionType: 'tryUndoUniversalPropChanges' } 
    | { actionType: 'openResolutionModal', moveName: string }
    | { actionType: 'closeResolutionModal' } 

    | { actionType: 'rebaseChanges', charDoc: T.CharDoc } //can be triggered by setCharDoc or setChangeList
    | { actionType: 'mergeChanges', changes: T.ChangeDoc } 
    | { actionType: 'resolveMove', moveName: string, resolutions: T.Conflicts } //not all conflicting columns will get resolutions
    | { actionType: 'resolveColumn', moveName: string, columnName: string, resolution: T.Resolutions } //not all conflicting columns will get resolutions
    | { actionType: 'resolveMoveConflicts', moveName: string, resolution: "yours" | "theirs" } 
    | { actionType: 'resolveAllConflicts', resolution: "yours" | "theirs" } 
    | { actionType: 'applyResolutions' } 

    | { actionType: 'setCharDoc', charDoc: T.CharDocWithMeta } //reject if current unresolved conflicts
    | { actionType: 'loadEditsFromLocal', editChanges?: T.ChangeDoc } //when loading from local. Set undefined if can't find local changes
    | { actionType: 'importEdits', editChanges: T.ChangeDoc } //import or merge someone else's edits
    | { actionType: 'deleteEdits' } //for manual deletion
    | { actionType: 'editsWritten' } //to signify that writes to (or deletion of) local edits have been completed in provider
    //should these be inside reducer? Local saving/writing shouldn't be.
    | { actionType: 'uploadChangeList', changes: T.ChangeDocServer } //upload current list, redirect to it in changes section, and delete local after success
    | { actionType: 'publishChangeList', changeListId: string } //tells couch to calculate new doc based on that changeList id



//export function characterReducer(state: State, action: EditAction): State {
export const characterReducer: Reducer<State, EditAction> = (state, action) => {
  console.log("Reducer in characterProvider: action=" + JSON.stringify(action));
  let newState = {...state};

  //Update edits and check if they need to be written. Also called when edits being imported.
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

  // Called when charDoc is set (due to initial load or an update), and when your edits are loaded
  function setInitializedAndCheckRebase() {
    newState.editsLoaded = true;
    newState.initialized = true;
    if(newState.editChanges) {
      if(newState.editChanges.baseRevision === "") {
        newState.editChanges.baseRevision = newState.charDoc._rev;
        let historyLength = newState.charDoc.changeHistory.length;
        newState.editChanges.previousChange = historyLength > 0 ? newState.charDoc.changeHistory[historyLength - 1] : undefined;
      }
      else {
        checkRebase(newState.editChanges);
      }
    }
    console.log("character initialized");
  }
  function checkRebase(edits: T.ChangeDoc) {
    if(edits && edits.baseRevision !== newState.charDoc._rev) {
      if(edits.conflictList && edits.mergeSource) {
        //you have merge conflicts and either new base loads, or your outdated edits get loaded
        console.warn("New base document loaded, but existing edits have conflicts from merge. Edits will be rebased after merge conflicts are resolved.");
      }
      else {
        rebaseChangeDoc(newState.charDoc, edits);
      }
    }
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
        //will be called if already initialized but new charDoc loaded
        setInitializedAndCheckRebase();
      }
      else {
        console.log("chardoc loaded but edits not")
      }
      break;
    }

    case 'loadEditsFromLocal': {
      newState.editChanges = action.editChanges;
      newState.editsLoaded = true;
      if(state.charDoc._id !== "") {
        setInitializedAndCheckRebase();
      }
      else {
        console.log("Edits loaded but charDoc not")
      }
      break;
    }

    case 'importEdits': { 
      //if you have no edits, import and check for rebase and write
      if(!state.editChanges) {
        let newEdits: T.ChangeDoc = {...action.editChanges, createdBy:"", createdAt: new Date().toString()};
        //clear imported edit metadata
        delete newEdits.updateTitle;
        delete newEdits.updateDescription;
        delete newEdits.updateVersion;
        rebaseChangeDoc(state.charDoc, newEdits);
        updateEditsAndCheckForWrite(newEdits);
      }
      else { //if you have edits, merge and write
        let yours: T.ChangeDoc = {...state.editChanges};
        if(yours.conflictList) {
          console.error("You have unresolved conflicts, not importing");
          break;
        }
        mergeChangeDocs(action.editChanges, yours, state.charDoc);
        updateEditsAndCheckForWrite(yours);
      }
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

    case 'tryUndoUniversalPropChanges': { 
      // Middleware call. If moveOrder was changed due to moves being added/deleted, can't undo that. 
      // In that case, MW alerts user about moveOrder and dispatches editMove action to undo whatever can be undone.
      break;
    }

    case 'resolveColumn': {
      let conflict = state.editChanges?.conflictList?.[action.moveName]?.[action.columnName];
      if(!conflict) {
        console.error(`No conflict found for ${action.moveName}.${action.columnName}`);
        break;
      }
      console.log(`resolving conflict for ${action.moveName}.${action.columnName}, changing resolution from "${conflict.resolution}" to "${action.resolution}"`);
      let resolvedConflict = {...conflict, resolution: action.resolution};
      //this will resolve all if it's a moveName conflict for whether the move should be deleted or not
      let edits = util.updateColumnConflict(getEditsOrEmptyChangeList(), action.moveName, action.columnName, resolvedConflict, true);
      updateEditsAndCheckForWrite(edits);
      break;
    }

    case 'applyResolutions': {
      if(!state.editChanges) {
        console.warn('applyResolutions dispatched with no current edits');
        break;
      }
      let edits = {...state.editChanges};
      applyResolutions(edits);
      checkRebase(edits);
      updateEditsAndCheckForWrite(edits);
      break;
    }

    case 'uploadChangeList': {
      // Mostly handled by middleware.
      // Remember entered title+description+version for next submission. If upload succeeded, action will be dispatched deleting edits.
      updateEditsAndCheckForWrite(action.changes);
      break;
    }

    case 'publishChangeList': {
      // Uhhh do nothing? Middleware handles this.
      break;
    }
    
    default: {
      console.warn("Action " + action.actionType + " not implemented");
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
    //consolidate deletion->addition into modification, check for existing changes and merge them. Addition->deletion handled in Modal... or maybe not?
    const oldChanges: T.MoveChanges | null = edits?.moveChanges?.[moveName] || null;
    const newOrMergedChanges: T.MoveChanges | null = oldChanges ? (reduceChanges(oldChanges, moveChanges) as T.MoveChanges) : moveChanges;

    console.log(`Adding new move ${moveName} with changes ${JSON.stringify(newOrMergedChanges)}`);

    // add to moveOrder
    const moveOrder = edits.universalPropChanges?.moveOrder?.new ?? baseMoveOrder;
    let newMoveOrder = cloneDeep<T.MoveOrder[]>(moveOrder);
    // If undoing deletion, search old moveOrder for its position and put it back
    if(!newOrMergedChanges) {
      let orderMap: Map<string, T.MoveOrder> = new Map<string, T.MoveOrder>(newMoveOrder.map((item)=>[item.name, item]));
      let baseOrderMap: ReadonlyMap<string, [T.MoveOrder, number]> = new Map<string, [T.MoveOrder, number]>(baseMoveOrder.map((item, index)=>[item.name, [item, index]]));
      let insertIndex = insertByNeighbor(moveName, orderMap, newMoveOrder, baseOrderMap, baseMoveOrder);
      if(insertIndex !== -1) {
        console.log(`Restored deleted move ${moveName} into order at index ${insertIndex}`);
      }
      else {
        console.warn(`Restored deleted move ${moveName} but wasn't present in base order, adding to end`);
        newMoveOrder.push({name: moveName});
      }
    }
    else {
      newMoveOrder.push({name: moveName});
    }
    let moveOrderChange: T.Modify<T.MoveOrder[]> | null = createChange(baseMoveOrder, newMoveOrder) as T.Modify<T.MoveOrder[]> | null;

    // add move change and moveorder change. Removes change if undoing a previous deletion.
    let result = util.updateMoveOrPropChanges(edits, moveName, newOrMergedChanges, true);
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
