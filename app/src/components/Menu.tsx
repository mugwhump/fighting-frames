import {
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenu,
  IonMenuToggle,
  IonNote,
  IonButton,
} from '@ionic/react';
//import { menuController } from '@ionic/core';

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { cloudDoneOutline, cloudDownloadOutline, cloudOfflineOutline, skullOutline } from 'ionicons/icons';
import { CreateAnimation, Animation } from '@ionic/react';
import './Menu.css';
import { useDoc } from 'use-pouchdb'
import { useDocumentLocalRemoteSwitching } from '../services/pouch';
import { DBListDoc, DBListDocItem } from '../types/characterTypes';
import LoginButton from './LoginButton';
import { withLocalContext, useLocalDispatch, Action as LocalAction } from './LocalProvider';
import { withGameContext, useGameDispatch, DBStatus, DBTransitionState, Action as GameAction } from './GameProvider';

export const MenuContainer: React.FC = () => {
  //TODO: probably only need gameprovider stuff, not localprovider
  const WrappedMenu = withGameContext((state) => {return {
    usingLocal: state.usingLocal, 
  }})(Menu);
  return (<WrappedMenu />);
}

interface MenuProps {
  usingLocal: boolean
}

//needs usingLocal. Maybe isOnline. 
const Menu: React.FC<MenuProps> = ({usingLocal}) => {
  //console.log("Render menu, usingLocal: " + usingLocal);
  const location = useLocation(); //access current page url and update when it changes
  const topDB: string = usingLocal ? "localTop" : "remoteTop";
  const { doc, loading, state, error } = useDoc<PouchDB.Core.Document<DBListDoc>>("top/list", {db: topDB}); 
  useDocumentLocalRemoteSwitching(state, error, usingLocal, 'Menu');
  const gameDispatch = useGameDispatch();

  if (state === 'error') {
    console.log("MENU COMPLAINO");
    return (<span>heckin errorino in menu: {error?.message}</span>);
  }
  // loading is true even after the doc loads
  if (loading && doc == null) {
    return (<h1> loadin in menu</h1>);
  }

  const WrappedMenuItem = withGameContext((gameContext, props) => { return {status: gameContext.dbStatuses.get(props.dbListItem.id)}})(MenuItem);
  return (
    <>
      <IonContent>
        <IonList id="inbox-list">
          <IonListHeader>Select Game</IonListHeader>
          <IonNote>not tekken tho</IonNote>
          {doc!.dbs.map((dbListItem, index) => {
            return (
              <WrappedMenuItem dbListItem={dbListItem} key={index} path={location.pathname} />
            );
          })}
          <LoginButton />
        </IonList>
      </IonContent>

  </>
  );
};

//TODO: memoize?
interface MenuItemProps {dbListItem: DBListDocItem, key: number, status: DBStatus, path: string}
const MenuItem: React.FC<MenuItemProps> = ({dbListItem, key, status, path}) => {
  const localDispatch = useLocalDispatch();
  const url: string = "/game/"+dbListItem.id;
  const isWanted: boolean = status.userWants;
  const transition: DBTransitionState = status.currentTransition;
  const playAnimation: boolean = transition === 'downloading' || transition === 'deleting';
  let icon: string = cloudDownloadOutline;
  if(isWanted && status.done) icon = cloudDoneOutline;

  const localErrorIcon = (status.localError) ? (<IonIcon slot="end" md={skullOutline} />) : '';
  const remoteErrorIcon = (status.remoteError) ? (<IonIcon slot="end" md={cloudOfflineOutline} />) : '';
  //if(dbListItem.id==="samsho") console.log(`Menu item, playing=${playAnimation}, dbListItem=${JSON.stringify(dbListItem)}, status=${JSON.stringify(status)}`);

  function setUserWants(event: any, wants: boolean) {
    event.preventDefault();
    event.stopPropagation();
    const action: LocalAction = {actionType: 'setUserWants', db: dbListItem.id, userWants: wants};
    localDispatch(action);
  }
  //TODO: disable button if local not enabled
  return (
    <IonItem className={path.includes(url) ? 'selected' : ''} 
      routerLink={url} routerDirection="forward" lines="none" detail={false}>
      {/*<IonMenuToggle key={index} autoHide={false}>*/}
        {/*onClick={() => openMenu(db.id)}*/} 
      <IonButton fill="clear" onClick={(e) => setUserWants(e, !isWanted)}>
        <CreateAnimation duration={1000} iterations={Infinity} 
          play={playAnimation} stop={!playAnimation} direction={'alternate'} easing={'ease-in-out'}
          fromTo={[{ property: 'transform', fromValue: 'translateY(-3px)', toValue: 'translateY(3px)'}]} >
          <IonIcon slot="start" md={icon} />
        </CreateAnimation>
      </IonButton> 
      {localErrorIcon}
      {remoteErrorIcon}
      <IonLabel>{dbListItem.name}</IonLabel>
    {/*</IonMenuToggle> */} 
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
