import Menu from './components/Menu';
import Page from './pages/Page';
import Test from './pages/Test';
import GameProvider from './components/GameProvider';
import Game from './components/Game';
import DBProvider from './components/DBProvider';
import GameMenu from './components/GameMenu';
import { LocalProvider } from './components/LocalProvider';
import React from 'react';
import { IonApp, IonMenu, IonRouterOutlet, IonSplitPane } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Redirect, Route, Switch } from 'react-router-dom';
import { TestProvider } from './components/TestProvider';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import { Provider } from 'use-pouchdb';
import PouchDB from 'pouchdb';
import * as myPouch from './services/pouch';
import PouchAuth from 'pouchdb-authentication';

/* Theme variables */
import './theme/variables.css';


const App: React.FC = () => {
  //const localTop : PouchDB.Database = myPouch.getDB("local-top");
  //const remoteTop : PouchDB.Database = myPouch.getDB(myPouch.remote + "top");
  //PouchDB.plugin(PouchAuth);

  return (
    <IonApp>
      <IonReactRouter>
        <LocalProvider>
        <TestProvider>
          {/*<Provider default="remoteTop" databases={{localTop: localTop, remoteTop: remoteTop}}>*/}
          <GameProvider> 
            <IonSplitPane contentId="main-top"> 
            {/* Menu must be immediate child */}
              <IonMenu side="start" menuId="top" contentId="main-top" type="overlay" disabled={false}>
                <Switch> {/* Renders only the first matching pattern insteal of every matching route */}
                  <Route path="/game/:gameId">
                    <GameMenu />
                  </Route>
                  <Route>
                      <Menu />
                  </Route>
                </Switch>
              </IonMenu>
              <IonRouterOutlet id="main-top">
              {/*lower routes take priority*/}
                {/* https://stackoverflow.com/a/59256779/2643645 writeup on route child methods */}
                <Switch> {/* need switch or forward navigation is messed up */}
                  <Route path="/game/:gameId">
                    <Game />
                  </Route>
                  <Route path="/page/Test" component={Test} exact /> 
                  <Route path="/page/Inbox" component={Page} exact />
                  {/*<Route path="/game/:gameId" render={({match}) => etc etc to use the match here */}
                  <Redirect from="/" to="/page/Inbox" exact />
                </Switch>
              </IonRouterOutlet>
            </IonSplitPane>
          </GameProvider>
          {/*</Provider>*/}
        </TestProvider>
        </LocalProvider> 
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
