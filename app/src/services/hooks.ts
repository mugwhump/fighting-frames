import React, { useMemo, useCallback, useEffect } from 'react';
import { useIonToast, useIonAlert, useIonLoading, IonicSafeString } from '@ionic/react';
import { ToastOptions } from '@ionic/core/components';
import { closeCircleOutline, checkmark, informationCircle, warning } from 'ionicons/icons';
import { useLocation } from 'react-router-dom';
import { useAllDocs, ResultType, useDoc } from 'use-pouchdb';
import * as T from '../types/characterTypes';
import * as util from '../services/util';
import { reduceChangeDocs, invertChangeDoc } from '../services/merging';
import { cloneDeep } from 'lodash';

/**
 * Usage: const query = useQuery(); queryParam = query.get("param-name");
 */
export function useQuery() {
  const { search } = useLocation();

  return useMemo(() => new URLSearchParams(search), [search]);
}


export function useMyToast() {
  const [presentToast, dismissToast] = useIonToast(); 

  const enhancedPresentToast = useCallback((message: string | IonicSafeString, style?: 'success' | 'warning' | 'danger', duration?: number, options?: ToastOptions) => {
    //dynamically calculate duration based on message length
    if(!duration) {
      if(typeof message === 'object') {
        duration =  6000;
      }
      else {
        const wordcount = message.split(' ').length;
        duration = 1200 + wordcount * (60 / 150) * 1000; // based on generous reading speed of 150wpm
        duration = Math.max(2000, Math.min(10000, duration)); // clamp between 2-10s
        console.log(`Calculated toast duration of ${duration} for text ${message}`);
      }
    }
    const styleIcons = {'success': checkmark, 'warning': informationCircle, 'danger': warning};
    return presentToast({
      message: message,
      duration: duration,
      cssClass: 'my-toast',
      color: style,
      icon: (style && styleIcons[style]),
      buttons: [{icon: closeCircleOutline, role: 'cancel'}],
      ...options,
    });
  }, [presentToast]);

  return [enhancedPresentToast, dismissToast];
}


// Same as Ionic's, except this one dismisses when navigating away
export function useMyAlert(): ReturnType<typeof useIonAlert> {
  const [presentAlert, dismissAlert] = useIonAlert();
  useEffect(() => {
    return () => {
      dismissAlert();
    }
  }, [dismissAlert]); //not actually sure this is a stable reference... at least, the linter complains.

  return [presentAlert, dismissAlert];
}


// Displays loading overlay while given promise chain executes; dismisses overlay when it concludes or navigate away from page.
// Ex usage: loadingPromiseWrapper(makeApiCall(ble).then((res) => ble).catch((e) => ble), {message:"Doing API call...", duration:10000});
// Or: loadingPromiseWrapper( (async function () { try { await ble } catch (e) { ble } })(), {message:"Doing API call...", duration:10000});
//TODO: a dialogue prompt if user navigates before resolution? react-router's Prompt has no hook. Could try https://github.com/jacobbuck/react-beforeunload
export function useLoadingPromise() {
  const [presentLoading, dismissLoading] = useIonLoading(); 

  const loadingPromiseWrapper = useCallback((promise: Promise<void>, ...args: Parameters<typeof presentLoading>) => {
    presentLoading(...args);
    return promise.finally(() => {
      dismissLoading();
    });
  }, [presentLoading, dismissLoading]);

  useEffect(() => { //dismiss upon navigation
    return () => {
      dismissLoading();
    }
  }, [dismissLoading]); 

  return [loadingPromiseWrapper, dismissLoading];
}


// Fetch a single changeDoc like use-pouchdb's useDoc hook using the given title.
// If changeHistory (an array of change titles) is provided, returns a changeDoc that reverts all changes since (and including) the one indicated by given changeTitle
export function useChangeDocOrReversion(changeTitle: string, characterId: string, changeHistory?: string[]): ResultType<{ doc: T.ChangeDocWithMeta | null }> {
  const revert = !!changeHistory;
  const docIds: string[] = (revert) 
    ? util.getDocIdsOfChangesAfter(changeTitle, characterId, changeHistory)
    : [util.getChangeId(characterId, changeTitle)];
  // If swapping between reverting or not reverting only 1 change, this doesn't re-fetch
  const { rows, loading, state, error } = useAllDocs<T.ChangeDocWithMeta>({include_docs: true, keys: docIds});
  

  const resultDoc: T.ChangeDocWithMeta | null = useMemo<T.ChangeDocWithMeta | null>(() => {
    //If swapping when there's 2+ changes, setting revert=true happens before loading/state even update, 
    //and memo re-calcs a useless inverted first doc unless I make sure # rows matches the request

    if(rows.length === docIds.length && !loading) { //rows is empty array during 1st fetch or error
      if(revert) {
        let changeDocs = rows.map((row) => row.doc!);
        // reduce and invert mutate, so copy first element
        changeDocs[0] = cloneDeep<T.ChangeDocWithMeta>(changeDocs[0]);
        const combinedChangeDoc = changeDocs.reduce(reduceChangeDocs);
        invertChangeDoc(combinedChangeDoc, true);

        return combinedChangeDoc;
      }
      else {
        return rows[0].doc!;
      }
    }

    return null;
  }, [rows, loading, docIds.length, revert]);

  return {doc: resultDoc, loading, state, error};
}
