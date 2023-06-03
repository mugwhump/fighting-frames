import React, { useEffect, useState, useCallback, useRef } from 'react';
import { IonContent, IonFooter, IonToolbar, IonRow, IonList, IonListHeader, IonNote, IonItem, IonIcon, IonLabel, IonInput, IonButton } from '@ionic/react';
import { useDoc } from 'use-pouchdb'
import { useParams, useHistory } from 'react-router';
import sanitizeHTML from 'sanitize-html';
import * as util from '../services/util';
import HeaderPage from '../components/HeaderPage';
import NeedPermissions from '../components/NeedPermissions';
import { HtmlPageDoc } from '../types/characterTypes'; //==



// Renderer is used to render pages, and also preview them during editing
// TODO: allow users to insert template elements which are parsed to react components with html-to-react
type HtmlPageRendererProps = {
  doc: HtmlPageDoc;
}
export const HtmlPageRenderer = ({doc}: HtmlPageRendererProps) => {
  const html = doc.html; //TODO: use sanitize-html
  return ( 
    <div className="htmlContainer" dangerouslySetInnerHTML={{__html: html}} />
  )
}


type HtmlPageProps = {
}
export const HtmlPage = ({}: HtmlPageProps) => {
  const { gameId, pageId } = useParams<{ gameId: string, pageId: string; }>(); 
  const { doc, loading, state, error } = useDoc<HtmlPageDoc>(util.getHtmlPageDocId(pageId)); 

  if (state === 'error') {
    console.log(`Err in HtmlPage, ${JSON.stringify(error)}\``);
    return (
      <HeaderPage title="Page missing" contentMessage={"Error: " + error?.message} retryButton={true} />
    )
  }

  if (loading || !doc) {
    return (<HeaderPage title={"Loading "+pageId} contentMessage="Loading..." />)
  }

  return (
    <HeaderPage title={doc.title}>
      <IonContent fullscreen>
        <HtmlPageRenderer doc={doc} />
      </IonContent>
    </HeaderPage>
  );
}

