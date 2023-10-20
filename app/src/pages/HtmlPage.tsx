import React, { useEffect, useState, useCallback, useRef } from 'react';
import { IonContent, IonFooter, IonToolbar, IonRow, IonList, IonListHeader, IonNote, IonItem, IonIcon, IonLabel, IonInput, IonButton } from '@ionic/react';
import { useDoc } from 'use-pouchdb'
import { useParams, useHistory } from 'react-router';
import sanitizeHTML from 'sanitize-html';
import { DiffDOM, stringToObj } from "diff-dom";
import { sanitizeOptions } from '../constants/validHtml';
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
  //TODO: memoize
  //TODO: regex to remove the space after colon in style items of the dirty html, since sanitizer does that and I can't stop it. Might need to replace &nbsp; in empty elements too
  let dirty = '<div>' + doc.html + '</div>'; 
  ////let dirty = doc.html + '<script src="Imbad" />'; //FAIL
  //let dirty = '<p><script src="Imbad" /></p>'; //WORKS
  //let dirty = doc.html.replace(/(?<=style=".+?[\:;])(\s)(?=.+?")/, '');
  //dirty = dirty.replace(/(?<=style=".+)(;")/, '"');
  const cleanHtml = sanitizeHTML(dirty, sanitizeOptions); 
  const dirtyObj = stringToObj(dirty);
  const cleanObj = stringToObj(cleanHtml);
  const diffDom = new DiffDOM();
  const diffs = diffDom.diff(dirtyObj, cleanObj);
  for(const diff of diffs) {
    console.log("diff: ", diff);
  }
  console.log("ALL diffs: ", diffs);
  console.groupCollapsed("Dirty html");
  console.log(dirty);
  console.groupEnd();
  console.groupCollapsed("Clean html");
  console.log(cleanHtml);
  console.groupEnd();
  //const differenceIndex = [...dirty].findIndex((char, index) => char !== cleanHtml[index]);
  //if(differenceIndex !== -1) {
    //console.log(`HTML was cleaned @ ${differenceIndex}. \n` + 
                 //`%cDirty substring: ${dirty.substr(Math.max(0, differenceIndex - 10))}... \n Clean substring: ${cleanHtml.substr(Math.max(0, differenceIndex - 10))}...`,
                  //"background-color: yellow");
  //}


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

