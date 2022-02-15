import { IonRouterLink, IonLabel, IonButton, IonSegment, IonSegmentButton, IonFooter, IonToolbar, IonContent, IonItem, useIonViewDidEnter, IonGrid, IonRow } from '@ionic/react';
import React, { useState, useEffect }from 'react';
import { SegmentChangeEventDetail } from '@ionic/core';
import { useParams, useHistory, useLocation } from 'react-router';
import { Action } from 'history';
import { Link } from 'react-router-dom';
import { useDoc } from 'use-pouchdb';
import {Move, ColumnDef, UniversalPropDef, CharDoc, UniversalPropData } from '../types/characterTypes';
import MoveComponent from './MoveComponent';

//Have child move components that are passed properties.
//Shows universal character properties (health, backdash, speed, etc) at top.
//When editing activated, bring up a modal that lists column vals one by one
//If there's key needed for editing, prompt for it before bringing up interface
type CharProps = {
  gameId: string,
  columns: ColumnDef[],
  universalProps: UniversalPropDef[],
}

export const Character: React.FC<CharProps> = ({gameId, columns, universalProps}) => {
  const { character } = useParams<{ character: string; }>(); //router has its own props
  const { doc, loading, state, error } = useDoc<CharDoc>('character/'+character); 
  const baseUrl = "/game/"+gameId+"/character/"+character;
  const [segmentValue, setSegmentValue] = useState<string>(baseUrl);
  const location: string = useLocation().pathname;
  const history = useHistory();

  useIonViewDidEnter(() => {
    //console.log('ion view did enter event fired in character character/'+character);
  });

  //useEffect(()=> {
    //setSegmentValue(location);
  //}, [location]);
    useEffect(() => {
        // clear alert on location change
        const unlisten = history.listen((thing, thing2) => {
          
          console.log("Navigating, History changed: " + JSON.stringify(thing) + ", thing2: " + thing2);
        });

        // stop the listener when component unmounts
        return unlisten;

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

  interface SegmentCustomEvent<T> extends CustomEvent {
    target: HTMLIonSegmentElement;
    detail: SegmentChangeEventDetail;
  }
  function changeSegment(event: CustomEvent<SegmentChangeEventDetail>) {
  //function changeSegment(event: SegmentCustomEvent<SegmentChangeEventDetail>) {
    event.preventDefault();
    event.stopPropagation();
    let url = event?.detail?.value || '';
    if(url !== location && url !== segmentValue) {
      console.log("Navigating to " + url + " from " + location + " old segment value="+segmentValue+", last action = " + history.action);
      setSegmentValue(url);
      history.push(url);
    }
  }
 
  if (state === 'error') {
    console.error("heckin errorino in Character: " + error?.message);
    return (<span>heckin errorino: {error?.message}</span>);
  }
  if (loading && doc == null) {
    return (<h1> loadin</h1>);
  }
  return (
    <>
    <IonContent fullscreen>
      <IonGrid>
        <IonRow>
          <IonItem>
            <p>{doc!.charName} is the character (DB)</p><br />
            <p>{JSON.stringify(doc)}</p>
          </IonItem>
        </IonRow>
        {doc!.universalProps.map((prop: UniversalPropData) => {
          const keys = Object.keys(prop);
          return (
            <div key={prop.propName}>{prop.propName}: {prop.data}</div>
          )
        })}
        {doc!.moves.map((move: Move) => (
          <MoveComponent key={move.moveName} move={move} columns={columns} />
        ))}
      </IonGrid>
    </IonContent>

    <IonFooter>
      <IonToolbar>
        <IonSegment onIonChange={changeSegment} value={location}>
        {/*<IonSegment onIonChange={changeSegment}>*/}
        {/*<IonSegment>*/}
        {/*<Link to={baseUrl}>*/}
          <IonSegmentButton value={baseUrl}>
            <IonLabel>Default</IonLabel>
          </IonSegmentButton>
          {/*</Link>*/}
        {/*<Link to={baseUrl+"/local-edit"}>*/}
          <IonSegmentButton value={baseUrl+"/local-edit"}>
            <IonLabel>Edit</IonLabel>
          </IonSegmentButton>
          {/*</Link>*/}
        {/*<Link to={baseUrl+"/versions"}>*/}
          <IonSegmentButton value={baseUrl+"/versions"}>
            <IonLabel>Versions</IonLabel>
          </IonSegmentButton>
          {/*</Link>*/}
        </IonSegment>
      </IonToolbar>
    </IonFooter>
    </>
  );
};

//export default Character;
