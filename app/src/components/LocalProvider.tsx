import React, { useRef, useReducer, useEffect, Dispatch, ReducerAction, useState } from 'react';
import PouchDB from 'pouchdb';
import { createContextSelector } from 'react-context-selector';
import { usePouch } from 'use-pouchdb';

export type Credentials = {
  username: string,
  password: string 
}
export type db = string;
export type CredentialStore = Record<db, Credentials>; //records have unique keys 
export type Preferences = {
  autoDownload: boolean,
  showTutorials: boolean, //default true only on platforms where local data won't be wiped
}
//if the name of the tutorial is here, you saw it.
export type TutorialsDone = string[]; 

export type LocalData = {
  credentials: CredentialStore,
  preferences: Preferences,
  tutorials: TutorialsDone,
}

//type LocalDoc = LocalData & PouchDB.Core.IdMeta & PouchDB.Core.GetMeta;
type LocalDoc = PouchDB.Core.Document<LocalData>;

function cloneData(data: LocalData): LocalData {
  let newCreds: CredentialStore = {};
  // Spread operator only makes a shallow copy
  for(let key in data.credentials) {
    newCreds[key] = {...data.credentials[key]};
  }

  let newData: LocalData = {
    credentials: newCreds,
    preferences: {...data.preferences},
    tutorials: [...data.tutorials] 
  }
  return newData;
}

const initialState: LocalData = {
  credentials: {"sc6": {username:"bobbu", password:"pw"}},
  preferences: {autoDownload: true, showTutorials: true},
  tutorials: ["banana"],
};

//export type ContextValue = {
  //data: LocalData,
  //dispatch: Dispatch<ReducerAction<typeof LocalReducer>>,
//}
type ValueOf<T> = T[keyof T];
//export type ContextValueSubType<Type extends ValueOf<LocalData>> = {
  //data: Type,
  //dispatch: Dispatch<ReducerAction<typeof LocalReducer>>,
//}
// must default to null for my useLocalData's "inside a LocalProvider" check to work 
// initialState is still set in useReducer before anything else
//const CredentialContext = React.createContext<ContextValue | null>(null);
//const [ContextCleaner, useCredentialContextSelector] = createContextSelector<ContextValue | null>(CredentialContext);


export type Action = 
  | { actionType: 'loadState', doc: LocalDoc }
  | { actionType: 'addCredentials', db: db, creds: Credentials }
  | { actionType: 'updateCredentials', db: db, creds: Credentials }
  | { actionType: 'changePreferences', preferences: Preferences }

// Reducers are preferably pure so all DB stuff done in useEffect, which watches state
// objects are by-reference, so don't store reference anywhere, do state.credentials[game].username every time
function LocalReducer(state: LocalData, action: Action): LocalData {
  //let newState: LocalData = cloneData(state);
  //let newState: LocalData = state; //no state change done/dispatched until localprovider re-renders
  let newState: LocalData = {...state}; //THE SECRET: reference to state itself changes, but its members have same references
  console.log("Action: " + JSON.stringify(action));
  switch(action.actionType) {
    case 'addCredentials':
    case 'updateCredentials': {
      let newCreds: CredentialStore = {};
      for(let key in newState.credentials) {
        newCreds[key] = {...newState.credentials[key]};
      }
      //TODO: check validity? And website version should not store credentials.
      newState.credentials = newCreds;
      newState.credentials[action.db] = action.creds; //need new credentials record object to trigger dep updates
      break;
    }
    case 'loadState': {
      newState.credentials = action.doc.credentials;
      newState.preferences = action.doc.preferences;
      newState.tutorials = action.doc.tutorials;
      break;
    }
    case 'changePreferences': {
      newState.preferences = action.preferences;
      break;
    }
  }
  return newState;
}

const StateContext = React.createContext<LocalData | null>(null);
const DispatchContext = React.createContext<Dispatch<ReducerAction<typeof LocalReducer>>| null>(null);

export const LocalProvider: React.FC = ({children}) => {
  const [state, dispatch] = useReducer(LocalReducer, initialState);
  const [initialized, setInitialized] = useState<boolean>(false);
  //const value: ContextValue = {data, dispatch};
  const stateRef = useRef(state); //ref lets us bypass re-renders for state change to substitute our event listeners, also avoids stale closures
  const database: PouchDB.Database = new PouchDB("local-provider");

  async function initializeAppState() {
    try {
      let doc: LocalDoc = await getLocalDoc();
      //if doesn't exist, error caught, doc created, state is already initialState
      loadState(doc);
      console.log('Loaded saved LocalData:' + JSON.stringify(doc));
    }
    catch(err) {
      if(err.name == "not_found") {
        createInitialDoc().catch((err) => {
          console.error("Error creating initial local document: " + JSON.stringify(err));
        });
      }
      else {
        console.error(JSON.stringify(err));
      }
    }
    finally {
      setInitialized(true);
    }
  }

  // Returns promise resolving to LocalDoc, or throws error
  async function getLocalDoc() {
      return await database.get<LocalDoc>("localData");
  }

  async function createInitialDoc() {
    console.log("Creating initial local document");
    return writeLocalDoc(false);
  }

  async function writeLocalDoc(docExists: boolean) {
    console.log("Saving local data");
    const putDoc: PouchDB.Core.PutDocument<LocalData> = state; 
    putDoc._id = "localData"; 
    if(docExists) {
      const doc = await getLocalDoc(); //get current _rev, must specify when updating existing doc or get conflict
      putDoc._rev = doc._rev;
    }
    return await database.put(putDoc);
  }

  function loadState(doc: LocalDoc) {
    console.log("Loading saved local data into provider");
    dispatch({actionType: 'loadState', doc: doc});
  }

  useEffect(() => {
    initializeAppState();
  }, []);
  useEffect(() => {
    console.log("LocalProvider rendered");
  });
  useEffect(() => {
    if(initialized) { // Reducer getting set to initialState counts as a change
      console.log("LocalProvider state changed, writing to document");
      writeLocalDoc(true).catch((err) => {console.error("error writing localData: " + JSON.stringify(err))});
    }
  }, [state]); 

  // manually listen to sub-state changes and dispatch update events
  function useSubsetChange(key: keyof LocalData): void {
    useEffect(() => {
      console.log("Key "+JSON.stringify(key)+" has been changed. Dependency = " + JSON.stringify(state[key]));
      const customEvent = new CustomEvent('update-'+key, {
        detail: {[key]: state[key]},
      })
      document.dispatchEvent(customEvent)
    }, [state[key as keyof LocalData]]); //TODO: TEST
  }
  useSubsetChange("tutorials");

  //useSubsetChange("credentials");
    useEffect(() => { //doesn't matter which I use, all listeners rerender either way cuz of cloning
      console.log("Creds have changed.");
      const customEvent = new CustomEvent('update-credentials', {
        detail: {credentials: state.credentials},
      })
      document.dispatchEvent(customEvent)
    }, [state.credentials]); //TODO: TEST

  //useSubsetChange("preferences");
    useEffect(() => { //doesn't matter which I use, all listeners rerender either way cuz of cloning
      console.log("Prefs have changed.");
      const customEvent = new CustomEvent('update-preferences', {
        detail: {preferences: state.preferences},
      })
      document.dispatchEvent(customEvent)
    }, [state.preferences]); //TODO: TEST

  if(!initialized) {
    return (<span>Initializing...</span>);
  }
  else {
    //return (
      //<CredentialContext.Provider value={value}>
        //<ContextCleaner />
        //{children}
      //</CredentialContext.Provider>
    //)
    return (
      <StateContext.Provider value={stateRef.current}>
        <DispatchContext.Provider value={dispatch}>
          {children}
        </DispatchContext.Provider>
      </StateContext.Provider>
    )
  }
}

//since this uses a ref, doesn't trigger renders; events do that
export function useLocalData(): LocalData {
  const contextValue = React.useContext(StateContext); 
  if(contextValue === null) {
    throw new Error("useLocalData must be used within LocalProvider");
  }
  return contextValue;
}
export function useLocalDispatch(): Dispatch<ReducerAction<typeof LocalReducer>> {
  const contextValue = React.useContext(DispatchContext); 
  if(contextValue === null) {
    throw new Error("useLocalDispatch must be used within LocalProvider");
  }
  return contextValue;
}

// TODO: some kind of type assertion to make sure given key matches given value
export function useLocalSubset<Type extends ValueOf<LocalData>>(key: keyof LocalData): Type {
  const state = useLocalData();
  const [subset, setSubset] = useState<Type>(state[key] as Type);

  const listener = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail) {
      setSubset(detail[key]);
    }
    console.log("listener triggered for key=" + key + ", details=" + JSON.stringify(detail));
  }

  useEffect(() => {
    document.addEventListener('update-'+key, listener);
    console.log("adding listener for context subset: " + JSON.stringify(subset));
    return () => {
      document.removeEventListener('update-'+key, listener);
    }
  }, [subset]);

  return subset;
}

//export function useLocalData(): ContextValue {
  //const contextValue = React.useContext(CredentialContext);
  //if(contextValue === null) {
    //throw new Error("useLocalData must be used within CredentialProvider");
  //}
  //return contextValue;
//}

//export function useLocalDataSelector<Type extends keyof LocalData>(selector: (state: any)=> [Type, any]): any {
//state in the passed selector function will be ContextValue
/*
export function useLocalDataSelector<Type extends ValueOf<LocalData>>(selector: (state: any)=> ContextValueSubType<Type>): ContextValueSubType<Type> {
  const contextValue = useCredentialContextSelector(selector);
  //TODO: check that provider test works in this version
  if(contextValue === null) {
    throw new Error("useLocalDataSelector must be used within CredentialProvider");
  }
  return contextValue;
}*/
