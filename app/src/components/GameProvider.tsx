import React, { useState, useEffect } from 'react';
import { useParams, useRouteMatch } from 'react-router';
import { Provider } from 'use-pouchdb'
import * as myPouch from '../services/pouch';
import CompileConstants from '../services/CompileConstants';
import { DBListDoc } from '../types/characterTypes';
//This component will become the container for a game with corresponding db,
//within which chars/docs will be displayed. Has <Provider> with overriding db

type GameProviderProps  = {
  children: React.ReactNode
}

//TODO: This is basically a state machine inside the reducer's existing one, for non-instant transitions that wait on network.
//Necessary, or can I do all this with actions?
type DBTransitionState = "downloading" | "checkingUpdates" | "deleting" | "error" | null;
type DBStatus = {
  currentTransition: boolean,
  userWants: boolean, //loaded in upon init. Indication of whether user WANTS this db, not an indication of if it's finished.
  checkedForUpdates: boolean,
  complete: boolean,
  error: string,
}
type State = {
  gameId: string,
  dbs: Record<string, DBStatus>, //also includes top
  usingLocal: boolean,
  isOnline: boolean,
}
export type Action = 
  | { actionType: 'changeCurrentDB', db: string } //when db selected from menu
  | { actionType: 'fetchFailed', db: string }
//do download and update need to be separate? How smart is pouch's sync?
  | { actionType: 'downloadDB', db: string } //when download is chosen. Confirm user's cool with db size before this.
  //| { actionType: 'abortDownload', db: string } //cancel download, delete whatever was downloaded?
  | { actionType: 'updateDB', db: string } //updating means old version can be viewed
  //| { actionType: 'abortUpdate', db: string } //cancel update. Revert docs that were changed???
  | { actionType: 'deleteDB', db: string } //when delete is chosen. If DL in progress, abort.
  // abort delete? Seems hard to abort.
  

  //------OLD AND BUSTED----------------
type GameProviderData = {
  gameId: string | null,
  swapLocalRemote: (error: string)=> void,
  //topShouldUseLocal: bla?
  //async functions
  downloadDB: (db: string) => void, 
  deleteDB: (db: string) => void, 
  //refreshDB: (db: string) => void, 
}
//TODO: should this just be a reducer at this point? DB shit seems very impure, how to use watch expressions?

const initialState: GameProviderData = {gameId: null, swapLocalRemote: () => {}, downloadDB: () => {}, deleteDB: () => {}};
const GameContext = React.createContext<GameProviderData>(initialState);
export function useGameId(): string | null {
  const contextValue = React.useContext(GameContext);
  if(contextValue === null) {
    throw new Error("useGameId must be used within GameProvider");
  }
  return contextValue.gameId;
}

function useLocalOrRemote() {

}

const GameProvider: React.FC<GameProviderProps> = ({children}) => {
  const match = useRouteMatch<{gameId: string}>("/game/:gameId");
  let data: GameProviderData = initialState;
  data.gameId = (match == null ? null : match?.params?.gameId);
  type LocalRemote = "local" | "remote";
  const [defaultDB, setDefault] = useState<LocalRemote>(CompileConstants.PREFER_LOCAL ? "local" : "remote");
  //TODO: login with default *if* no current session with other user
  const topDBs = {
    localTop : myPouch.getDB("local-top"),
    remoteTop : myPouch.getDB(myPouch.remote + "top")
  }
  //if no gameId cuz not on game page, gameDBs will be false and spread operator won't include it in databases
  const gameDBs = data.gameId === null ? false : { 
    local : myPouch.getDB("local-" + data.gameId),
    remote : myPouch.getDB(myPouch.remote + data.gameId)
  }

  //TODO: take error as param, they just tried connecting, don't waste time doing it again
  data.swapLocalRemote = (error: string) => {
    // if currently remote, switch default to local
    // set timer to re-query network connection. But wait until next re-render to switch default. Cleanup timer in useEffect
  }

  if(match == null) {
    console.log("GameProvider sez: null gameId");
  }

  return (
    <GameContext.Provider value={data}>
      <Provider default={defaultDB} databases={{...topDBs, ...gameDBs}}>
        {children}
      </Provider> 
    </GameContext.Provider>
  );
};

export default GameProvider;
