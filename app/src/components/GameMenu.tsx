import { IonContent, IonIcon, IonItem, IonLabel, IonList, IonListHeader, IonMenuToggle } from '@ionic/react';
import React, { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { homeOutline, homeSharp, newspaperOutline, newspaperSharp, personCircleOutline, personCircleSharp, returnDownForwardSharp } from 'ionicons/icons';
//import './Menu.css'; //doesn't look much different, and this styling trickles down to child components like login modals
import { useView } from 'use-pouchdb'
import { useDocumentLocalRemoteSwitching } from '../services/pouch';
import { CharDocWithMeta, HtmlPageDoc } from '../types/characterTypes';
import { ListCharactersAndPagesViewRow } from '../types/utilTypes';
import { getCharacterUrl, getHtmlPageUrl, getEditUrl, getChangesUrl } from '../services/util';
import LoginButton from './LoginButton';
import { withGameContext } from './GameProvider';
import { DBStatus } from './GameProvider';
import { MenuItem } from './Menu';
import CompileConstants from '../constants/CompileConstants';

export const GameMenuContainer: React.FC = () => {
  const WrappedGameMenu = withGameContext((state) => {return {
    gameId: state.gameId,
    gameDisplayName: state.gameDisplayName,
    dbStatus: state.dbStatuses.get(state.gameId),
  }})(GameMenu);
  return (<WrappedGameMenu />);
}

type GameMenuProps = {
  gameId: string;
  gameDisplayName: string;
  dbStatus: DBStatus;
}

// Query a view to get list of characters
// Menu can use <IonRoute> without being inside an outlet if desired
// Could also have top menu at same place with everything inside top-level provider.
const GameMenu: React.FC<GameMenuProps> = ({gameId, gameDisplayName, dbStatus}) => {
  const location = useLocation(); //access current page url and update when it changes
  const { rows, loading, state, error } = useView<ListCharactersAndPagesViewRow, CharDocWithMeta | HtmlPageDoc>("menu_items/list-menu-items"); 
  useDocumentLocalRemoteSwitching(state, error, 'GameMenu');
  let menuContent: ReactNode = (<div>Ky is dishonest</div>);

  if (gameId === null) {
    menuContent = (<div>error, GameMenu receiving null gameId</div>);
  }
  else if (state === 'error') {
    menuContent = (<div>Error in character menu: {error?.message}</div>);
  }
  // loading is true even after the doc loads
  else if (loading && rows.length === 0) {
    menuContent = (<h1> loadin in character menu</h1>);
  }
  else {
    menuContent = (
      <>
        {rows!.map((row, index) => {
          const isPage = !row.key[0];
          const isFrontPage = !row.key[1];
          const id = row.key[2];

          if(isPage) {

            const url: string = getHtmlPageUrl(gameId, id);
            const selected: boolean = location.pathname.includes(url);

            if(isFrontPage) {
              return (
                <MenuItem gameId={gameId} gameDisplayName={gameDisplayName} key={index} path={location.pathname} status={dbStatus} />
              )
            }
            else {
              return (
                <React.Fragment key={index} >
                  <IonMenuToggle autoHide={false}>
                    <IonItem className={selected ? 'selected' : ''} routerLink={url} routerDirection="forward" lines="none" detail={false}>
                      <IonIcon slot="start" ios={newspaperOutline} md={newspaperSharp} />
                      <IonLabel>{row.value}</IonLabel>
                    </IonItem>
                  </IonMenuToggle>
                </React.Fragment>
              );
            }

          }

          // Characters
          else {

            const url: string = getCharacterUrl(gameId, id);
            const selected: boolean = location.pathname.includes(url);
            const editUrl: string = getEditUrl(gameId, id);
            const editSelected: boolean = location.pathname.includes(editUrl);
            const changeUrl: string = getChangesUrl(gameId, id);
            const changeSelected: boolean = location.pathname.includes(changeUrl);
            //return (
              //<IonAccordion key={index}>
                //<IonItem slot="header" className={location.pathname.includes(url) ? 'selected' : ''} routerLink={url} routerDirection="forward" lines="none" detail={false}>
                  //[><IonIcon slot="start" ios={newspaperOutline} md={newspaperSharp} /><]
                  //<IonLabel>{row.value}</IonLabel>
                //</IonItem>
              //<IonList slot="content">
                //<IonItem>hey</IonItem>
                //<IonItem>hoo</IonItem>
              //</IonList>
              //</IonAccordion>
            //);
            return (
              <React.Fragment key={index} >
                <IonMenuToggle autoHide={false}>
                  <IonItem className={selected ? 'selected' : ''} routerLink={url} routerDirection="forward" lines="none" detail={false}>
                    <IonIcon slot="start" ios={personCircleOutline} md={personCircleSharp} />
                    <IonLabel>{row.value}</IonLabel>
                  </IonItem>
                </IonMenuToggle>
                {selected &&
                  <IonList className="char-submenu">
                    <IonItem className={editSelected ? 'selected' : ''} routerLink={editUrl} routerDirection="forward" >
                      <IonIcon slot="start" icon={returnDownForwardSharp} />
                      <IonLabel>Edit</IonLabel>
                    </IonItem>
                    <IonItem className={changeSelected ? 'selected' : ''} routerLink={changeUrl} routerDirection="forward" >
                      <IonIcon slot="start" icon={returnDownForwardSharp} />
                      <IonLabel>Changes</IonLabel>
                    </IonItem>
                  </IonList>
                }
              </React.Fragment>
            );
          }
        })}
      </>
    );
  }

  return (
      <IonContent>
        <IonList id="top-list">
          {/*<IonListHeader>Select Character</IonListHeader>*/}
          {/*<IonNote>ky is dishonest</IonNote>*/}

          {/*<IonAccordionGroup multiple>*/}
          {menuContent}
          {/*</IonAccordionGroup>*/}

          {/*<IonMenuToggle key="home" autoHide={false}>*/}
            <IonItem routerLink={CompileConstants.HOME_PATH} routerDirection="back" lines="none" detail={false}>
              <IonIcon slot="start" ios={homeOutline} md={homeSharp} />
              <IonLabel>Home</IonLabel>
            </IonItem>
          {/*</IonMenuToggle>*/}

          {(gameId !== null) && <LoginButton />}

        </IonList>

      </IonContent>
  );
};

export default GameMenu;
