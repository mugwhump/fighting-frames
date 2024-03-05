import React, { useEffect, useState } from 'react';
import { IonContent, IonList, IonListHeader, IonItem, IonLabel, IonNote } from '@ionic/react';
import { getAddGamePageUrl } from '../services/util';
import NeedPermissions from '../components/NeedPermissions';
import HeaderPage from '../components/HeaderPage';



const Home: React.FC<{}> = () => {

  return (
    <HeaderPage title={"Home"}>
      <IonContent fullscreen>
        <br />
        <div>Fighting Frames is a beta <a href="https://github.com/mugwhump/fighting-frames">open-source</a> app for web and mobile that allows users to view and submit frame data for any fighting game.</div>
        <h2>Features:</h2>
        <ul>
          <li>Download data for selected games to view offline</li>
          <li>User-defined data structures for each game</li>
          <li>Granular permissions let game administrators give specific users editing permissions</li>
          <li>Search, sort, and filter movelists</li>
          <li>Create wiki-esque rich text pages for general game information</li>
          <li>Discord and twitch bots to query frame data</li>
          <li>Coming soon: Android and IOS versions</li>
        </ul>
        <div>If you are interesting in helping to test, message me or open an issue on <a href="https://github.com/mugwhump/fighting-frames">github</a></div>

        <NeedPermissions permissions={"ServerManager"}>
          <IonList>
            <IonListHeader><IonLabel>Admin Links:</IonLabel></IonListHeader>

            <IonItem href={getAddGamePageUrl()}><IonLabel>Add a new game</IonLabel></IonItem>
          </IonList>
        </NeedPermissions>

      </IonContent>
    </HeaderPage>
  );
}

export default Home;
