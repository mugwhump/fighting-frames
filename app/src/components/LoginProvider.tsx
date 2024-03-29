import React, { useRef, Ref, Reducer, useReducer, ReducerAction, Dispatch, useState, useEffect, useMemo, MutableRefObject, useCallback } from 'react';
import { createContainer } from 'react-tracked';
import * as myPouch from '../services/pouch';
import { useDoc, usePouch } from 'use-pouchdb';
import CompileConstants from '../constants/CompileConstants';
import { useGameContext, useGameDispatch, Action as GameAction } from './GameProvider';
import { Credentials } from '../types/utilTypes';
import { SecObj } from '../services/security';
import LoginModal from './LoginModal';


type LoginProviderProps  = {
  children: React.ReactNode,
  //TODO: pass these for now (causing re-renders) until these providers are switched to tracked selectors
  gameId: string,
  storedCredentials: Credentials | null,
}


//TODO: switch to a reducer if consuming components' interactions go beyond logging in/out
export const InnerLoginProvider: React.FC<LoginProviderProps> = ({children, gameId, storedCredentials}) => {
  const gameDispatch = useGameDispatch();
  const [initialized, setInitialized] = useState<boolean>(false);
  const [showModal, setShowModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [secObj, setSecObj] = useState<SecObj | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const loginInfo = useMemo<LoginInfo>(() => {
    return {currentUser: currentUser, secObj: secObj, roles: roles, setShowModal: setShowModal, logout: logout}
  }, [currentUser, secObj, roles, setShowModal, logout]); //TODO: logout fn isn't actually callback, changes every render, memoization is useless.
  const loginTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const database: PouchDB.Database = usePouch(gameId === "top" ? "remoteTop" : "remote");
  const gameIdRef = useRef<string | null>(null);
  gameIdRef.current = gameId; //used by closure that fetches secObj

  useEffect(() => {
    console.log("LoginPROVIDER rendered");
  }, )

  useEffect(()=> {
    setInitialized(true);
    return (() => {
      if(loginTimer.current) clearTimeout(loginTimer.current);
      console.warn("LoginProvider unmounting, make sure this is deliberate. Clearing login timer");
    });
  }, []);


  useEffect(()=> {
    async function fetchCurrentSecObj (startingGameId : string): Promise<void> {
      try {
        setSecObj(null);
        console.log(`fetching SecObj for db ${startingGameId}`);
        let res = await database.get<SecObj>('_security');
        // if rapidly switching between dbs and one occurs before the other, set to null if they arrive out-of-order
        if(startingGameId === gameIdRef.current) {
          console.log("Setting secObj for "+startingGameId+" to " + JSON.stringify(res));
          setSecObj(res);
        }
        else {
          console.warn(`Received SecObj for db ${startingGameId} but current db is ${gameIdRef.current}`); 
          setSecObj(null);
        }
      }
      catch (err) {
        console.error(`Error getting secObj for db ${startingGameId }, setting to null ${err}`);
        setSecObj(null);
      }
    }

    fetchCurrentSecObj(gameId);
  }, [gameId, database, setSecObj]); 

  useEffect(()=> {
    if(!initialized && storedCredentials !== null) { //if initial load 
      logIn(storedCredentials.username, storedCredentials.password).then((response) => { 
        console.log("Initial login success as " + storedCredentials.username);
      }).catch((err) => { 
        console.log("Initial login failure as " + storedCredentials.username);
      });
    }
  }, [initialized, logIn, storedCredentials]); 

  // OUTDATED, no more public
  // Handle logging in. Default auth cookie determined by my couchDB settings (I set 1 hour for convenience).
  // Start session as default user, who can read all DBs with same cookie. Stored creds start as default creds.
  // I give db basic non-session authorization which is used in initial calls, then login, and it switches to session auth.
  // Mostly use pouchdb-authentication to log in with public user for reading. Other accounts are superlogin accounts.
  // Superlogin/couch-auth accounts use pouchdb-authentication to get cookie authentication.
  // Manually manage refreshing login via setTimeout.
  // Setting require_valid_user in couch (it's not set) means every request, including to _session, needs auth. So if default creds are wrong,
  // all requests are sending wrong basic auth headers, and you can't login with right creds. So no point in extensive error handling.


  // Always returns couchdb's login response, not superlogin's
  // TODO: test closure capture on setTimeout
  async function logIn(name: string, password: string): Promise<PouchDB.Authentication.LoginResponse> {
    type sessionType = {token: string, password: string, roles: string[]};

    // Called after logging into couch as default or SL as other user. Sets timer to login again.
    function onSuccess(responseOrSession: PouchDB.Authentication.LoginResponse | sessionType) { 
      console.log(`Successful login to ${gameId} as ${name}:${password}. Response: ${JSON.stringify(responseOrSession)}`); //`
      if(name !== currentUser) {
        setCurrentUser(name);
      }
      setRoles(responseOrSession.roles || []);
      gameDispatch({actionType: 'loginSuccess', db: gameId} as GameAction);
      //set timer to refresh login
      if(loginTimer.current) clearTimeout(loginTimer.current);
      loginTimer.current = setTimeout(() => {
        console.log(`Login timer activated, logging in as ${name}/${password}`);
        logIn(name, password);
      }, CompileConstants.AUTH_TIMEOUT_SECONDS * 1000);
    }
    function onFailure(error: any) {
      //actually doesn't throw error if the DB doesn't exist at all
      console.log(`Failed login to ${gameId} as ${name}:${password}. Response: ${JSON.stringify(error)}`);
      // SL returns {error: 'Unauthorized', message: 'Invalid username or password'}
      // couch returns {error: 'unauthorized', reason: 'Name or password is incorrect.', status: 401, name: 'unauthorized', message: 'Name or password is incorrect.'}
      gameDispatch({actionType: 'loginFailure', db: gameId, error: error} as GameAction);
    }
    // After starting a superlogin/couch-auth session, use those credentials for a couchdb session with cookie auth
    function superloginCouchSession(session: sessionType) {
      return database.logIn(session.token, session.password).then((response) => {
        console.log("Cookie login for SL session, token "+session.token);
        return response;
      }).catch((loginError) => {
        console.error("Cookie login error for SL session! Switching to default creds. " + JSON.stringify(loginError));
        logout();
        throw loginError;
      });
    }

    // Default user does not use superlogin. NO MORE DEFAULT USER
    //if(name === CompileConstants.DEFAULT_CREDENTIALS.username) {
      //return database.logIn(name, password).then((response) => {
        //onSuccess(response);
        //return response;
      //}).catch((loginError) => {
        //onFailure(loginError);
        //throw loginError;
      //});
    //}
    //else {

      //Check for existing locally-stored SL session. Don't worry, not async.
      myPouch.superlogin.checkExpired(); //deletes sess if expired
      let session = myPouch.superlogin.getSession();
      if(session && name === session.user_id) {
        const expiresInSeconds = (session.expires - Date.now()) / 1000.0;
        console.log("Found existing SL session, expires in " + expiresInSeconds + " seconds. Refreshing.");
        myPouch.superlogin.refresh(); //make sure it matches our timer
      }
      else { //SYNCHRONOUSLY make new SL session
        console.log("Creating new SL session");
        try {
          session = await myPouch.superlogin.login({username: name, password: password});
        } catch (loginError) {
          onFailure(loginError);
          throw loginError;
        }
      }
      onSuccess(session);
      return superloginCouchSession(session);
    //}
  }

  function logInModalCallback(name: string, password: string): Promise<PouchDB.Authentication.LoginResponse> {
    return logIn(name, password).then((response) => {
      setShowModal(false);
      return response;
    });
  }

  //TODO: this is passed, so really should memoize it, and logIn() on which it depends.
  //const logoutCallback: () => void = useCallback(() => {
  function logout() {
    console.log("Logging out of SL account then loggin in as default");
    myPouch.superlogin.logoutAll(`Logging out ${currentUser}, switching to public`).then((logoutResponse) => {
      console.log(`SL logoutResponse = ${JSON.stringify(logoutResponse)}`);
    }).catch((logoutError) => {
      console.log("Error logging out of SL account: " + JSON.stringify(logoutError));
    }).finally(() => {
        if(loginTimer.current) clearTimeout(loginTimer.current);
        setCurrentUser(null);
        setRoles([]);

      //logIn(CompileConstants.DEFAULT_CREDENTIALS.username, CompileConstants.DEFAULT_CREDENTIALS.password).catch((loginError) => {
        //console.error("Error logging in as default after logging out of SL account, setting current creds to default so user can login again");
        //if(loginTimer.current) clearTimeout(loginTimer.current);
        ////setLoginInfoUsingFunction((prevInfo)=>{return {...prevInfo, currentCreds: CompileConstants.DEFAULT_CREDENTIALS}});
        //setCurrentUser(CompileConstants.DEFAULT_CREDENTIALS.username);
        //setRoles(CompileConstants.DEFAULT_USER_ROLES);
      //});
    });
  }
  //}, [loginInfo]); //prob should be modal honestly


  if(!initialized) {
    return (
      <span>Initializing GP...</span>
    );
  }
  else {
    //LoginModal (but not {children}) will re-render whenever this updates
    return (
      <LoginInfoContext.Provider value={loginInfo}>
        <LoginModal show={showModal} storedCredentials={storedCredentials} onDismiss={() => setShowModal(false)} logInModalCallback={logInModalCallback} />
        {children}
      </LoginInfoContext.Provider>
    );
  }
}

export const LoginProvider = React.memo(InnerLoginProvider); //makes LoginProvider render 4 instead of 7 times

//If needed, can expand to pass memoized API object with multiple callbacks 
//see https://medium.com/trabe/passing-callbacks-down-with-react-hooks-4723c4652aff
export type LoginInfo = {
  currentUser: string | null, 
  secObj: SecObj | null,
  roles: string[],
  setShowModal: (showModal: boolean)=>void,
  logout: ()=>void,
}

const LoginInfoContext = React.createContext<LoginInfo | null>(null);
export function useLoginInfoContext(): LoginInfo {
  const contextValue = React.useContext(LoginInfoContext);
  if(contextValue === null) {
    throw new Error("useLoginModalContext must be initialized and used within GameProvider");
  }
  return contextValue;
}

export default LoginProvider;
