import { IonContent, IonIcon, IonItem, IonLabel, IonList, IonListHeader, IonMenu, IonMenuToggle, IonNote, } from '@ionic/react';

import React from 'react';
import { useLocation } from 'react-router-dom';
import { bookmarkOutline, bookmarkSharp } from 'ionicons/icons';
import './Menu.css';
//import PouchDB from 'pouchdb';
import { useView } from 'use-pouchdb'
//import * as myPouch from '../services/pouch';
//import { DBListDoc } from '../types/characterTypes';
import LoginButton from './LoginButton';
import { useGameId } from './GameProvider';

type GameMenuProps = {
}

// Query a view to get list of characters
// Menu can use <IonRoute> without being inside an outlet if desired
// Could also have top menu at same place with everything inside top-level provider.
const GameMenu: React.FC = () => {
  const location = useLocation(); //access current page url and update when it changes
  const { rows, loading, state, error } = useView("list/list-chars"); 
  const gameId: string | null = useGameId();
  if (gameId === null) {
    return (<span>error, GameMenu receiving null gameId</span>);
  };

  if (state === 'error') {
    console.error("heckin errorino in character menu: " + error?.message);
    return (<span>heckin errorino in character menu: {error?.message}</span>);
  }
  // loading is true even after the doc loads
  if (loading && rows.length === 0) {
    return (<h1> loadin in character menu</h1>);
  }

  return (
      <IonContent>
        <IonList id="inbox-list">
          <IonListHeader>Select Character</IonListHeader>
          <IonNote>ky is dishonest</IonNote>

          {rows!.map((row, index) => {
            let url: string = "/game/"+gameId+"/"+row.id;
            return (
              <IonMenuToggle key={index} autoHide={false}>
                <IonItem className={location.pathname === url ? 'selected' : ''} routerLink={url} routerDirection="forward" lines="none" detail={false}>
                  <IonIcon slot="start" ios={bookmarkOutline} md={bookmarkSharp} />
                  <IonLabel>{row.key}</IonLabel>
                </IonItem>
              </IonMenuToggle>
            );
          })}

          <LoginButton db={gameId} />

          <IonMenuToggle key={rows.length} autoHide={false}>
            <IonItem routerLink={"/page/Inbox"} routerDirection="back" lines="none" detail={false}>
              <IonIcon slot="start" ios={bookmarkOutline} md={bookmarkSharp} />
              <IonLabel>Home</IonLabel>
            </IonItem>
          </IonMenuToggle>

        </IonList>

      </IonContent>
  );
};

export default GameMenu;
/*
          {appPages.map((appPage, index) => {
            return (
              <IonMenuToggle key={index} autoHide={false}>
                <IonItem className={location.pathname === appPage.url ? 'selected' : ''} routerLink={appPage.url} routerDirection="none" lines="none" detail={false}>
                  <IonIcon slot="start" ios={appPage.iosIcon} md={appPage.mdIcon} />
                  <IonLabel>{appPage.title}</IonLabel>
                </IonItem>
              </IonMenuToggle>
            );
          })}
          */
