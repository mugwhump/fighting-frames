import React from 'react';
import { IonContent, IonFooter, IonToolbar, IonRow, IonList, IonListHeader, IonNote, IonItem, IonIcon, IonLabel, IonInput, IonButton } from '@ionic/react';
import { useDoc } from 'use-pouchdb'
import * as util from '../services/util';
import CompileConstants from '../constants/CompileConstants';
import HeaderPage from '../components/HeaderPage';
import NeedPermissions from '../components/NeedPermissions';
import { HtmlPageRenderer } from './HtmlPage';
import { HtmlPageDoc } from '../types/characterTypes'; 


type FrontPageProps = {
  gameId: string;
  displayName?: string;
}
const FrontPage = ({gameId, displayName}: FrontPageProps) => {
  const { doc, loading, state, error } = useDoc<HtmlPageDoc>(CompileConstants.GAME_FRONTPAGE_DOC_ID); 

  if (state === 'error') {
    console.log(`Err in FrontPage, ${JSON.stringify(error)}\``);
    return (
      <HeaderPage title="Page missing" contentMessage={"Error: " + error?.message} retryButton={true} />
    )
  }

  if (loading || !doc) {
    return (<HeaderPage title={"Loading front page"} contentMessage="Loading..." />)
  }

  return (
    <HeaderPage title={displayName ?? gameId}>
      <IonContent fullscreen>

        <HtmlPageRenderer doc={doc} />

        <NeedPermissions permissions={"GameAdmin"}>
          <IonList>
            <IonListHeader><IonLabel>Admin Links:</IonLabel></IonListHeader>

            <IonItem href={util.getConfigurationUrl(gameId)}><IonLabel>Configure game columns and settings</IonLabel></IonItem>
            <IonItem href={util.getAddCharacterUrl(gameId)}><IonLabel>Add Character</IonLabel></IonItem>
            <IonItem href={util.getDeleteCharacterUrl(gameId)}><IonLabel>Delete Character</IonLabel></IonItem>
            <IonItem href={util.getAuthorizedUsersUrl(gameId)}><IonLabel>Change Authorized Users</IonLabel></IonItem>
            <IonItem href={util.getManageHtmlPagesUrl(gameId)}><IonLabel>Manage Pages</IonLabel></IonItem>
          </IonList>
        </NeedPermissions>

      </IonContent>
    </HeaderPage>
  );
}

export default FrontPage;
