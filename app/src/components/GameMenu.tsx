import { IonContent, IonIcon, IonItem, IonLabel, IonList, IonListHeader, IonMenu, IonMenuToggle, IonNote, } from '@ionic/react';

import React, { useEffect, useState, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { bookmarkOutline, bookmarkSharp } from 'ionicons/icons';
//import './Menu.css'; //doesn't look much different, and this styling trickles down to child components like login modals
//import PouchDB from 'pouchdb';
import { useView, usePouch } from 'use-pouchdb'
import { useDocumentLocalRemoteSwitching } from '../services/pouch';
//import { DBListDoc } from '../types/characterTypes';
import { getCharacterUrl, getGameUrl } from '../services/util';
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
  const { rows, loading, state, error } = useView("list/list-chars"); 
  useDocumentLocalRemoteSwitching(state, error, 'GameMenu');
  let menuContent: ReactNode = (<div>Ky is dishonest</div>);

  if (gameId === null) {
    menuContent = (<div>error, GameMenu receiving null gameId</div>);
  }
  else if (state === 'error') {
    menuContent = (<div>heckin errorino in character menu: {error?.message}</div>);
  }
  // loading is true even after the doc loads
  else if (loading && rows.length === 0) {
    menuContent = (<h1> loadin in character menu</h1>);
  }
  else {
    menuContent = (
      <>
        {rows!.map((row, index) => {
          let url: string = getCharacterUrl(gameId, row.key);
          return (
            <IonMenuToggle key={index} autoHide={false}>
              <IonItem className={location.pathname === url ? 'selected' : ''} routerLink={url} routerDirection="forward" lines="none" detail={false}>
                <IonIcon slot="start" ios={bookmarkOutline} md={bookmarkSharp} />
                <IonLabel>{row.value}</IonLabel>
              </IonItem>
            </IonMenuToggle>
          );
        })}
      </>
    );
  }

  return (
      <IonContent>
        <IonList id="inbox-list">
          <IonListHeader>Select Character</IonListHeader>
          <IonNote>ky is dishonest</IonNote>

          {menuContent}
          {(gameId !== null) && <LoginButton />}
          {/* Wrap each link with menu toggle to close the menu when clicked */}
          <IonMenuToggle key="game-page" autoHide={false}>
            <IonItem routerLink={getGameUrl(gameId)} routerDirection="back" lines="none" detail={false}>
              <IonIcon slot="start" ios={bookmarkOutline} md={bookmarkSharp} />
              <IonLabel>{gameDisplayName} Main Page</IonLabel>
            </IonItem>
          </IonMenuToggle>
          <IonMenuToggle key="home" autoHide={false}>
            <IonItem routerLink={CompileConstants.HOME_PATH} routerDirection="back" lines="none" detail={false}>
              <IonIcon slot="start" ios={bookmarkOutline} md={bookmarkSharp} />
              <IonLabel>Home</IonLabel>
            </IonItem>
          </IonMenuToggle>

        </IonList>

      </IonContent>
  );
};

export default GameMenu;
