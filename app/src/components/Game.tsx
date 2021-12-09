import { IonButton, IonMenu, IonRouterOutlet, IonSplitPane } from '@ionic/react';
import React, { useEffect, useState } from 'react';
import { Route } from 'react-router-dom';
//import PouchDB from 'pouchdb';
import { useDocumentLocalRemoteSwitching } from '../services/pouch';
import { useDoc, usePouch } from 'use-pouchdb';
import Character from '../components/Character';
import { useGameContext, useGameDispatch, Action as GameAction } from './GameProvider';
import HeaderPage from '../components/HeaderPage';
import { DesignDoc } from '../types/characterTypes';

type GameProps = {
}

const Game: React.FC<GameProps> = () => {
  const gameContext = useGameContext();
  const gameId: string = gameContext.gameId; //TODO: Wrapper component. Note this will update after the provider switches DBs.
  const gameDispatch = useGameDispatch();
  const { doc, loading, state, error } = useDoc<DesignDoc>("_design/columns"); 
  useDocumentLocalRemoteSwitching(state, error, gameContext.usingLocal, 'Game');
  const database: PouchDB.Database = usePouch();

  //useEffect(() => {
    //console.log("RENDER GAAAAAEYAAAAAAAAAAAAM ---------------------"+gameId);
  //});

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
            DUHHHH DIS IS GAME PAGE
            {JSON.stringify(doc)}
            {/* using non-null assertion for doc */}
            </HeaderPage>
          </Route>
        <Route exact path={"/game/" + gameId + "/character/:character"} >
          <HeaderPage title={gameId + "is the game id"}>
            <Character columns={doc!.columnDefs} universalProps={doc!.universalPropDefs}/>
            {/*<IonButton type="button" onClick={() => gameDispatch({actionType: 'fetchSuccess', usedLocal: gameContext.usingLocal} as GameAction)}>foo</IonButton>*/}
          </HeaderPage>
        </Route>
    </>
  );
}

export default Game
