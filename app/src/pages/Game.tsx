import { IonContent, IonButton, IonMenu, IonList, IonListHeader, IonItem, IonLabel } from '@ionic/react';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Route, Switch, useRouteMatch } from 'react-router-dom';
//import PouchDB from 'pouchdb';
import { useDocumentLocalRemoteSwitching } from '../services/pouch';
import { useDoc } from 'use-pouchdb';
//import * as myPouch from '../services/pouch';
//import CharacterSegments  from '../components/CharacterSegments';
import { CharacterContextProvider, MiddlewareContext, MiddlewareSetterContext, Middleware } from '../services/CharacterReducer';
import { useGameContext, useGameDispatch, Action as GameAction } from '../components/GameProvider';
import { calculateHideBreakpoints } from '../services/renderUtil';
import * as util from '../services/util';
import * as T from '../types/characterTypes';
//import { cloneDeep } from 'lodash';
import { insertDefsSortGroupsCompileRegexes   } from '../services/columnUtil';
import { CharacterDocAccess } from '../components/CharacterDocAccess';
import HeaderPage from '../components/HeaderPage';
import CompileConstants from '../constants/CompileConstants';
import NeedPermissions from '../components/NeedPermissions';
import Character from './Character';
import EditCharacter from './EditCharacter';
import ChangeBrowser from './ChangeBrowser';
import ChangeViewer from './ChangeViewer';
import DefEditor from './DefEditor';
import AddCharacter from './AddCharacter';
import DeleteCharacters from './DeleteCharacters';
import AuthorizedUsers from './AuthorizedUsers';
import ManageHtmlPages from './ManageHtmlPages';
import { EditHtmlPage, EditExistingHtmlPage } from './EditHtmlPage';
import { HtmlPage } from './HtmlPage';

type GameProps = {
}

const Game: React.FC<GameProps> = () => {
  const gameContext = useGameContext();
  const gameId: string = gameContext.gameId; //TODO: Wrapper component. Note this will update after the provider switches DBs.
  const gameDispatch = useGameDispatch();
  const [middleware, setMiddleware] = useState<Middleware>({});
  const [previewDoc, setPreviewDoc] = useState<T.ConfigDoc | null>(null);
  const configPageMatch = useRouteMatch<{gameId: string}>(CompileConstants.CONFIGURATION_MATCH); //force remote db if on configuration page
  const { doc: actualDoc, loading, state, error } = useDoc<T.ConfigDoc>(CompileConstants.CONFIG_DOC_ID, {db: !!configPageMatch ? 'remote' : '_default'}); 
  const doc: T.ConfigDoc | null = previewDoc ?? actualDoc;
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
  }, [displayName, gameId, gameDispatch]);

  //TODO: would need to give character state info about whether it's a preview doc so players can't save or upload changes based on faulty defs
  //and display a banner saying "you're previewing your definitions"
  const previewConfigDoc = useCallback((docToPreview: T.ConfigDoc) => {
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
    return (<h1>Loading in game...</h1>);
  }

  // TODO: have API create a frontpage when game is created, display it here
  return (
    <>
        <Route exact path={"/game/" + gameId } >
          <HeaderPage title={displayName ?? gameId}>
            <IonContent fullscreen>
            <br />
            <div>This is the page for {displayName}. Select a character from the menu on the left.</div> 
            <div>Administrators for this game can edit its columns, add or delete characters, add and edit rich text pages, and manage which users have editing permissions.</div>
            <NeedPermissions permissions={"GameAdmin"}>
              <IonList>
                <IonListHeader><IonLabel>Admin Links:</IonLabel></IonListHeader>

                <IonItem href={util.getConfigurationUrl(gameId)}><IonLabel>Configure game columns and settings</IonLabel></IonItem>
                <IonItem href={util.getAddCharacterUrl(gameId)}><IonLabel>Add Character</IonLabel></IonItem>
                <IonItem href={util.getDeleteCharacterUrl(gameId)}><IonLabel>Delete Character</IonLabel></IonItem>
                <IonItem href={util.getAuthorizedUsersUrl(gameId)}><IonLabel>Change Authorized Users</IonLabel></IonItem>
                <IonItem href={util.getManageHtmlPagesUrl(gameId)}><IonLabel>Manage Pages</IonLabel></IonItem>
                {/*<IonButton size="large" routerLink={util.getConfigurationUrl(gameId)}>Configure game columns and settings</IonButton>*/}
                {/*<IonButton size="large" routerLink={util.getAddCharacterUrl(gameId)}>Add Character</IonButton>*/}
                {/*<IonButton size="large" routerLink={util.getDeleteCharacterUrl(gameId)}>Delete Character</IonButton>*/}
                {/*<IonButton size="large" routerLink={util.getAuthorizedUsersUrl(gameId)}>Change Authorized Users</IonButton>*/}
                {/*<IonButton size="large" routerLink={util.getManageHtmlPagesUrl(gameId)}>Manage Pages</IonButton>*/}
              </IonList>
            </NeedPermissions>
            </IonContent>
          </HeaderPage>
        </Route>

        {/*Keep in mind router params stop at slashes, so /character/bob/local-edit just has bob as the character*/}
        {/*<Route path={[CompileConstants.SEGMENT_MATCH, CompileConstants.CHARACTER_MATCH]} >
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
        </Route>*/}

        <Route path={CompileConstants.CHARACTER_MATCH} >
            <MiddlewareSetterContext.Provider value={setMiddleware}>
              <MiddlewareContext.Provider value={middleware}>
                <CharacterContextProvider>
                  <CharacterDocAccess gameId={gameId}>
                    <Switch>

                      <Route path={CompileConstants.EDIT_MATCH} >
                        <EditCharacter gameId={gameId} columnDefs={modifiedColumnDefs} universalPropDefs={modifiedUniversalPropDefs} />
                      </Route>

                      <Route path={CompileConstants.CHANGE_MATCH} >
                        <ChangeViewer gameId={gameId} columnDefs={modifiedColumnDefs} universalPropDefs={modifiedUniversalPropDefs} />
                      </Route>

                      <Route path={CompileConstants.CHANGES_MATCH} exact >
                        <ChangeBrowser gameId={gameId} />
                      </Route>

                      <Route path={CompileConstants.CHARACTER_MATCH} exact >
                        <Character columnDefs={modifiedColumnDefs} universalPropDefs={modifiedUniversalPropDefs} /> 
                      </Route>

                    </Switch>
                  </CharacterDocAccess>
                </CharacterContextProvider>
              </MiddlewareContext.Provider>
            </MiddlewareSetterContext.Provider>
        </Route>

        <Route path={CompileConstants.CONFIGURATION_MATCH} >
          <DefEditor gameId={gameId} configDoc={doc} />
        </Route>

        <Route path={CompileConstants.ADD_CHARACTER_MATCH} >
          <AddCharacter gameId={gameId} />
        </Route>

        <Route path={CompileConstants.DELETE_CHARACTER_MATCH} >
          <DeleteCharacters gameId={gameId} />
        </Route>

        <Route path={CompileConstants.AUTHORIZED_USERS_MATCH} >
          <AuthorizedUsers gameId={gameId} />
        </Route>

        <Route path={CompileConstants.HTML_PAGE_MATCH} >
          <HtmlPage />
        </Route>

        <Route path={CompileConstants.MANAGE_HTML_PAGES_MATCH} >
          <ManageHtmlPages />
        </Route>

        <Route path={CompileConstants.ADD_HTML_PAGE_MATCH} >
          <EditHtmlPage gameDisplayName={displayName ?? gameId} />
        </Route>

        <Route path={CompileConstants.EDIT_HTML_PAGE_MATCH} >
          <EditExistingHtmlPage gameDisplayName={displayName ?? gameId} />
        </Route>
    </>
  );
}

export default Game
