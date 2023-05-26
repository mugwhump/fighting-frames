import React, { useMemo, useReducer, useCallback, useEffect, Dispatch, ReducerAction, useState } from 'react';
import { useLocation, useHistory } from 'react-router';
import { GameProvider } from './GameProvider';
import PouchDB from 'pouchdb';
import CompileConstants from '../constants/CompileConstants';
import { StringSet, Credentials } from '../types/utilTypes';

export type db = string;
//export type CredentialStore = Record<db, Credentials>; // With superlogin users should only need one set of credentials
export type Preferences = {
  localEnabled: boolean, //enable if user chooses to download a db?
  preferLocal: boolean, //TODO: remove, compileconstant does its job. If local's enabled, it should be preferred.
  showTutorials: boolean, //default true only on platforms where local data won't be wiped
}

// TODO: handling for if old version is saved but a new property is added to LocalData. 
//Should have transformers for each version that changes state structure
export type LocalData = {
  //credentials: CredentialStore, //only stores non-default credentials
  credentials: Credentials,
  preferences: Preferences,
  tutorials: StringSet, //if the name of the tutorial is here, you saw it.
  wantedDbs: StringSet, //if name of DB is here, user wants it. Includes top.
}

type LocalDoc = PouchDB.Core.Document<LocalData>;
type LatestPage = {latestPage: string};
type LatestPageDoc = PouchDB.Core.Document<LatestPage>;


const initialState: LocalData = {
  //credentials: {"sc6": {username:"bobbu", password:"pw"}},
  credentials: CompileConstants.DEFAULT_CREDENTIALS,
  preferences: {localEnabled: CompileConstants.DEFAULT_LOCAL_ENABLED, preferLocal: CompileConstants.DEFAULT_PREFER_LOCAL, showTutorials: false},
  tutorials: new StringSet(["bonono"]),
  wantedDbs: new StringSet(),
};


export type Action = 
  | { actionType: 'loadState', doc: LocalDoc }
  //| { actionType: 'addCredentials', db: db, creds: Credentials }
  //| { actionType: 'updateCredentials', db: db, creds: Credentials }
  | { actionType: 'updateCredentials', creds: Credentials }
  | { actionType: 'resetCredentials' }
  | { actionType: 'updatePreferences', preferences: Preferences }
  | { actionType: 'setUserWants', db: string, userWants: boolean } //Confirm user's cool with db size before this. If anything's here, top is here.
  //| { actionType: 'updateLatestPage', latestPage: string }

// Reducers are preferably pure, but anything that needs to trigger updates must change its reference/value
// objects are by-reference, so don't store reference anywhere, do state.credentials[game].username every time
function LocalReducer(state: LocalData, action: Action): LocalData {
  //let newState: LocalData = cloneData(state); //this makes everything believe all sub-values changed
  //let newState: LocalData = state; //no state change done/dispatched until localprovider re-renders
  let newState: LocalData = {...state}; //THE SECRET: reference to state itself changes, but its members have same references
  console.log("Action (tuts and userWants don't stringify): " + JSON.stringify(action));
  switch(action.actionType) {
    //case 'addCredentials':
    case 'updateCredentials': {
      //let newCreds: CredentialStore = {};
      //for(let key in newState.credentials) {
        //newCreds[key] = {...newState.credentials[key]};
      //}
      //TODO: check validity? And website version should not store credentials.
      //newState.credentials = newCreds;
      //newState.credentials[action.db] = action.creds; //need new credentials record object to trigger dep updates
      newState.credentials = action.creds;
      break;
    }
    case 'resetCredentials': {
      newState.credentials = CompileConstants.DEFAULT_CREDENTIALS;
      break;
    }
    case 'loadState': {
      newState.credentials = action.doc.credentials;
      newState.preferences = action.doc.preferences;
      //pouch naturally reads it as a Set, must manually recreate
      newState.tutorials = new StringSet(...[action.doc.tutorials]);
      newState.wantedDbs = new StringSet(...[action.doc.wantedDbs]);
      break;
    }
    case 'updatePreferences': {
      newState.preferences = action.preferences;
      break;
    }
    //case 'updateLatestPage': {
      //newState.latestPage = action.latestPage;
      //break;
    //}
    case 'setUserWants': {
      let newWantedDbs: StringSet = new StringSet([...state.wantedDbs]);
      if(action.userWants) {
        if(state.preferences.localEnabled) {
          newWantedDbs.add("top");
          newWantedDbs.add(action.db);
        }
        else {
          console.error("Trying to download DB when local downloads aren't enabled");
        }
      }
      else {
        newWantedDbs.delete(action.db);
        if(CompileConstants.DELETE_TOP_IF_NOTHING_ELSE_WANTED && newWantedDbs.size === 1 && newWantedDbs.has("top")) {
          newWantedDbs.delete("top");
        }
      }
      newState.wantedDbs = newWantedDbs;
      break;
    }
  }
  return newState;
}

const StateContext = React.createContext<LocalData | null>(null);
const DispatchContext = React.createContext<Dispatch<ReducerAction<typeof LocalReducer>>| null>(null);

const docId: string = CompileConstants.LOCAL_DATA_DOC_ID;
const locationDocId: string = CompileConstants.LOCAL_LATEST_PAGE_DOC_ID;
//TODO: for hardcore non-local version, set to null here, set to below in initialization if localEnabled in constants, and listen for change to true
//but is there even a way to check if local was previously used without attempting db access? Need web served version to test.
//Apparently even safari/ios only show a popup to users once you request > 5MB, should be fine
const database: PouchDB.Database = new PouchDB<LocalDoc | LatestPageDoc>(CompileConstants.LOCAL_SETTINGS_DB);


export const LocalProvider: React.FC = ({children}) => {
  const [state, dispatch] = useReducer(LocalReducer, initialState);
  const [initialized, setInitialized] = useState<boolean>(false);
  const history = useHistory();
  interface LocationState {from: string};
  const location = useLocation<LocationState>();

  function pathIsRootOrHome(path: string) {
    return (path === CompileConstants.HOME_PATH || path === '/');
  }

  // Returns promise resolving to LocalDoc, or throws error
  const getLocalDoc = useCallback(async () => {
    if(!state.preferences.localEnabled) throw new Error("Called getLocalDoc() when local not enabled");
    return await database.get<LocalDoc>(docId);
  }, [state.preferences.localEnabled]);


  //async function getLatestPageDoc(): Promise<LatestPageDoc & PouchDB.Core.GetMeta> {
  const getLatestPageDoc = useCallback(async () => {
    if(!state.preferences.localEnabled) throw new Error("Called getLatestPageDoc() when local not enabled");
    return await database.get<LatestPageDoc>(locationDocId);
  }, [state.preferences.localEnabled]);

  const writeLocalDoc = useCallback(async (docExists: boolean) => {
    if(!state.preferences.localEnabled) {
      console.log("Not saving local data since local disabled");
      return; //compiler wraps in immediately-resolved promise
    }
    console.log("Saving local data");
    const putDoc: PouchDB.Core.PutDocument<LocalData> = state; 
    putDoc._id = docId; 
    if(docExists) {
      const doc = await getLocalDoc(); //get current _rev, must specify when updating existing doc or get conflict
      putDoc._rev = doc._rev;
    }
    return await database.put(putDoc).catch((err) => {
        if(err.name === "conflict") { //if one write starts while another's in progress, 409 immediate conflict.
          //but since writes all use latest state, just try again.
          console.log("conflict writing localData, retrying: " + JSON.stringify(err));
          writeLocalDoc(true);
        }
        else {
          throw(err);
        }
      });
  }, [state, getLocalDoc]);


  useEffect(() => {

    async function initializeAppState() {
      if(!state.preferences.localEnabled) {
        console.log("Not initializing from local data since local disabled");
        setInitialized(true);
        return;
      }
      try {
        let doc: LocalDoc = await getLocalDoc();
        //if doesn't exist, error caught, doc created, state is already initialState
        loadState(doc);
        console.log('Loaded saved LocalData'); //state updates are deferred, new state isn't visible to this console.log
        await getAndNavigateLatestPage();
      }
      catch(err: any) {
        if(err.name === "not_found") {
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

    async function getAndNavigateLatestPage() {
      try {
        const latestPageDoc: LatestPageDoc = await database.get<LatestPageDoc>(locationDocId); 
        const latestPage: string = latestPageDoc?.latestPage;
        if(latestPage) {
          if(!pathIsRootOrHome(latestPage) && pathIsRootOrHome(location.pathname)) {
            console.log("Initializing with latest page = " + latestPage);
            history.replace(latestPage); 
          }
          else {
            console.log("LatestPage was home or current page isn't home, not navigating");
          }
        }
      }
      catch(err) {
        console.log("Error loading latest page doc: " + err);
      }
    }

    async function createInitialDoc() {
      console.log("Creating initial local document");
      return writeLocalDoc(false);
    }

    if(!initialized) {
      console.log("Initializing localProvider, this should only run once...");
      initializeAppState();
    }
  }, [initialized, state.preferences.localEnabled, history, location.pathname, getLocalDoc, writeLocalDoc]);


  function loadState(doc: LocalDoc) {
    console.log("Loading saved local data into provider");
    dispatch({actionType: 'loadState', doc: doc});
  }


  useEffect(() => {
    if(initialized) { // Reducer getting set to initialState counts as a change
      console.log("LocalProvider state changed, writing to document");
      writeLocalDoc(true).then(()=> {
        console.log("done writing localprovider doc");
      }).catch((err) => {
        if(err.name !== "conflict") { //non-conflict error
          console.error("Non-conflict error writing localData: " + JSON.stringify(err));
          throw err;
        }
      });
    }
  }, [state, initialized, writeLocalDoc]); 


  useEffect(()=> {
    //Don't worry about initial creation for this one
    async function writeLatestPage(path: string) {
      if(!state.preferences.localEnabled) { return; }
      const putDoc: PouchDB.Core.PutDocument<LatestPage> = {latestPage: path};
      putDoc._id = locationDocId; 
      try {
        const doc = await getLatestPageDoc(); //get current _rev, must specify when updating existing doc or get conflict
        if(doc) {
          putDoc._rev = doc._rev;
        }
      }
      catch(err) {
        console.log("Error fetching latestPage Doc for first write, probably doesn't exist: " + err);
      }
      return await database.put(putDoc).catch((err) => {
          if(err.name === "conflict") { //if one write starts while another's in progress, 409 immediate conflict.
            console.log("conflict writing latestPage, NOT retrying: " + JSON.stringify(err));
            //writeLatestPage(path); //if user quickly navigates to a different page, captured path argument will be stale
          }
          else {
            throw(err);
          }
        });
    }

    const wasRedirected: boolean = location?.state?.from === '/';
    //this hook is triggered by first load for /, then again post-initialize for the redirect to home path
    //if user initializes on a specific page, don't navigate away from it to their latestPage
    if((initialized || !pathIsRootOrHome(location.pathname)) && !wasRedirected) { 
      console.log(`Writing latestPage for ${location.pathname}`);
      writeLatestPage(location.pathname);
    }
    else console.log(`Not writing latestPage for ${location.pathname} since not initialized`);
  }, [location, initialized, state.preferences.localEnabled, getLatestPageDoc]);

  useEffect(() => {
    console.log("LocalProvider rendered");
  }, )

  if(!initialized) {
    return (<span>Initializing...</span>);
  }
  else {
    //TODO: should dispatch not be outside state?
    //TODO: putting GameProvider here instead of inside children means it rerenders whenever LocalProvider updates
    // see https://dev.to/javmurillo/react-context-all-in-one-54ck#does-my-entire-app-rerender-if-the-provider-state-changes
    // <Context.Provider> will only re-render if its children prop does not share reference equality with its previous children prop.
    // If {children} are same but value changes, still doesn't re-render them. But using <GameProvider> raw creates a new element every time.
    // see https://web.archive.org/web/20211120024251/https://frontarm.com/james-k-nelson/react-context-performance/
    // Other alternative is memoizing children. 
    // GameProvider now exports a memoized component, doesn't seem to have changed rendering behavior, although it did for LoginProvider.
    return (
      <StateContext.Provider value={state}>
        <DispatchContext.Provider value={dispatch}>
          <GameProvider storedCredentials={state.credentials} wantedDbs={state.wantedDbs} localEnabled={state.preferences.localEnabled}>
            {children}
          </GameProvider>
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

// (map) => (wc) => (props) => jsx
export const withLocalContext = (
  mapState: (state: LocalData) => any,
  //mapDispatchers: any = React.useContext(TestDispatchContext) // could use this, have components take dispatch as prop. Or just use hook
) => ((WrapperComponent: React.FC<any>) => {
  function EnhancedComponent(props: any){
    const state: LocalData = useLocalData();
    const { ...statePointers } = mapState(state);
    //const { ...dispatchPointers } = mapDispatchers(targetContext);
    const memoFunc:()=>JSX.Element = () => (<WrapperComponent {...props} {...statePointers}  />);
    //useEffect(() => {
      //return () => {console.log("LocalContext WRAPPER unmounted")};
    //}, []);
    return useMemo<JSX.Element>(
      memoFunc,
      [
        ...Object.values(statePointers),
        ...Object.values(props),
      ]
    );
  }
  function getDisplayName(com: any) {
    return com.displayName || com.name || 'Component';
  }
  EnhancedComponent.displayName = `withContext(${getDisplayName(WrapperComponent)})`;
  return EnhancedComponent;
});

