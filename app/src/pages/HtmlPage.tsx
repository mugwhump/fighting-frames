import React, { useMemo } from 'react';
import { IonContent } from '@ionic/react';
import { useDoc } from 'use-pouchdb'
import { useParams } from 'react-router';
import sanitizeHTML from 'sanitize-html';
import { sanitizeOptions } from '../constants/validHtml';
import * as util from '../services/util';
import HeaderPage from '../components/HeaderPage';
import { HtmlPageDoc } from '../types/characterTypes'; //==



// Renderer is used to render pages, and also preview them during editing
// TODO: allow users to insert template elements which are parsed to react components with html-to-react
type HtmlPageRendererProps = {
  doc: HtmlPageDoc;
}
export const HtmlPageRenderer = ({doc}: HtmlPageRendererProps) => {
  const cleanHtml = useMemo(() => {
    let dirty = '<div>' + doc.html + '</div>'; 
    return sanitizeHTML(dirty, sanitizeOptions); 
  }, [doc]);

  return ( 
    <div className="htmlContainer" dangerouslySetInnerHTML={{__html: cleanHtml}} />
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

