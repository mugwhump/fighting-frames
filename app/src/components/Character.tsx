import React from 'react';
import { State, useCharacterDispatch, useTrackedCharacterState, EditAction } from '../services/CharacterReducer';
import {MoveOrder, ColumnDef, ColumnDefs, CharDoc } from '../types/characterTypes';
import CharacterRenderer from './CharacterRenderer';
// ---------------- TESTING STUFF --------------------

//Have child move components that are passed properties.
//Shows universal character properties (health, backdash, speed, etc) at top.
//When editing activated, bring up a modal that lists column vals one by one
type CharProps = {
  columnDefs: ColumnDefs,
  universalPropDefs: ColumnDefs,
}


export const Character: React.FC<CharProps> = ({columnDefs, universalPropDefs}) => {
  const state = useTrackedCharacterState();
  const charDoc = state.charDoc;
  //const moveOrder: MoveOrder[] = charDoc?.universalProps?.moveOrder || [];

  return (
    <CharacterRenderer charDoc={charDoc} columnDefs={columnDefs} universalPropDefs={universalPropDefs} />
  )

  //const remoteDatabase: PouchDB.Database = usePouch('remote');  //TODO: JUST FOR TESTING

  //async function getSession() {
    //let user = await remoteDatabase.getSession();
    //console.log("Session = " + JSON.stringify(user));
    //let SLuser = await myPouch.superlogin.getSession();
    //let authenticated = myPouch.superlogin.authenticated();
    //console.log(`Authed = ${authenticated}, `+"SL Session = " + JSON.stringify(SLuser));
    ////try {
      ////let validSession = await myPouch.superlogin.validateSession(); //makes http call to validate
      ////console.log(`valid = ${JSON.stringify(validSession)}`);
    ////}
    ////catch(err) {
      ////console.log(`Error validating : ${JSON.stringify(err)}`);
    ////}
  //}
  //async function makeRequest() {
    //let db = myPouch.getDB(myPouch.remote+'samsho');
    //db.get('character/talim');

    //console.log("Requesting via fetch");
    //const url = myPouch.remote+`sc6/character/voldo`;
    //const response = fetch(url, {
      //method: 'GET',
      //mode: 'cors',
      //headers: {
        //'Content-Type': 'application/json',
        //'Authorization': 'Basic ' + token
      //},
      //body: JSON.stringify(body),
    //});
    //let fetchPromise = myPouch.makeRequest(name, 'admin', 'password', "GET");
    //fetchPromise.then((response) => {
      //if (!response.ok) {
        //throw new Error(`HTTP error! Status: ${response.status}`);
      //}
      //return response.json();
    //})
    //.then((data) => {
      //console.log("Returned data = " + JSON.stringify(data));
    //}).catch((err) => {
      //console.log("YA BEEFED IT KID" + err);
    //});
  //}
  //useEffect(()=> {
    //console.log("Val1 listener renderino");
  //}, [state.testVal]);
  //useEffect(()=> {
    //console.log("Val2 listener renderino");
  //}, [state.testVal2]);
  //return (
    //<IonGrid>
      //<IonRow>
        //<IonItem>
          //<p>{charDoc.charName} is the character (DB)</p><br />
          //<p>{JSON.stringify(charDoc)}</p>
        //</IonItem>
        //[><IonItem><IonButton onClick={()=>dispatch({actionType:'testVal1'})} >Inc val1: {state.testVal}</IonButton></IonItem><]
        //[><IonItem><IonButton onClick={()=>dispatch({actionType:'testVal2'})} >Inc val2</IonButton></IonItem><]
        //<IonItem><IonButton onClick={getSession} >Check Sessions</IonButton></IonItem>
        //<IonItem><IonButton onClick={makeRequest}>Make Request</IonButton></IonItem>
      //</IonRow>
        //<MoveOrUniversalProps moveName="universalProps" columns={charDoc.universalProps} columnDefs={universalPropDefs} editMove={false}/>
        //{moveOrder.map((moveOrCat: MoveOrder) => {
          //const {name, isCategory, indent} = {...moveOrCat};
          //let moveCols = charDoc.moves[name];
          ////console.log("rendering moveorcat:"+JSON.stringify(moveOrCat)+", cols:"+JSON.stringify(moveCols));
          //return (
            //<CategoryAndChildRenderer key={name} name={name} isCategory={isCategory} >
            //{moveCols !== undefined
              //? <MoveOrUniversalProps moveName={name} indentLevel={indent} columns={moveCols} columnDefs={columnDefs} editMove={false}/>
              //: <div>No data for move {name}</div>
            //}
            //</CategoryAndChildRenderer> 
          //);
        //})}
    //</IonGrid>
  //);
};

export default Character;
