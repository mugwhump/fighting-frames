import { IonMenu, IonRouterOutlet, IonSplitPane } from '@ionic/react';
import React, { useEffect } from 'react';
import { Route } from 'react-router-dom';
//import PouchDB from 'pouchdb';
//import * as myPouch from '../services/pouch';
import { useLocalSubset,  Action, Preferences } from './LocalProvider';
import { useDoc } from 'use-pouchdb';
import Character from '../components/Character';
import GameMenu from '../components/GameMenu';
import { useGameId } from './GameProvider';
import HeaderPage from '../components/HeaderPage';
import { DesignDoc } from '../types/characterTypes';

type GameProps = {
}

const Game: React.FC<GameProps> = () => {
  const gameId: string | null = useGameId();
  //if (gameId === null) { //complains about hooks being used conditionally. Actually this seems unnecessary after I added Switches to router
    //return (<span>NO RENDER FOR GAME, NULL GAMEID</span>); //every child must null check since react router still does another render when navigating away from game page
  //};
  const { doc, loading, state, error } = useDoc<DesignDoc>("_design/columns"); 
  const prefs: Preferences = useLocalSubset<Preferences>("preferences");
  //const {data, dispatch}: ContextValueSubType<Preferences> = 
      //useLocalDataSelector((contextVal: ContextValue) => {return {data: contextVal.data.preferences, dispatch: contextVal.dispatch}});

  useEffect(() => {
    console.log("Game rendered, here's da prefs: " + JSON.stringify(prefs));
  });

  if (state === 'error') {
    console.error("heckin errorino in game " + JSON.stringify(gameId) + ": " + error?.message);
    return (<span>heckin errorino in game: {JSON.stringify(gameId) + ": " + error?.message}</span>);
  }
  // loading is true even after the doc loads
  if (loading && doc == null) {
    console.log("Game Loading: "+loading+", doc: "+JSON.stringify(doc));
    return (<h1> loadin in game</h1>);
  }

  return (
    <>
    {/*<IonSplitPane contentId="main-sub">*/}
    {/* when side=end in nested split-pane, there's empty pane on left with this menu on right*/}
    {/* when side=start in nested split-pane, top pane disappears when going from game back to index*/}
    {/* if there's no nested split pane it doesn't show in Game/Character and top pane breaks when go back*/}
      {/*<IonMenu side="start" menuId="subMenu" contentId="main-sub" type="overlay" disabled={false}>*/}
        {/*<GameMenu id={id} topMenuCallback={() => {console.log("called topMenuCallback")}} />*/}
      {/*</IonMenu>*/}
      {/*<IonRouterOutlet id="main-sub" ionPage>*/}
        <Route exact path={"/game/" + gameId } >
          <HeaderPage title={gameId + "is the game id"}>
            DUHHHH DIS IS GAME PAGE
            {JSON.stringify(doc)}
            {/* using non-null assertion for doc */}
            </HeaderPage>
          </Route>
        <Route exact path={"/game/" + gameId + "/character/:character"} >
          <HeaderPage title={gameId + "is the game id, TEST: autodownload = " + prefs.autoDownload}>
            <Character columns={doc!.columnDefs} universalProps={doc!.universalPropDefs}/>
          </HeaderPage>
        </Route>
      {/*</IonRouterOutlet>*/}
    {/*</IonSplitPane>*/}
    </>
  );
}

export default Game
