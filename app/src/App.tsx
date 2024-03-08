import { MenuContainer } from './components/Menu';
import Home from './pages/Home';
import Test from './pages/Test';
import { GameProvider } from './components/GameProvider';
import { GameContainer } from './pages/Game';
import DBProvider from './components/DBProvider';
import { GameMenuContainer } from './components/GameMenu';
import AddGame from './pages/AddGame';
import DeleteGame from './pages/DeleteGame';
import { LocalProvider } from './components/LocalProvider';
import React from 'react';
import { IonApp, IonMenu, IonItem, IonLabel, IonRouterOutlet, IonSplitPane, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Redirect, Route, Switch } from 'react-router-dom';
import { TestProvider } from './components/TestProvider';
import CompileConstants from './constants/CompileConstants';

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
import './theme/custom-variables.css';

setupIonicReact(); //can add config here if desired.

const App: React.FC = () => {
  return (
    <IonApp>
      <IonReactRouter>
        <LocalProvider>
            <IonSplitPane contentId="main-top"> 
            {/* Menu must be immediate child */}
              <IonMenu className="styled-menu" side="start" menuId="top" contentId="main-top" type="overlay" disabled={false}>
                <Switch> {/* Renders only the first matching pattern instead of every matching route */}
                  <Route path="/game/:gameId">
                    <GameMenuContainer />
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
                    <GameContainer />
                  </Route>
                  <Route path="/page/Test" component={Test} exact /> 
                  <Route path={CompileConstants.CONFIRMATION_PATH} exact >
                    <IonItem><IonLabel>Email confirmed! Your account is now verified.</IonLabel></IonItem>
                  </Route>
                  <Route path={CompileConstants.ADD_GAME_PATH} exact >
                    <AddGame />
                  </Route>
                  <Route path={CompileConstants.DELETE_GAME_PATH} exact >
                    <DeleteGame />
                  </Route>
                  <Route path={CompileConstants.HOME_PATH} component={Home} exact />
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
