import { IonContent, IonButton, IonMenu, IonRouterOutlet, IonSplitPane } from '@ionic/react';
import React, { useEffect, useState, useMemo } from 'react';
import { Route } from 'react-router-dom';
//import PouchDB from 'pouchdb';
import { useDocumentLocalRemoteSwitching } from '../services/pouch';
import { useDoc, usePouch } from 'use-pouchdb';
import { requiredPropDefs, requiredColumnDefs, moveNameColumnDef } from '../constants/internalColumns';
import { Character } from '../components/Character';
import CharacterSegments  from '../components/CharacterSegments';
import { CharacterDocAccess } from '../components/CharacterDocAccess';
import { CharacterContextProvider, MiddlewareContext, MiddlewareSetterContext, Middleware } from '../services/CharacterReducer';
import { useGameContext, useGameDispatch, Action as GameAction } from './GameProvider';
import { calculateHideBreakpoints } from '../services/renderUtil';
import HeaderPage from '../components/HeaderPage';
import * as T from '../types/characterTypes';
import { cloneDeep } from 'lodash';
import CompileConstants from '../constants/CompileConstants';

type GameProps = {
}

const Game: React.FC<GameProps> = () => {
  const gameContext = useGameContext();
  const gameId: string = gameContext.gameId; //TODO: Wrapper component. Note this will update after the provider switches DBs.
  const gameDispatch = useGameDispatch();
  const [middleware, setMiddleware] = useState<Middleware>({});
  const { doc, loading, state, error } = useDoc<T.DesignDoc>("_design/columns"); 
  useDocumentLocalRemoteSwitching(state, error, 'Game');

  // required column definitions are inserted, overwriting whatever might have been in db
  const modifiedUniversalPropDefs = useMemo(() => {
    let newDefs = (doc?.universalPropDefs) ? cloneDeep<T.ColumnDefs>(doc?.universalPropDefs) : {};
    //ensure moveOrder at end
    return {...newDefs, ...requiredPropDefs}; 
  }, [doc?.universalPropDefs]);

  const modifiedColumnDefs = useMemo(() => {
    let newDefs = (doc?.columnDefs) ? cloneDeep<T.ColumnDefs>(doc?.columnDefs) : {};
    //ensure moveName at front
    newDefs = {...requiredColumnDefs, ...newDefs}; 

    calculateHideBreakpoints(newDefs);
    return newDefs;
  }, [doc?.columnDefs]);

  if (state === 'error') {
    return (
      <div>
        <div>heckin errorino in game: {JSON.stringify(gameId) + ": " + error?.message}</div>
        <IonButton type="button" onClick={() => gameDispatch({actionType: 'retry', db: gameId} as GameAction)}>Retry</IonButton>
      </div>
    );
  }
  // loading is true even after the doc loads
  if (loading && doc == null) {
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
            {/* using non-null assertion for doc */}
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
    </>
  );
}

export default Game
