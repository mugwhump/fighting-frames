import { IonContent, IonButton, IonMenu, IonRouterOutlet, IonSplitPane } from '@ionic/react';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Route, useRouteMatch } from 'react-router-dom';
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
  const [previewDoc, setPreviewDoc] = useState<T.DesignDoc | null>(null);
  const configPageMatch = useRouteMatch<{gameId: string}>(CompileConstants.CONFIGURATION_MATCH); //force remote db if on configuration page
  const { doc: actualDoc, loading, state, error } = useDoc<T.DesignDoc>("_design/columns", {db: !!configPageMatch ? 'remote' : '_default'}); 
  const doc: T.DesignDoc | null = previewDoc ?? actualDoc;
  useDocumentLocalRemoteSwitching(state, error, 'Game');
  const displayName: string | undefined = doc?.displayName;

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

  //TODO: would need to give character state info about whether it's a preview doc so players can't save or upload changes based on faulty defs
  //and display a banner saying "you're previewing your definitions"
  const previewDesignDoc = useCallback((docToPreview: T.DesignDoc) => {
  }, []);

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
              <IonButton size="large" routerLink={util.getDeleteCharacterUrl(gameId)}>Delete Character/Change name</IonButton>
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
          <DefEditor gameId={gameId} designDoc={doc} />
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
