import {
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenuToggle,
  IonButton,
} from '@ionic/react';
//import { menuController } from '@ionic/core';

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { cloudDoneOutline, cloudDownloadOutline, cloudOfflineOutline, skullOutline } from 'ionicons/icons';
import { CreateAnimation } from '@ionic/react';
import './Menu.css'; //doesn't look much different, and this styling trickles down to child components like login modals
import { useDoc, usePouch } from 'use-pouchdb'
import { useDocumentLocalRemoteSwitching } from '../services/pouch';
import { DBListDoc, DBListDocItem } from '../types/characterTypes';
import LoginButton from './LoginButton';
import { useLocalDispatch, Action as LocalAction } from './LocalProvider';
import { withGameContext, useGameDispatch, DBStatus, DBTransitionState } from './GameProvider';
import { DBStatuses } from '../types/GPTypes';

export const MenuContainer: React.FC = () => {
  const WrappedMenu = withGameContext((state) => {return {
    usingLocal: state.usingLocal, 
    dbStatuses: state.dbStatuses,
  }})(Menu);
  return (<WrappedMenu />);
}

interface MenuProps {
  usingLocal: boolean,
  dbStatuses: DBStatuses,
}

//needs usingLocal. Maybe isOnline. 
const Menu: React.FC<MenuProps> = ({usingLocal, dbStatuses}) => {
  const location = useLocation(); //access current page url and update when it changes
  const topDB: string = usingLocal ? "localTop" : "remoteTop";
  const currentPouch: PouchDB.Database = usePouch(topDB);
  const { doc, loading, state, error } = useDoc<PouchDB.Core.Document<DBListDoc>>("game-list", {db: topDB}); 
  useDocumentLocalRemoteSwitching(state, error, 'Menu', currentPouch);

  if (state === 'error') {
    return (<span>Error in menu: {error?.message}</span>);
  }
  // loading is true even after the doc loads
  if (loading && doc == null) {
    return (<h1>Loading menu...</h1>);
  }

  return (
    <>
      <IonContent>
        <IonList id="top-list">
          <IonListHeader>Select Game</IonListHeader>
          {doc!.dbs.map((dbListItem, index) => {
            return (
              <MenuItem gameId={dbListItem.gameId} gameDisplayName={dbListItem.displayName} key={index} path={location.pathname} status={dbStatuses.get(dbListItem.gameId)} />
            );
          })}
          <LoginButton />
        </IonList>
      </IonContent>

  </>
  );
};


//TODO: memoize?
interface MenuItemProps {gameId: string, gameDisplayName: string, key: number, status: DBStatus, path: string}
export const MenuItem: React.FC<MenuItemProps> = ({gameId, gameDisplayName, key, status, path}) => {
  const localDispatch = useLocalDispatch();
  const url: string = "/game/"+gameId;
  const isWanted: boolean = status.userWants;
  const transition: DBTransitionState = status.currentTransition;
  const playAnimation: boolean = transition === 'downloading' || transition === 'deleting';
  let icon: string = cloudDownloadOutline;
  if(isWanted && status.done) icon = cloudDoneOutline;

  const localErrorIcon = (status.localError) ? (<IonIcon slot="end" md={skullOutline} />) : '';
  const remoteErrorIcon = (status.remoteError) ? (<IonIcon slot="end" md={cloudOfflineOutline} />) : '';

  function setUserWants(event: any, wants: boolean) {
    event.preventDefault();
    event.stopPropagation();
    const action: LocalAction = {actionType: 'setUserWants', db: gameId, userWants: wants};
    localDispatch(action);
  }

  //TODO: disable button if local not enabled
  // Users probably want to see menu after navigating to a game, so no toggle
  return (
    <IonItem routerLink={url} routerDirection="forward" lines="none" detail={false}>
        <CreateAnimation duration={1000} iterations={Infinity} 
          play={playAnimation} stop={!playAnimation} direction={'alternate'} easing={'ease-in-out'}
          fromTo={[{ property: 'transform', fromValue: 'translateY(-3px)', toValue: 'translateY(3px)'}]} >
          <IonIcon slot="start" md={icon} onClick={(e) => setUserWants(e, !isWanted)}/>
        </CreateAnimation>
      {localErrorIcon}
      {remoteErrorIcon}
      <IonLabel>{gameDisplayName}</IonLabel>
    </IonItem>
  );
}

export default Menu;

/*
interface AppPage {
  url: string;
  iosIcon: string;
  mdIcon: string;
  title: string;
}

const appPages: AppPage[] = [
  {
    title: 'Test',
    url: '/page/Test',
    iosIcon: mailOutline,
    mdIcon: mailSharp
  },
  {
    title: 'Inbox',
    url: '/page/Inbox',
    iosIcon: mailOutline,
    mdIcon: mailSharp
  },
];*/
