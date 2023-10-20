import React, { useEffect, useState, useCallback, useRef } from 'react';
import { IonContent, IonFooter, IonToolbar, IonRow, IonList, IonListHeader, IonNote, IonItem, IonIcon, IonLabel, IonInput, IonButton, IonRouterLink } from '@ionic/react';
import { add, remove } from 'ionicons/icons';
import { useView } from 'use-pouchdb'
import { useParams, useHistory } from 'react-router';
import type { ListPagesViewRow } from '../types/utilTypes'; //==
import CompileConstants from '../constants/CompileConstants';
import * as util from '../services/util';
import HeaderPage from '../components/HeaderPage';
import NeedPermissions from '../components/NeedPermissions';
import { HtmlPageDoc } from '../types/characterTypes'; //==



type ManageHtmlPagesProps = {
}
export const ManageHtmlPages = ({}: ManageHtmlPagesProps) => {
  const { gameId } = useParams<{ gameId: string }>(); 
  const { rows, loading, state, error } = useView<ListPagesViewRow, HtmlPageDoc>("pages/list-pages", {descending: true}); 

  if (state === 'error') {
    console.log(`Err in ManageHtmlPages, ${JSON.stringify(error)}`);
    return (
      <HeaderPage title="Manage Pages" contentMessage={"Error: " + error?.message} retryButton={true} />
    )
  }

  if (loading || !rows) {
    return (<HeaderPage title={"Manage Pages"} contentMessage="Loading..." />)
  }

  // TODO: implement here and on server
  function deletePage(pageId: string) {
    console.log("DeletePage not implemented");
  }

  return ( 
    <HeaderPage title={"Manage Pages"}>
      <IonContent fullscreen>
        <NeedPermissions permissions={"GameAdmin"}>

          <IonList>

            <IonListHeader>
              <IonLabel>
                <h1>Pages</h1>
                <h2>Add, edit, or remove pages with custom markup. These pages are intended for general game information (eg mechanics, notation, etc).
                    <br />The Front Page is what users first see when selecting the game from the main menu.
            
                    <br />To add a character, click <IonRouterLink routerLink={util.getAddCharacterUrl(gameId)}>here</IonRouterLink>.
                </h2>
              </IonLabel>
            </IonListHeader>

            {rows.map((row) => {
              const pageId = row.key;
              const title = row.value;
              const isFrontPage = pageId === CompileConstants.GAME_FRONTPAGE_PAGE_ID; 

              return (
                <IonItem key={pageId} >
                {/*<IonItem key={name} button onClick={() => console.log(`Uhh uu clicked ${name}`)} >*/}
                  <IonRouterLink routerLink={util.getEditHtmlPageUrl(gameId, pageId)}><IonLabel>{title}</IonLabel></IonRouterLink>
                  {!isFrontPage &&
                    <IonButton slot="end" color="danger" onClick={() => deletePage(pageId)} >
                      <IonIcon icon={remove} />
                    </IonButton>
                  }
                </IonItem>
              );
            })}


            <IonItem key="_add-name" routerLink={util.getAddHtmlPageUrl(gameId)} >
              <IonLabel>Add Page</IonLabel>
              <IonIcon slot="start" color="success" icon={add} />
            </IonItem>

          </IonList>

        </NeedPermissions>
      </IonContent>
    </HeaderPage>
  )
}

export default ManageHtmlPages;
