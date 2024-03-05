import React, { useEffect, useState, useCallback, useRef } from 'react';
import { IonContent, IonFooter, IonToolbar, IonRow, IonList, IonListHeader, IonNote, IonItem, IonIcon, IonLabel, IonInput, IonButton, IonRouterLink } from '@ionic/react';
import { add, remove } from 'ionicons/icons';
import { useView } from 'use-pouchdb'
import { useParams, useHistory } from 'react-router';
import type { ListPagesViewRow } from '../types/utilTypes'; //==
import CompileConstants from '../constants/CompileConstants';
import * as util from '../services/util';
import * as myPouch from '../services/pouch';
import { useMyAlert, useMyToast, useLoadingPromise } from '../services/hooks';
import HeaderPage from '../components/HeaderPage';
import NeedPermissions from '../components/NeedPermissions';
import { HtmlPageDoc } from '../types/characterTypes'; //==



type ManageHtmlPagesProps = {
}
export const ManageHtmlPages = ({}: ManageHtmlPagesProps) => {
  const { gameId } = useParams<{ gameId: string }>(); 
  const { rows, loading, state, error } = useView<ListPagesViewRow, HtmlPageDoc>("pages/list-pages", {descending: true}); 
  const [presentMyToast, ] = useMyToast(); 
  const [presentMyAlert, dismissAlert] = useMyAlert(); 
  const [loadingPromiseWrapper, ] = useLoadingPromise(); 

  if (state === 'error') {
    console.log(`Err in ManageHtmlPages, ${JSON.stringify(error)}`);
    return (
      <HeaderPage title="Manage Pages" contentMessage={"Error: " + error?.message} retryButton={true} />
    )
  }

  if (loading || !rows) {
    return (<HeaderPage title={"Manage Pages"} contentMessage="Loading..." />)
  }

  function promptDelete(pageId: string) {
    presentMyAlert(`Are you sure you want to delete the page ${pageId}? This is a PERMANENT action and cannot be undone.`, 
      [ {text: 'Cancel', role: 'cancel'},
        {text: 'Delete', role: 'destructive', handler: () => {dismissAlert().then(() => deletePage(pageId)); } },
      ]);
  }

  function deletePage(pageId: string) {
    const [url, method] = util.getApiDeleteHtmlPageUrl(gameId, pageId);

    loadingPromiseWrapper(
        myPouch.makeApiCall(url, method).then((resp) => {
          presentMyToast('Page deleted', 'success');
        }).catch((err) => {
          console.log(`Error deleting page, ${JSON.stringify(err)}`);
          presentMyToast(err.message, 'danger');
        })
    , {message: 'Deleting page...', duration: 10000});
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
                  <IonRouterLink routerLink={util.getEditHtmlPageUrl(gameId, pageId)}><IonLabel>{title}</IonLabel></IonRouterLink>
                  {!isFrontPage &&
                    <IonButton slot="end" color="danger" onClick={() => promptDelete(pageId)} >
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
