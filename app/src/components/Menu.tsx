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

import React from 'react';
import { useLocation } from 'react-router-dom';
import { archiveOutline, archiveSharp, bookmarkOutline, bookmarkSharp, heartOutline, heartSharp, mailOutline, mailSharp, paperPlaneOutline, paperPlaneSharp, trashOutline, trashSharp, warningOutline, warningSharp } from 'ionicons/icons';
import './Menu.css';
//import PouchDB from 'pouchdb';
import { useDoc } from 'use-pouchdb'
//import * as myPouch from '../services/pouch';
import { DBListDoc } from '../types/characterTypes';
//import DBProvider from './DBProvider';
//import GameMenu from './GameMenu';
import { Action, TestContext, useTestDispatch, withContext, Preferences, LocalData } from './TestProvider';

const TestSwitcher = (props: any) => {
  const dispatch = useTestDispatch();
  console.log("RENDERED TESTSWITCHER WEEWOOWEEWOO");
  function testToggleAutoDownload() {
    console.log(`toggling autodownload from ${props.autoDownload} to ${!props.autoDownload}`);
    const current = props.autoDownload;
    const action: Action = {actionType: "changePreferences", preferences: {showTutorials: props.showTutorials, autoDownload: !current}};
    dispatch(action);
  }
  return (
    <div>
          <IonButton type="button" onClick={() => testToggleAutoDownload()}>TEST TOGGLE, autoDL = {props.autoDownload ? "ye" : "ne"}</IonButton>
    </div>
  )
}
const WrappedTestSwitcher = withContext( ((state: LocalData)=> {return state.preferences}) )(TestSwitcher);

const Menu: React.FC = () => {
  const location = useLocation(); //access current page url and update when it changes
  const { doc, loading, state, error } = useDoc<PouchDB.Core.Document<DBListDoc>>("top/list", {db: "remoteTop"}); 

  if (state === 'error') {
    console.error("heckin errorino in Menu: " + error?.message);
    return (<span>heckin errorino in menu: {error?.message}</span>);
  }
  // loading is true even after the doc loads
  if (loading && doc == null) {
    console.log("Menu Loading: "+loading+", doc: "+JSON.stringify(doc));
    return (<h1> loadin in menu</h1>);
  }

  return (
    <>
      <IonContent>
        <IonList id="inbox-list">
          <IonListHeader>Select Game</IonListHeader>
          <IonNote>not tekken tho</IonNote>
          {doc!.dbs.map((db, index) => {
            let url: string = "/game/"+db.id;
            return (
                <IonItem className={location.pathname.includes(url) ? 'selected' : ''} 
                  routerLink={url} routerDirection="forward" key={index} lines="none" detail={false}>
             {/*<IonMenuToggle key={index} autoHide={false}>*/}
              {/*onClick={() => openMenu(db.id)}*/} 
                  <IonIcon slot="start" ios={bookmarkOutline} md={bookmarkSharp} />
                  <IonLabel>{db.name}</IonLabel>
              {/*</IonMenuToggle> */} 
                </IonItem>
            );
          })}
          <WrappedTestSwitcher />
        </IonList>
      </IonContent>

  </>
  );
};

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
];
      <IonMenu menuId={"menu-"+currentDB} contentId="main" disabled={false} type="overlay">
        <IonContent>
          <IonList>
            <IonMenuToggle>
            <IonItem onClick={() => openMenu("top")}>Top</IonItem> 
            </IonMenuToggle>
          </IonList>
        </IonContent>
      </IonMenu>

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
