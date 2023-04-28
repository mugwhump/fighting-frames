import { IonContent, IonGrid, IonRow, IonCol, IonIcon, IonItem, IonLabel, IonList, IonListHeader, IonMenu, IonMenuToggle, IonNote, IonAccordionGroup, IonAccordion } from '@ionic/react';

import React, { useEffect, useState, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { homeOutline, homeSharp, discOutline } from 'ionicons/icons';
//import './Menu.css'; //doesn't look much different, and this styling trickles down to child components like login modals
//import PouchDB from 'pouchdb';
import { useView, usePouch } from 'use-pouchdb'
import { useDocumentLocalRemoteSwitching } from '../services/pouch';
import { CharDocWithMeta } from '../types/characterTypes';
import { ListCharactersViewRow, SegmentUrl } from '../types/utilTypes'; //==
import { getCharacterUrl, getGameUrl, getEditUrl, getChangesUrl } from '../services/util';
import LoginButton from './LoginButton';
import { withGameContext, useGameDispatch, Action as GameAction } from './GameProvider';
import { useGameContext } from './GameProvider';
import CompileConstants from '../constants/CompileConstants';

type GameMenuProps = {
}

// Query a view to get list of characters
// Menu can use <IonRoute> without being inside an outlet if desired
// Could also have top menu at same place with everything inside top-level provider.
const GameMenu: React.FC = () => {
  const location = useLocation(); //access current page url and update when it changes
  const gameContext = useGameContext();
  const gameId: string = gameContext.gameId; //TODO: Wrapper component
  const gameDisplayName = gameContext.gameDisplayName;
  const gameDispatch = useGameDispatch();
  const { rows, loading, state, error } = useView<ListCharactersViewRow, CharDocWithMeta>("list/list-chars"); 
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
          const url: string = getCharacterUrl(gameId, row.key);
          const selected: boolean = location.pathname.includes(url);
          const editUrl: string = getEditUrl(gameId, row.key);
          const editSelected: boolean = location.pathname.includes(editUrl);
          const changeUrl: string = getChangesUrl(gameId, row.key);
          const changeSelected: boolean = location.pathname.includes(changeUrl);
          //return (
            //<IonAccordion key={index}>
              //<IonItem slot="header" className={location.pathname.includes(url) ? 'selected' : ''} routerLink={url} routerDirection="forward" lines="none" detail={false}>
                //[><IonIcon slot="start" ios={bookmarkOutline} md={bookmarkSharp} /><]
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
                  {/*<IonIcon slot="start" ios={bookmarkOutline} md={bookmarkSharp} />*/}
                  <IonLabel>{row.value}</IonLabel>
                </IonItem>
              </IonMenuToggle>
              {selected &&
                <IonList className="char-submenu">
                  <IonItem className={editSelected ? 'selected' : ''} routerLink={editUrl} routerDirection="forward" >Edit</IonItem>
                  <IonItem className={changeSelected ? 'selected' : ''} routerLink={changeUrl} routerDirection="forward" >Changes</IonItem>
                </IonList>
              }
            </React.Fragment>
          );
        })}
      </>
    );
  }

  return (
      <IonContent>
        <IonList id="top-list">
          <IonListHeader>Select Character</IonListHeader>
          {/*<IonNote>ky is dishonest</IonNote>*/}

          {/*<IonAccordionGroup multiple>*/}
          {menuContent}
          {/*</IonAccordionGroup>*/}

          {/* Wrap each link with menu toggle to close the menu when clicked 
            TODO: extract game link here + in top menu to its own component with download icons and functionality */}
          <IonMenuToggle key="game-page" autoHide={false}>
            <IonItem className={location.pathname === (getGameUrl(gameId)) ? 'selected' : ''} routerLink={getGameUrl(gameId)} routerDirection="back" lines="none" detail={false}>
              <IonIcon slot="start" icon={discOutline} />
              <IonLabel>{gameDisplayName} Main Page</IonLabel>
            </IonItem>
          </IonMenuToggle>
          <IonMenuToggle key="home" autoHide={false}>
            <IonItem routerLink={CompileConstants.HOME_PATH} routerDirection="back" lines="none" detail={false}>
              <IonIcon slot="start" ios={homeOutline} md={homeSharp} />
              <IonLabel>Home</IonLabel>
            </IonItem>
          </IonMenuToggle>

          {(gameId !== null) && <LoginButton />}

        </IonList>

      </IonContent>
  );
};

export default GameMenu;
