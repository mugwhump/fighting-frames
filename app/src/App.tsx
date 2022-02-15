import { MenuContainer } from './components/Menu';
import Page from './pages/Page';
import Test from './pages/Test';
import { GameProvider } from './components/GameProvider';
import Game from './components/Game';
import DBProvider from './components/DBProvider';
import GameMenu from './components/GameMenu';
import { LocalProvider } from './components/LocalProvider';
import React from 'react';
import { IonApp, IonMenu, IonRouterOutlet, IonSplitPane, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Redirect, Route, Switch } from 'react-router-dom';
import { TestProvider } from './components/TestProvider';
import CompileConstants from './services/CompileConstants';

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

/* Theme variables */
import './theme/variables.css';

setupIonicReact(); //can add config here if desired.

const App: React.FC = () => {
  return (
    <IonApp>
      <IonReactRouter>
        <LocalProvider>
            <IonSplitPane contentId="main-top"> 
            {/* Menu must be immediate child */}
              <IonMenu side="start" menuId="top" contentId="main-top" type="overlay" disabled={false}>
                <Switch> {/* Renders only the first matching pattern instead of every matching route */}
                  <Route path="/game/:gameId">
                    <GameMenu />
                  </Route>
                  <Route>
                      <MenuContainer />
                  </Route>
                </Switch>
              </IonMenu>
              <IonRouterOutlet id="main-top">
              {/*lower routes take priority*/}
                {/* https://stackoverflow.com/a/59256779/2643645 writeup on route child methods */}
                <Switch> {/* need switch or forward navigation is messed up. Though ionic docs say Switch inside outlet does nothing? */}
                  <Route path="/game/:gameId">
                    <Game />
                  </Route>
                  <Route path="/page/Test" component={Test} exact /> 
                  <Route path="/page/Inbox" component={Page} exact />
                  {/*<Route path="/game/:gameId" render={({match}) => etc etc to use the match here */}
                  <Redirect from="/" to={{pathname: CompileConstants.HOME_PATH, state: {from: '/'}}} exact />
                </Switch>
              </IonRouterOutlet>
            </IonSplitPane>
        </LocalProvider> 
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
