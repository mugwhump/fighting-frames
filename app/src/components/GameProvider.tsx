import React, { useRef, Ref, useReducer, ReducerAction, Dispatch, useState, useEffect, useMemo, MutableRefObject, useCallback } from 'react';
import { useLocation, useHistory, useRouteMatch, matchPath, match } from 'react-router';
import { useIonViewDidEnter } from '@ionic/react';
import { Provider } from 'use-pouchdb'
import PouchDB from 'pouchdb';
import { Network, ConnectionStatus, ConnectionType } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';
import * as myPouch from '../services/pouch';
import CompileConstants from '../services/CompileConstants';
import { shallowCompare } from '../services/util';
import { StringSet, DBStatuses } from '../types/utilTypes';
import { useLocalDispatch, Credentials, CredentialStore, Action as LocalAction} from './LocalProvider';
import LoginModal from './LoginModal';
import { setTimeout, clearTimeout } from 'timers';
//This component will become the container for a game with corresponding db,
//within which chars/docs will be displayed. Has <Provider> with overriding db

//TODO: take a closer look at rendering behavior with this and LocalProvider...
type GameProviderProps  = {
  children: React.ReactNode,
  credentialStore: CredentialStore,
  wantedDbs: StringSet,
  localEnabled: boolean,
}

// Pouch replication events: .on("change | complete | paused | active | denied | error")
export type DBTransitionState = "loggingIn" | "downloading" | "deleting" | null;
export type DBStatus = {
  currentTransition: DBTransitionState,
  userWants: boolean, //loaded in upon init. Indication of whether user WANTS this db, not an indication of if it's finished. If wanted, replicate on app start.
  done: boolean, //means the download status has been verified to match the userWants status. Unwanted dbs are assumed done initially.
  localError: PouchDB.Core.Error | Error | null, 
  remoteError: PouchDB.Core.Error | Error | null, //perm issues
}

type State = {
  gameId: string,
  usingLocal: boolean,
  isOnline: boolean | null, //includes network issues and website issues, but not DB-specific or permissions issues
  dbStatuses: DBStatuses, //also includes top. If queried for db it has no info for, initializes it to initialDBStatus
  //TODO: DBStatuses is a Map subclass, but react prefers easily serializable basic types for state... probably fine.
}
const initialState: State = {
  gameId: "top",
  usingLocal: CompileConstants.DEFAULT_PREFER_LOCAL,
  isOnline: null,
  dbStatuses: new DBStatuses(),
}
export const initialDBStatus: DBStatus = { //created for top and latestpage during initialization, for others once top loads
  currentTransition: null,
  userWants: false,
  done: true, //for wanted dbs, initialized to false
  localError: null,
  remoteError: null 
}
export type Action = 
  | { actionType: 'changeCurrentDB', db: string } //when db selected from menu
  //only dispatch fetch actions if the doc being fetched was from the current database
  | { actionType: 'fetchSuccess', usedLocal: boolean, doc?: any }
  // with usePouch, sometimes standard Errors (like TypeError from failed fetch) aren't converted to CustomPouchError, which has toJSON (but doesn't have a typescript definition)
  // But note that when CustomPouchError wraps a TypeError, error.name is just "Error"...
  | { actionType: 'fetchFailure', error: PouchDB.Core.Error | Error, usedLocal: boolean, dispatcher: string } //NOT replication failure, for doc access failure
  | { actionType: 'uploadDB', db: string } 
  | { actionType: 'retry', db: string } 
  // ---------------- ONLY CALLED INTERNALLY, but still modify state --------------------
  // REMEMBER! State updates are deferred until the next render! If update state, must listen in hook to continue any logic that needs new state!
  | { actionType: 'setUserWants', db: string, wantedDBs: StringSet }
  | { actionType: 'downloadDB', db: string } //when updating or user wants
  | { actionType: 'downloadSuccess', db: string }
  | { actionType: 'downloadFailure', db: string, error: PouchDB.Core.Error | Error } 
  | { actionType: 'deleteDB', db: string } //when user doesn't want. If DL in progress, abort. Don't worry about mid-deletion crashes.
  | { actionType: 'deletionSuccess', db: string }
  | { actionType: 'deletionFailure', db: string, error: PouchDB.Core.Error | Error } 
  | { actionType: 'cameOnline', db: string } //called by checker or login func. Must also check db access.
  | { actionType: 'loginSuccess', db: string } 
  | { actionType: 'loginFailure', db: string, error: PouchDB.Core.Error | Error } 

function Reducer(state: State, action: Action) {
  console.log("Reducer in gameprovider: action=" + JSON.stringify(action));
  let newState = {...state};
  let newDbStatuses: DBStatuses = new DBStatuses(state.dbStatuses.entries()); //by default, new object with same status references. Only actually assigned to newState if changing.
  //DBstatus references stay same so can update other dbs in background w/o re-rendering current one
  let gameId = state.gameId;
  let currentStatus = state.dbStatuses.get(gameId);

  //construct shallow copy to update, like updateDbStatus({...currentStatus, done: true})
  function updateDbStatus(newStatus: DBStatus, game: string) {
    if(newStatus === state.dbStatuses.get(game)) {
      throw new Error("Error, must shallow copy DBStatus if updating");
    }
    if(shallowCompare(state.dbStatuses.get(game), newStatus)) return; //if same values, don't trigger change
    newDbStatuses.set(game, newStatus);
    newState.dbStatuses = newDbStatuses;
  }

  if(action.actionType === "fetchFailure" || action.actionType === "deletionFailure") {
    if(Object.keys(action.error).length === 0){
      if(action.error instanceof Error) {
        //TODO: should convert to an error type that works with JSON.stringify before storing in state
        console.log("Included error is instance of standard js Error. Stringified: " + action.error.toString());
      }
      else {
        console.warn("Error provided with fetchFailure action is empty object and not instanceof Error.");
      }
    }
  }

  switch(action.actionType) {
    case 'changeCurrentDB': {
      //called when provider loads and gets game from route match
      newState.gameId = action.db;
      const status: DBStatus = state.dbStatuses.get(action.db);
      if(!state.usingLocal && status.userWants && status.done) {
        console.log(`Changing to downloaded db ${action.db}, so switching to local`);
        newState.usingLocal = true;
      }
      else if(state.usingLocal && !status.userWants) {
        console.log(`Changing to undownloaded db ${action.db}, so switching to remote`);
        newState.usingLocal = false;
      }
      //Logging in as default handled by useEffects, logging in as non-default is manual
      break;
    }
    // isOnline and done(+userWants) are what prevents loops
    case 'fetchFailure': {
      let shouldSwapAndRetry = true;

      if(state.usingLocal === action.usedLocal) { //make sure action represents genuine failure
        if(!state.usingLocal) { //tried network
          //TODO:Online failed, diagnose network error, or other errors like online but wrong resource name, etc
          switch(action.error.name) {
            //low-level fetch API will throw TypeErrors when no connectivity
            case "TypeError" : 
            //happens for made-up db
            case "not_found" :
            //bad uname/pw
            case "unauthorized" :
          }
          if(!state.dbStatuses.get(state.gameId).userWants) {
            //if user never wanted it it ain't there, give up
            console.log("Fetchfailed remotely and db not wanted, not retrying");
            shouldSwapAndRetry = false
          }
          else if(!state.dbStatuses.get(state.gameId).done) {
            //throw new Error("Fetchfailed remotely and db wanted but not done");
          }
          if(state.dbStatuses.get(state.gameId).localError) {
            console.log("Fetchfailed remotely and previous local error, not retrying");
            shouldSwapAndRetry = false
          }
          updateDbStatus({...currentStatus, remoteError: action.error}, gameId);
          //TODO: only say not online if can't connect to server, not for db-specific issues
          newState.isOnline = false;
          if(shouldSwapAndRetry) {
            console.log("Attempting local load after failing remotely, setting remoteError");
            newState.usingLocal = true;
          }
        }
        else { //tried local
          switch(action.error.name) {
            //if it says "Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing.", means using outdated Database object after destroying.
            //Also getting after failure to fetch from db that couldn't dl (in this case because unauthorized). Uhh maybe not?
            //Can also happen if user is private browsing in FF, which disables localStorage
            case "InvalidStateError" : 
            //regular 404, given for made-up DB
            case "not_found" : 
            //"Version change transaction was aborted in upgradeneeded event handler." Can happen when execution is paused in breakpoints.
            case "indexed_db_went_bad" :
          }
          if(state.isOnline === false || currentStatus.remoteError !== null) {
            console.log("Fetchfailed locally after failing remotely, not retrying.");
            shouldSwapAndRetry = false
          }
          else { //no remoteError and isOnline true or null
            //TODO: set done to false in a way that won't prompt downloader to try grabbing it again
            updateDbStatus({...currentStatus, localError: action.error}, gameId);
            if(shouldSwapAndRetry) {
              console.log("Attempting remote load after failing locally, setting localError");
              newState.usingLocal = false;
            }
          }
        }
      }
      else {
        console.log(`Fetch using ${action.usedLocal ? 'local':'remote'} in ${action.dispatcher} failed but does not match current state`);
      }
      break;
    }
    case 'fetchSuccess': {
      if(state.gameId === "top" && action.doc) {
        console.log("TOP DOC RECEIVED");
      }
      if(state.usingLocal) {
        updateDbStatus({...currentStatus, done: true, localError: null}, gameId);
      }
      else {
        newState.isOnline = true;
        updateDbStatus({...currentStatus, remoteError: null}, gameId);
      }
      break;
    }
    case 'retry': {
      updateDbStatus({...currentStatus, localError: null, remoteError: null}, gameId);
      newState.isOnline = true;
      newState.usingLocal = !state.usingLocal; //force provider swap so it re-fetches
      console.log(`Retrying with online=${newState.isOnline}`);
      break;
    }
    case 'setUserWants': {
      for(const db of action.wantedDBs) {
        state.dbStatuses.get(db); //ensure newly-wanted db is in list
      }
      for(const [db, status] of state.dbStatuses) {
        const doesWant: boolean = action.wantedDBs.has(db);
        let done: boolean = status.done;
        // set done to false if userWants actually changing
        if(doesWant !== status.userWants) {
          done = false;
          console.log(`Setting ${db} to not done since wanted status changing`);
        }
        let newStatus: DBStatus  = {...state.dbStatuses.get(db), userWants: doesWant, done: done};
        updateDbStatus(newStatus, db);
      }
      break;
    }
    case 'downloadDB': {
      let newStatus: DBStatus = {...state.dbStatuses.get(action.db), currentTransition: 'downloading'};
      updateDbStatus(newStatus, action.db);
      break;
    }
    case 'downloadSuccess': {
      // set status to done, remove from queue, set next DB in queue's status to downloading
      let newStatus: DBStatus = {...state.dbStatuses.get(action.db), currentTransition: null, done: true, localError: null, remoteError: null};
      updateDbStatus(newStatus, action.db);
      //if it was current game, switch to local
      if(!state.usingLocal && action.db === gameId) {
        console.log(`Download finished for ${action.db}, switching to local`)
        newState.usingLocal = true;
      }
      break;
    }
    case 'downloadFailure': {
      // error.name = forbidden for madeup db, unauthorized for bad login
      // set error for this DB. TODO: should this set a localError?
      let newStatus: DBStatus = {...state.dbStatuses.get(action.db), currentTransition: null, remoteError: action.error};
      updateDbStatus(newStatus, action.db);
      break;
    }
    case 'deleteDB': {
      let newStatus: DBStatus = {...state.dbStatuses.get(action.db), currentTransition: 'deleting'};
      updateDbStatus(newStatus, action.db);
      break;
    }
    case 'deletionSuccess': {
      let newStatus: DBStatus = {...state.dbStatuses.get(action.db), currentTransition: null, done: true, localError: null};
      updateDbStatus(newStatus, action.db);
      //if it was current game, switch to remote
      if(action.db === gameId) {
        newState.usingLocal = false;
      }
      break;
    }
    case 'deletionFailure': {
      // set error for this DB. 
      let newStatus: DBStatus = {...state.dbStatuses.get(action.db), currentTransition: null, localError: action.error};
      updateDbStatus(newStatus, action.db);
      break;
    }
    case 'loginSuccess': {
      let newStatus: DBStatus = state.dbStatuses.get(action.db);
      if(newStatus.remoteError?.name === 'unauthorized') {
        console.log(`Clearing unauthorized remote error for ${action.db} because of successful login`);
        updateDbStatus({...newStatus, remoteError: null}, action.db);
      }
      break;
    }
    case 'loginFailure': {
      let newStatus: DBStatus = state.dbStatuses.get(action.db);
      updateDbStatus({...newStatus, remoteError: action.error}, action.db);
      break;
    }
  }
  return newState;
}
  

//Gotta put this in a hook so that it runs at render and switches DBs as soon as route switch is known,
// since children's useDoc checks db list at render. Returning gameId here also lets us use it in dep lists
function useDBsForRouteMatch(routeMatch: match<{gameId: string}> | null): [string, MutableRefObject<{[key: string]: PouchDB.Database}>, myPouch.DeletionCallbackType] {
  let gameId = (routeMatch == null ? 'top' : routeMatch?.params?.gameId);
  const [dbsRef, deletionCallback] = myPouch.usePersistentDBRefs(gameId);
  return [gameId, dbsRef, deletionCallback];
}

export const GameProvider: React.FC<GameProviderProps> = ({children, credentialStore, wantedDbs, localEnabled}) => {
  const location = useLocation();
  const [initialized, setInitialized] = useState<boolean>(false);
  //const [loggingIn, setLoggingIn] = useState<boolean>(false);
  const [state, dispatch] = useReducer(Reducer, initialState, initializeState); //initializes state with wantedDbs
  const [currentCreds, setCurrentCreds] = useState<Credentials>(CompileConstants.DEFAULT_CREDENTIALS);
  const [showModal, setShowModal] = useState(false);
  const loginTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeMatch = useRouteMatch<{gameId: string}>(CompileConstants.GAME_MATCH); //note for hooks, this returns new object every render
  const [gameId, dbListRef, deletionCallback] = useDBsForRouteMatch(routeMatch);
  if(!dbListRef || !dbListRef.current) throw new Error("dbListRef is somehow null");

  function gameIdFromPath(path: string): string | null {
      const gameIdMatch = matchPath<{gameId: string}>(path, {path: CompileConstants.GAME_MATCH});
      return ( gameIdMatch == null ? null : gameIdMatch?.params?.gameId );
  }

  function initializeState(initState: State): State {
    initState.dbStatuses.set("top", {...initialDBStatus}); //put top in first for priority

    //if starting on some non-homepage, prioritize that one next
    const locationGameId: string | null = gameIdFromPath(location.pathname);
    if(locationGameId && !initState.dbStatuses.get(locationGameId)) {
      initState.dbStatuses.set(locationGameId, {...initialDBStatus});
    }

    wantedDbs.forEach((db) => {
      let newStatus: DBStatus = {...initialDBStatus, userWants: true, done: false};
      initState.dbStatuses.set(db, newStatus);
    });
    console.log(`Initialized GP state, wantedDbs=${[...wantedDbs]}, status keys=${Array.from(initState.dbStatuses.keys())}`);

    return initState;
  }

  function initNetworkPlugin() {
    // The Network plugin uses the Network Information API under the hood https://caniuse.com/netinfo
    // It's only supported on mobile browsers, on desktop it just says you're always online.
    const isAvailable = Capacitor.isPluginAvailable('Network');
    console.log(isAvailable ? ":) AVAILABLE!" : ":( NOT AVAILABLE");
    console.log("Current platform: " + Capacitor.getPlatform());
    Network.addListener('networkStatusChange', (status) => {
      console.log(`Network status changed: ${JSON.stringify(status)}`);
    });
  };

  function initialize() {
    //TODO: start connectivity check
    //initNetworkPlugin();
    
    //TODO: if !userWants for current db, start off online. Actually no, changeCurrentDB action does that
    setInitialized(true);
  }
  useEffect(()=> {
    initialize();
  }, []);

  useEffect(()=> {
        dispatch({actionType: "setUserWants", wantedDBs: wantedDbs} as Action);
  }, [wantedDbs]);

  //notice if a db is wanted but not downloading yet or needs to be deleted
  useEffect(()=> {
    function someDBIsDownloading(): boolean {
      for(const [db, status] of state.dbStatuses) {
        if(status.currentTransition === "downloading") {
          return true;
        }
      }
      return false;
    }
    function someDBWithoutErrorsWantsDownload(): boolean {
      for(const [db, status] of state.dbStatuses) {
        if(!hasErrorPreventingDownload(status)) {
          return true;
        }
      }
      return false;
    }
    function hasErrorPreventingDownload(status: DBStatus): boolean {
      //TODO: if it's a local not_found error, that's no biggie, but other local errors might be.
      return (status.remoteError !== null);
    }
    
    //returns whether download is actually attempted
    function downloadDB(db: string, dontDownloadIfError: boolean): boolean {
      const status: DBStatus = state.dbStatuses.get(db);
      if(hasErrorPreventingDownload(status)) {
        if(dontDownloadIfError) {
          console.log(`NOT downloading db ${db} due to existing error. Remote: ${status.remoteError}`);
          return false;
        }
        else {
          console.log(`Downloading db ${db} despite existing error. Remote: ${status.remoteError}`);
        }
      }
      dispatch({actionType: "downloadDB", db: db} as Action);

      myPouch.pullDB(db).then(() => {
        dispatch({actionType: "downloadSuccess", db: db} as Action);
      }).catch((err) => {
        dispatch({actionType: "downloadFailure", db: db, error: err} as Action);
      });
      return true;
    }

    function deleteDB(db: string) {
      if(state.dbStatuses.get(db).localError?.name === 'InvalidStateError') {
        console.error(`Not re-attempting deletion of ${db} due to existing InvalidStateError, probably from previous deletion attempt`);
        return;
      }
      dispatch({actionType: "deleteDB", db: db} as Action);
      deletionCallback(db).then(() => {
        dispatch({actionType: "deletionSuccess", db: db} as Action);
      }).catch((err) => {
        dispatch({actionType: "deletionFailure", db: db, error: err} as Action);
      });
    }

    let alreadyDownloading: boolean = someDBIsDownloading();
    const skipIfError: boolean = someDBWithoutErrorsWantsDownload();
    for(let [db, status] of state.dbStatuses) {
      //check for downloads. One db can download at once. Prioritize dbs without existing errors.
      if(status.userWants && status.currentTransition === null && !status.done) {
        if(alreadyDownloading) {
          console.log("Some db already downloading, not downloading "+db);
        }
        else {
          if(downloadDB(db, skipIfError)) {
            console.log("Noticed db download should start for db " + db);
            alreadyDownloading = true;
          }
        }
      }
      //check for deletions
      if(!status.userWants && status.currentTransition === null && !status.done) {
        deleteDB(db);
      }
    }
  }, [state.dbStatuses]);

  // Handle DB changing and logging in. Default auth cookie determined by my couchDB settings (I set 1 hour for convenience).
  // Start session as default user, who can read all DBs with same cookie. Higher-level users need manual login.
  // I give db basic non-session authorization which is used in initial calls, then login, and it switches to session auth.
  useEffect(()=> {
    //let creds = (credentials[gameId]) ?? CompileConstants.DEFAULT_CREDENTIALS;
    let creds = CompileConstants.DEFAULT_CREDENTIALS;
    if(gameId !== state.gameId) { //if changing db or initially loading to non-homepage
      dispatch({actionType: 'changeCurrentDB', db: gameId} as Action);
      //logIn(creds.username, creds.password);
    }
    if(!initialized) { //if initial load 
      logIn(creds.username, creds.password).then((response) => { 
        console.log("Initial login success");
      }).catch((err) => { 
        console.log("Initial login failure");
      });
    }
    return (() => {
      if(loginTimer.current) clearTimeout(loginTimer.current);
    });
  }, [gameId, state.gameId, dbListRef, initialized]); 

  useEffect(() => {
    console.log("Current creds: "+currentCreds.username);
  });
  function logIn(name: string, password: string): Promise<PouchDB.Authentication.LoginResponse> {
    const remoteDB: PouchDB.Database = dbListRef.current.remote ?? dbListRef.current.remoteTop;
    //setTimeout(() => {
    return remoteDB.logIn(name, password).then((response) => {
      console.log(`Successful login to ${gameId} as ${name}:${password}. Response: ${JSON.stringify(response)}`);
      if(name !== currentCreds.username) {
        setCurrentCreds({username:name, password: password} as Credentials);
      }

      dispatch({actionType: 'loginSuccess', db: gameId} as Action);

      if(loginTimer.current) clearTimeout(loginTimer.current);
      loginTimer.current = setTimeout(() => {
        console.log(`Login timer activated, logging in as ${name}/${password}`);
        logIn(name, password);
      }, CompileConstants.AUTH_TIMEOUT_SECONDS * 1000);
      //}, 5000);
      return response;
    }).catch((reason) => {
      //actually doesn't throw error if the DB doesn't exist at all
      //TODO: If failed with nonstandard user, retry with standard user?
      console.log(`Failed login to ${gameId} as ${name}:${password}. Response: ${JSON.stringify(reason)}`);
      dispatch({actionType: 'loginFailure', db: gameId} as Action);
      throw reason;
    })
    //}, 500);
  }

  function logInModalCallback(name: string, password: string): Promise<PouchDB.Authentication.LoginResponse> {
    return logIn(name, password).then((response) => {
      setShowModal(false);
      return response;
    });
  }

  //const logoutCallback = useCallback(() => {
  function logoutCallback() {
    console.log("Logging out, aka switching to default user");
    logIn(CompileConstants.DEFAULT_CREDENTIALS.username, CompileConstants.DEFAULT_CREDENTIALS.password);
  }
  //}, [currentCreds]); //nah, don't want closure capture

  if(routeMatch == null) {
    //console.log("GameProvider sez: no gameId, using top");
  }

  if(!initialized) {
    return (
      <span>Initializing GP...</span>
    );
  }
  else if(state.gameId !== gameId) {
    console.log("gameId changed before changeDB had chance to dispatch, not rendering");
    return (
      <span>Waiting for changeDB to finish...</span>
    );
  }
  else {
    return (
      <DispatchContext.Provider value={dispatch}>
        <GameContext.Provider value={state}>
          <LoginInfoContext.Provider value={{currentCreds: currentCreds, setShowModal: setShowModal, logout: logoutCallback}}>
            <LoginModal db={gameId} show={showModal} creds={credentialStore[gameId]} onDismiss={() => setShowModal(false)} logInModalCallback={logInModalCallback} />
            <Provider default={state.usingLocal ? 'local' : 'remote'} databases={dbListRef.current}>
              {children}
            </Provider> 
          </LoginInfoContext.Provider>
        </GameContext.Provider>
      </DispatchContext.Provider>
    );
  }
};

//If needed, can expand to pass memoized API object with multiple callbacks 
//see https://medium.com/trabe/passing-callbacks-down-with-react-hooks-4723c4652aff
export type LoginInfo = {
  currentCreds: Credentials,
  setShowModal: (showModal: boolean)=>void,
  logout: ()=>void,
}
const LoginInfoContext = React.createContext<LoginInfo | null>(null);
export function useLoginInfoContext(): LoginInfo {
  const contextValue = React.useContext(LoginInfoContext);
  if(contextValue === null) {
    throw new Error("useLoginModalContext must be used within GameProvider");
  }
  return contextValue;
}

const GameContext = React.createContext<State>(initialState);
export function useGameContext(): State {
  const contextValue = React.useContext(GameContext);
  if(contextValue === null) {
    throw new Error("useGameContext must be used within GameProvider");
  }
  return contextValue;
}

const DispatchContext = React.createContext<Dispatch<ReducerAction<typeof Reducer>>| null>(null);
export function useGameDispatch(): Dispatch<ReducerAction<typeof Reducer>> {
  const contextValue = React.useContext(DispatchContext); 
  if(contextValue === null) {
    throw new Error("useGameDispatch must be used within GameProvider");
  }
  return contextValue;
}

export const withGameContext = (
  mapState: (state: State, ...properinos: any[]) => any,
  //mapDispatchers: any = React.useContext(TestDispatchContext) // could use this, have components take dispatch as prop. Or just use hook
) => ((WrapperComponent: React.FC<any>) => {
  function EnhancedComponent(props: any){
    const state: State = useGameContext();
    const { ...statePointers } = mapState(state, props);
    //const { ...dispatchPointers } = mapDispatchers(targetContext);
    const memoFunc:()=>JSX.Element = () => (<WrapperComponent {...props} {...statePointers}  />);
    useEffect(() => {
      //return () => {console.log("GameContext WRAPPER unmounted")}; //wrappers unmount before wrapped component
    }, []);
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
