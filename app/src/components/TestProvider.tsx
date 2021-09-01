import React, { useContext, useMemo, useRef, useReducer, useEffect, Dispatch, ReducerAction, useState } from 'react';
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

type ValueOf<T> = T[keyof T];

export type Action = 
  | { actionType: 'addCredentials', db: db, creds: Credentials }
  | { actionType: 'updateCredentials', db: db, creds: Credentials }
  | { actionType: 'changePreferences', preferences: Preferences }

// Reducers are preferably pure so all DB stuff done in useEffect, which watches state
// objects are by-reference, so don't store reference anywhere, do state.credentials[game].username every time
function LocalReducer(state: LocalData, action: Action): LocalData {
  //let newState: LocalData = cloneData(state); //causes everything to update
  //let newState: LocalData = state; //no state change done/dispatched until localprovider re-renders
  let newState: LocalData = {...state}; //THE SECRET: reference to state itself changes, but its members have same references
  console.log("Action: " + JSON.stringify(action));
  switch(action.actionType) {
    case 'addCredentials':
    case 'updateCredentials': {
      //TODO: check validity? And website version should not store credentials.
      newState.credentials[action.db] = action.creds;
      break; //TODO: probably need to clone creds like I'm doing in LocalProvider
    }
    case 'changePreferences': {
      newState.preferences = action.preferences;
      break;
    }
  }
  return newState;
}

export const TestContext = React.createContext<LocalData | null>(null);
const TestDispatchContext = React.createContext<Dispatch<ReducerAction<typeof LocalReducer>>| null>(null);

export const TestProvider: React.FC = ({children}) => {
  const [state, dispatch] = useReducer(LocalReducer, initialState);

  useEffect(() => {
    console.log("TestProvider state changed!");
  }, [state]); 

    return (
      <TestContext.Provider value={state}>
        <TestDispatchContext.Provider value={dispatch}>
          {children}
        </TestDispatchContext.Provider>
      </TestContext.Provider>
    )
}

//since this uses a ref, doesn't trigger renders; events do that
export function useLocalData(): LocalData {
  const contextValue = React.useContext(TestContext); 
  if(contextValue === null) {
    throw new Error("useLocalData must be used within TestProvider");
  }
  return contextValue;
}
export function useTestDispatch(): Dispatch<ReducerAction<typeof LocalReducer>> {
  const contextValue = React.useContext(TestDispatchContext); 
  if(contextValue === null) {
    throw new Error("useTestDispatch must be used within TestProvider");
  }
  return contextValue;
}

// (map) => (wc) => (props) => jsx
export const withContext = (
  //context: any = React.useContext(TestContext),
  //context: any,
  mapState: any,
  //mapDispatchers: any = React.useContext(TestDispatchContext) TODO: enable this, write components to take dispatch as prop
) => ((WrapperComponent: any) => {
  function EnhancedComponent(props: any) {
    const targetContext = useContext(TestContext);
    const { ...statePointers } = mapState(targetContext);
    //const { ...dispatchPointers } = mapDispatchers(targetContext);
    //WrapperComponent.displayName = "Shit";
    return useMemo(
      () => (
        <WrapperComponent {...props} {...statePointers}  />
      ),
      [
        ...Object.values(statePointers),
        ...Object.values(props),
      ]
    );
  }
  function getDisplayName(babbyComponent: any) {
    return babbyComponent.displayName || babbyComponent.name || 'Component';
  }
  EnhancedComponent.displayName = `withContext(${getDisplayName(WrapperComponent)})`;
  return EnhancedComponent;
});
