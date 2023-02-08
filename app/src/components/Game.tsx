import { IonContent, IonButton, IonMenu, IonRouterOutlet, IonSplitPane } from '@ionic/react';
import React, { useEffect, useState, useMemo } from 'react';
import { Route } from 'react-router-dom';
//import PouchDB from 'pouchdb';
import { useDocumentLocalRemoteSwitching } from '../services/pouch';
import { useDoc } from 'use-pouchdb';
import * as myPouch from '../services/pouch';
import { Character } from '../components/Character';
import CharacterSegments  from '../components/CharacterSegments';
import { CharacterDocAccess } from '../components/CharacterDocAccess';
import { CharacterContextProvider, MiddlewareContext, MiddlewareSetterContext, Middleware } from '../services/CharacterReducer';
import { useGameContext, useGameDispatch, Action as GameAction } from './GameProvider';
import { calculateHideBreakpoints } from '../services/renderUtil';
import * as util from '../services/util';
import { insertDefsSortGroupsCompileRegexes   } from '../services/columnUtil';
import HeaderPage from '../components/HeaderPage';
import DefEditor from '../components/DefEditor';
import * as T from '../types/characterTypes';
import { cloneDeep } from 'lodash';
import CompileConstants from '../constants/CompileConstants';
import NeedPermissions from './NeedPermissions';

type GameProps = {
}

const Game: React.FC<GameProps> = () => {
  const gameContext = useGameContext();
  const gameId: string = gameContext.gameId; //TODO: Wrapper component. Note this will update after the provider switches DBs.
  const gameDispatch = useGameDispatch();
  const [middleware, setMiddleware] = useState<Middleware>({});
  const { doc, loading, state, error } = useDoc<T.DesignDoc>("_design/columns"); 
  useDocumentLocalRemoteSwitching(state, error, 'Game');
  const displayName: string | undefined = doc?.displayName;


  //Insert meta definitions, required definitions if they're missing, and reorder defs if required ones are inserted
  //function modifyDefs(defs: Readonly<T.ColumnDefs>, isUniversalProps: boolean): T.ColumnDefs {
    //const path = isUniversalProps ? "universalPropDefs" : "columnDefs";
    //let reorderRequired = false;
    //let newDefs = cloneDeep<T.ColumnDefs>(defs);
    ////meta at front
    //newDefs = {...specialDefs.meta[path], ...newDefs}; 
    ////insert required defs if missing, but don't overwrite
    //for(const [key, def] of util.keyVals(specialDefs.required[path])) {
      //if(!def) continue;
      //if(!newDefs[key]) {
        //newDefs[key] = def;
        //reorderRequired = true;
      //}
    //}

    //let result: T.ColumnDefs = newDefs;
    //if(reorderRequired) {
      //result = {};
      //const order: Readonly<string[]> = util.keys(newDefs);

      //// Loop over groups to ensure they're all present and newDefs are properly ordered
      //let nextItemIndex = 0;
      //for(let group of T.groupListAll) {
        //for(let key of order) {
          //const def: T.ColumnDef | undefined = newDefs[key];
          //if(!def) throw new Error("Cannot find definition for "+key);
          //if(def.group === group) {
            //if(order[nextItemIndex] !== key) {
              //console.log(`definition ${key} in group ${group} is out of order`);
              ////everything between the misplaced item and where it's moved to will be considered misplaced
            //}
            //result[key] = def;
            //nextItemIndex++;
          //}
        //}
      //}
    //}

    //return result;
  //}


  const modifiedUniversalPropDefs = useMemo(() => {
    return insertDefsSortGroupsCompileRegexes  (doc?.universalPropDefs ?? {}, true, true, true);
  }, [doc?.universalPropDefs]);

  const modifiedColumnDefs = useMemo(() => {
    let newDefs = insertDefsSortGroupsCompileRegexes  (doc?.columnDefs ?? {}, false, true, true);
    calculateHideBreakpoints(newDefs);
    return newDefs;
  }, [doc?.columnDefs]);

  useEffect(() => {
    gameDispatch({actionType: 'setGameDisplayName', gameId: gameId, displayName: displayName} as GameAction);
  }, [displayName]);

  if (state === 'error') {
    return (
      <div>
        <div>Error in game: {JSON.stringify(gameId) + ": " + error?.message}</div>
        <IonButton type="button" onClick={() => gameDispatch({actionType: 'retry', db: gameId} as GameAction)}>Retry</IonButton>
      </div>
    );
  }
  // loading is true even after the doc loads
  // TODO: check if changing this from && doc==null messed anything up
  if (loading || doc === null) {
    //console.log("Game Loading: "+loading+", doc: "+JSON.stringify(doc));
    return (<h1> loadin in game</h1>);
  }

  return (
    <>
        <Route exact path={"/game/" + gameId } >
          <HeaderPage title={gameId + "is the game id"}>
            <IonContent fullscreen>
            DUHHHH DIS IS GAME PAGE
            {JSON.stringify(doc)}
            <NeedPermissions permissions={"GameAdmin"}>
              <IonButton size="large" routerLink={util.getConfigurationUrl(gameId)}>Configure game columns and settings</IonButton>
              <IonButton size="large" routerLink={util.getAddCharacterUrl(gameId)}>Add Character</IonButton>
              <IonButton size="large" routerLink={util.getDeleteCharacterUrl(gameId)}>Delete Character</IonButton>
              <IonButton size="large" routerLink={util.getAuthorizedUsersUrl(gameId)}>Change Authorized Users</IonButton>
            </NeedPermissions>
            </IonContent>
          </HeaderPage>
        </Route>
        {/*Keep in mind router params stop at slashes, so /character/bob/local-edit just has bob as the character*/}
        <Route path={[CompileConstants.SEGMENT_MATCH, CompileConstants.CHARACTER_MATCH]} >
          <HeaderPage title={gameId + "is the game id"}>
            <MiddlewareSetterContext.Provider value={setMiddleware}>
              <MiddlewareContext.Provider value={middleware}>
                <CharacterContextProvider>
                  <CharacterDocAccess gameId={gameId}>
                    <CharacterSegments gameId={gameId} columnDefs={modifiedColumnDefs} universalPropDefs={modifiedUniversalPropDefs!} />
                  </CharacterDocAccess>
                </CharacterContextProvider>
              </MiddlewareContext.Provider>
            </MiddlewareSetterContext.Provider>
          </HeaderPage>
        </Route>
        <Route path={CompileConstants.CONFIGURATION_MATCH} >
          <DefEditor designDoc={doc} />
        </Route>
        <Route path={CompileConstants.ADD_CHARACTER_MATCH} >
          <div>Under Construction</div>
        </Route>
        <Route path={CompileConstants.DELETE_CHARACTER_MATCH} >
          <div>Under Construction</div>
        </Route>
        <Route path={CompileConstants.AUTHORIZED_USERS_MATCH} >
          <div>Under Construction</div>
        </Route>
    </>
  );
}

export default Game
