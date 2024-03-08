import { IonButton } from '@ionic/react';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Route, Switch, Redirect, useRouteMatch } from 'react-router-dom';
//import PouchDB from 'pouchdb';
import { useDocumentLocalRemoteSwitching } from '../services/pouch';
import { useDoc } from 'use-pouchdb';
//import * as myPouch from '../services/pouch';
//import CharacterSegments  from '../components/CharacterSegments';
import { CharacterContextProvider, MiddlewareContext, MiddlewareSetterContext, Middleware } from '../services/CharacterReducer';
import { withGameContext, useGameDispatch, Action as GameAction } from '../components/GameProvider';
import { calculateHideBreakpoints } from '../services/renderUtil';
import * as util from '../services/util';
import * as T from '../types/characterTypes';
import { useMyToast } from '../services/hooks';
import { insertDefsSortGroupsCompileRegexes   } from '../services/columnUtil';
import { CharacterDocAccess } from '../components/CharacterDocAccess';
import CompileConstants from '../constants/CompileConstants';
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
import FrontPage from './FrontPage';

export const GameContainer: React.FC = () => {
  const WrappedGame = withGameContext((state) => {return {
    gameId: state.gameId,
  }})(Game);
  return (<WrappedGame />);
}

type GameProps = {
  gameId: string;
}

const Game: React.FC<GameProps> = ({gameId}) => {
  const gameDispatch = useGameDispatch();
  const [presentMyToast, ] = useMyToast(); 
  const [showedDeletedNotification, setShowedDeletedNotification] = useState<boolean>(false);
  const [middleware, setMiddleware] = useState<Middleware>({});
  const [previewDoc, setPreviewDoc] = useState<T.ConfigDoc | null>(null);
  const configPageMatch = useRouteMatch<{gameId: string}>(CompileConstants.CONFIGURATION_MATCH); //force remote db if on configuration page
  const { doc: actualDoc, loading, state, error } = useDoc<T.ConfigDoc>(CompileConstants.CONFIG_DOC_ID, {db: !!configPageMatch ? 'remote' : '_default'}); 
  const doc: T.ConfigDoc | null = previewDoc ?? actualDoc;
  useDocumentLocalRemoteSwitching(state, error, 'Game');
  const { doc: frontPageDoc, loading: frontPageLoading, state: frontPageState, error: frontPageError } = 
    useDoc<T.HtmlPageDoc>(CompileConstants.CONFIG_DOC_ID, {db: !!configPageMatch ? 'remote' : '_default'}); 
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

  useEffect(() => {
    // Display warnings if viewing a deleted game
    if(!showedDeletedNotification && gameId && gameId.startsWith('internal-') && gameId.endsWith('-deleted')) {
      presentMyToast('This game is marked for deletion and not visible to the public', 'warning', 999999);
      setShowedDeletedNotification(true);
    }
  }, [gameId, showedDeletedNotification]);
  useEffect(() => {
    // Display warnings if previewing
  }, [previewDoc]);

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

  return (
    <>
        <Route exact path={"/game/" + gameId + '/' + CompileConstants.GAME_FRONTPAGE_DOC_ID} >
          <Redirect to={"/game/" + gameId } />
        </Route>
        <Route exact path={"/game/" + gameId } >
          <FrontPage gameId={gameId} displayName={displayName} />
        </Route>

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

export default GameContainer;
