import { useIonModal, useIonAlert, IonPopover, IonIcon, IonFab, IonFabButton, IonLabel, IonList, IonButton, IonSegment, IonSegmentButton, IonFooter, IonToolbar, IonContent, IonItem, IonGrid, IonRow } from '@ionic/react';
import React, { useRef, useState, useEffect, MouseEvent }from 'react';
import { useView } from 'use-pouchdb'

type ChangeBrowserProps = {
}

export const ChangeBrowser: React.FC<ChangeBrowserProps> = ({}) => {
  const { rows, loading, state, error } = useView("changes/list-changes"); 

  useEffect(() => {
    console.log(`Dem rows: ${JSON.stringify(rows)}`);
  },[rows]);

  if (state === 'error') {
    return (<div>Error loading change list: {error?.message}</div>);
  }
  // loading is true even after the doc loads
  else if (loading && rows.length === 0) {
    return (<h1>Loading...</h1>);
  }

  return (
    <IonGrid>
    hewwo
      {rows.map((row: any) => {
        return (
          <IonRow>
            <IonItem>{row.id.split('/')[7]}</IonItem>
            <IonItem>{row.value}</IonItem>
          </IonRow>
        );
      })}
    </IonGrid>
  );
}

export default ChangeBrowser;
