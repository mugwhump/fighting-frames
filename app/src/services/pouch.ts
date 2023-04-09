import PouchDB from 'pouchdb'; //TODO: use a smaller package (check Custom Builds section on pouch website)
import PouchAuth from 'pouchdb-authentication';
import superlogin from 'superlogin-client';
import { usePouch } from 'use-pouchdb';
import { useEffect, useState, useRef, MutableRefObject, useCallback } from 'react';
import { useGameDispatch, Action as GameAction } from '../components/GameProvider';
import type { LoginInfo } from '../components/LoginProvider'; //=}
import type { ApiResponse, HttpMethod } from '../types/utilTypes'; //=}
import * as security from './security';
import CompileConstants from '../constants/CompileConstants';

// also currently have admin:password
export const remoteWithBasicCreds: string = `http://${CompileConstants.DEFAULT_CREDENTIALS.username}:${CompileConstants.DEFAULT_CREDENTIALS.password}@localhost:5984/`;
export const remoteWithTestAdminCreds: string = 'http://admin:password@localhost:5984/';
//TODO: turn all of these into environment variables, they need to change in production.
export const remote: string = 'http://localhost:5984/';
export const apiUrl: string = 'http://localhost:3000/api';
PouchDB.plugin(PouchAuth);

superlogin.configure({
  serverUrl: 'http://localhost:3000',
  baseUrl: '/auth',
  endpoints: ['localhost:3000'], //http interceptor adds bearer auth headers to any requests to these hosts. (Only couchAuth uses bearer auth)
  noDefaultEndpoint: true, //don't add url bar to list
});
export {superlogin};

type OptionType = PouchDB.Configuration.LocalDatabaseConfiguration | PouchDB.Configuration.RemoteDatabaseConfiguration;
export function getDB(name: string, options: OptionType = {}): PouchDB.Database {
  let db: PouchDB.Database;
  // if local DB by this name doesn't exist, makes one. Do not want this behavior for remotes.
  if(nameIsRemote(name)) (options as PouchDB.Configuration.RemoteDatabaseConfiguration).skip_setup = true;
  db = new PouchDB(name, options); 
  console.log("---------CALLED getDB for " + name + "-----------");
  return db;
}

//check if name is that of a remote db by seeing if it starts with "http"
export function nameIsRemote(name: string): boolean {
  return name.indexOf("http") === 0;
}

//returns a promise response that must be resolved to another promise via response.json(), response.text(), response.blob() etc
export function makeRequest(url: string, username: string, password: string, method: "GET" | "PUT" | "POST", body?: Object) {
  const str = username + ':' + password;
  const token = btoa(unescape(encodeURIComponent(str)));
  const response = fetch(url, {
    method: method,
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + token
    },
    body: JSON.stringify(body),
  });
  return response;
}

// Makes API call, sending superlogin session creds if logged in.
// Most endpoints require a superlogin user, but some are useable as public, depending on db configuration,
// in which case no Authorization header is sent.
// Api calls that return text instead of json will be converted to an ApiResponse object.
export function makeApiCall(url: string, method: HttpMethod, body?: Object): Promise<ApiResponse> {
  let authHeader = {};
  let session = superlogin.getSession();
  if(session) {
    authHeader = {'Authorization': 'Bearer ' + session.token+':'+session.password};
    //authHeader = {'Authorization': 'Bearer _admin:madeUpPassword'}; //SL middleware rejects fake creds
    //authHeader = {'Authorization': 'Bearer public:passward'}; //SL middleware rejects non-SL users
  }
  if(url.indexOf("http") !== -1) throw new Error("Only include the part of the address after website.com/api");
  if(url.indexOf("/") !== 0) throw new Error("Address must start with a slash (/). Given url: "+url);

  const response = fetch(apiUrl + url, {
    method: method,
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      //TODO: if posting with no body, make length 0 or some routers might get confused
    },
    body: JSON.stringify(body),
  });
  //return response. Full response can't be accessed by caller. Can go makeApiCall.then((data) => {bla}).catch((err) => {err.message})
  //Returned errors and fetch's network errors (TypeErrors) are caught the same, both have message.
  return response.then((res) => {
    let json: Object | undefined;
    return res.text().then((textData) => {
      try { //parsing text always works, so use that as a baseline
        json = JSON.parse(textData);
      }
      catch(jsonParseFailed) { 
        json = {message: textData, status: res.status};
        if(textData === "Unauthorized" && res.status === 401) { //if couchAuth can't validate user is who they say they are, returns "Unauthorized" text.
          json = {message: "Unauthorized. Please log in again.", status: res.status};
        }
      }
      if(json && res.ok) {
        return Promise.resolve(json as ApiResponse);
      }
      return Promise.reject(json || {message: 'Error parsing response from call to '+url, status: res.status});
    }).catch((err) => {
      return Promise.reject({message: err.message || err, status: res.status});
    })
  });
}

export function syncDB(db: PouchDB.Database, live: boolean) {
  let options = {
    live: live, // This option makes it continuously push/pull changes
    retry: true,
    continuous: true
  };

  // sync is just short hand for db.replicate.to(otherDb) and db.replicate.from(otherDb)
  db.sync(remote + db.name, options);
  return db;
}

//validation functions run at replication, so local design docs could reject a pull or have VDU function change mid-pull. 
//Thus, do not replicate the doc with VDU function
export async function pullDB(db: string) {
  if(db.indexOf("local-") !== -1) throw new Error("Provide only db id with no local- prefix");
  const database: PouchDB.Database = getDB("local-"+db);
  console.log("Initiating download for "+db);
  return database.replicate.from(remoteWithBasicCreds + db, {selector: {"$not": {"_id": "_design/validate"}}}); //use selector blacklist
}
export async function deleteDBWhichOutdatesDBReferences(db: string) {
  if(db.indexOf("local-") !== -1) throw new Error("Provide only db id with no local- prefix");
  const database: PouchDB.Database = getDB("local-"+db);
  console.log("Initiating deletion for "+db);
  return database.destroy();
}

export function pushDB(db: PouchDB.Database) {
  db.replicate.to(remote + db.name);
  return db;
}

export function printSession(database: PouchDB.Database) {
  database.getSession().then((response) => {
    console.log(`Current session for db ${database.name}: ${JSON.stringify(response)}`);
  }).catch((reason) => {
    console.log(`Failed getting current session: ${JSON.stringify(reason)}`);
  });
}

// This hook returns a set of pouchDB references for the given gameID.
// If gameId="top", it includes localTop, remoteTop, and localPersonal (where personal notes and edits are stored).
// If otherwise, it's a DIFFERENT REF that also includes local and remote, the actual databases for the given game.
export type DeletionCallbackType = (db: string)=>Promise<void>;
export function usePersistentDBRefs(gameId: string): [MutableRefObject<{[key: string]: PouchDB.Database}>, DeletionCallbackType] {
  const [initialUsedDBs] = useState<Record<string, PouchDB.Database>>(() => {
    return {
    "local-top": getDB("local-top"),
    "local-personal": getDB("local-personal"),
    "remote-top": getDB(remoteWithBasicCreds + "top"), //remote indexes will just be "remote-gameId"
    }
  }); 
  //Only using state above because for some reason useRef isn't allowed to have an initialization function that only runs once
  const usedDBs = useRef<Record<string, PouchDB.Database>>(initialUsedDBs); 

  const dbTop = useRef<{[key: string]: PouchDB.Database}>({
    localTop: usedDBs.current["local-top"],
    localPersonal: usedDBs.current["local-personal"],
    remoteTop: usedDBs.current["remote-top"],
  });
  //need local and remote keys to be there, but if it's initial load their actual DBs will be created below
  const dbAll = useRef<{[key: string]: PouchDB.Database}>({
    ...dbTop.current,
    local: usedDBs.current["local-top"],
    remote: usedDBs.current["remote-top"],
  });

  const deletionCallback = useCallback<DeletionCallbackType>((db) => {
    //TODO: apparently need to wait until deletion's finished before reassigning reference. Is this a problem if something attempts access mid-deletion?
    if(db.indexOf("local-") !== -1) throw new Error("Provide only db id with no local- prefix");
    const database: PouchDB.Database = usedDBs.current["local-"+db] || getDB("local-" + db); //if deleting from home menu ref might not exist yet
    console.log("DELETO "+db);
    const promise = database.destroy().then(()=> {
      usedDBs.current["local-"+db] = getDB("local-" + db);
      if(db === "top") {
        console.log("NEW TOPPO MAKEO");
        dbTop.current.localTop = usedDBs.current["local-top"];
      }
    });
    return promise;
  }, [usedDBs]);

  if(gameId !== "top") {
    const localKey = "local-"+gameId;
    const remoteKey = "remote-"+gameId;
    const curr: Record<string, PouchDB.Database> = usedDBs.current;
    //if DBs haven't been used before, create them
    if(!curr[localKey]) curr[localKey] = getDB("local-" + gameId); 
    if(!curr[remoteKey]) curr[remoteKey] = getDB(remoteWithBasicCreds + gameId); 

    dbAll.current.local = usedDBs.current[localKey];
    dbAll.current.remote = usedDBs.current[remoteKey];
    return [dbAll, deletionCallback];
  }
  else {
    return [dbTop, deletionCallback];
  }
}

//Hook to only dispatch fetchFailure events if the current usingLocal matches what hook remembers when loading started
//When there's no default db (aka on main menu using top db), pass the pouch object.
//TODO: remove doc from this and from GP actions?
export function useDocumentLocalRemoteSwitching(state: string, error: PouchDB.Core.Error | null | Error, componentName: string = '', db?: PouchDB.Database, doc?: PouchDB.Core.Document<any>): void { 
  const gameDispatch = useGameDispatch();
  const [failureAlreadyDispatched, setFailureAlreadyDispatched] = useState<boolean>(false);
  let currentPouch = usePouch(db ? 'remoteTop' : '_default');
  if(db) currentPouch = db;

  useEffect(() => { 
    const usingLocal = !nameIsRemote(currentPouch.name);
    //if(componentName === 'Game') 
    //console.log(`${componentName} debug: state=${state}, usingLocal=${usingLocal}, error=${error?.message} failureAlreadyDispatched=${failureAlreadyDispatched} pouch=${currentPouch.name} `); //`

    if(state === 'loading') {
       setFailureAlreadyDispatched(false);
    }

    //const loading: boolean = state === 'loading';
    //if(loading && fetchedWithLocal === null) { //useDoc is initiating a fetch, store whether it's local or remote
      ////console.log(`${componentName} setting fetchedWithLocal, state=${state}, usingLocal=${usingLocal}`);
      //setFetchedWithLocal(usingLocal); //won't apply until re-render, below lines execute with old value
    //} 
    //NOTE: state does appear to go error or done between re-fetches if the database is changed
    //STATE IS SET TO LOADING EVERY TIME GAMEPROVIDER RERENDERS
    //If subscription fetches new doc it sets loading but doc isn't null, if provider changed doc will also be null. (Not that doc is used in this hook)
    //if(fetchedWithLocal !== null) { //for one render state will still be error while usingLocal is switched and fetchedWithLocal is null
      if (state === 'error' && !failureAlreadyDispatched) {
        console.log(`Error loading ${componentName} ` + (usingLocal ? "locally: " : "remotely: ") + error?.message);
        gameDispatch({actionType: 'fetchFailure', error: error, usedLocal: usingLocal, dispatcher: componentName} as GameAction);
        setFailureAlreadyDispatched(true);
        //setFetchedWithLocal(null);
      }
      if (state === 'done') {
        gameDispatch({actionType: 'fetchSuccess', usedLocal: usingLocal, doc} as GameAction); //must only dispatch once unless provider changes...
        //console.log(`${componentName} WOULD BE DISPATCHING HERE HAHAHA`);
        //setFetchedWithLocal(null);
      }
    //}
  }, [state, error, currentPouch]);
}

/*
//Hook to only dispatch fetchFailure events if the current usingLocal matches what hook remembers when loading started
//TODO: remove doc from this and from GP actions?
export function useDocumentLocalRemoteSwitching(state: string, error: PouchDB.Core.Error | null | Error, usingLocal: boolean, componentName: string = '', doc?: PouchDB.Core.Document<any>): void { const gameDispatch = useGameDispatch();
  const [fetchedWithLocal, setFetchedWithLocal] = useState<boolean | null>(null);
  const currentPouch = usePouch();

  useEffect(() => { 
    if(componentName === 'Game') 
    console.log(`Game debug: pouch=${currentPouch.name} state=${state}, usingLocal=${usingLocal}, fetchedWithLocal=${fetchedWithLocal}, error=${error?.message}`); //`

    const loading: boolean = state === 'loading';
    if(loading && fetchedWithLocal === null) { //useDoc is initiating a fetch, store whether it's local or remote
      //console.log(`${componentName} setting fetchedWithLocal, state=${state}, usingLocal=${usingLocal}`);
      setFetchedWithLocal(usingLocal); //won't apply until re-render, below lines execute with old value
    } 
    //NOTE: state does appear to go error or done between re-fetches if the database is changed
    //STATE IS SET TO LOADING EVERY TIME GAMEPROVIDER RERENDERS
    if(fetchedWithLocal !== null) { //for one render state will still be error while usingLocal is switched and fetchedWithLocal is null
      if (state === 'error') {
        console.log(`Error loading ${componentName} ` + (usingLocal ? "locally: " : "remotely: ") + error?.message);
        gameDispatch({actionType: 'fetchFailure', error: error, usedLocal: fetchedWithLocal, dispatcher: componentName} as GameAction);
        setFetchedWithLocal(null);
      }
      if (state === 'done') {
        gameDispatch({actionType: 'fetchSuccess', usedLocal: fetchedWithLocal, doc} as GameAction); //must only dispatch once unless provider changes...
        //console.log(`${componentName} WOULD BE DISPATCHING HERE HAHAHA`);
        setFetchedWithLocal(null);
      }
  }
  }, [usingLocal, state, error, fetchedWithLocal, currentPouch]);
}
*/
