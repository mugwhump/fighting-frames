import React from 'react';
import { IonContent } from '@ionic/react';
import { State, useCharacterDispatch, useTrackedCharacterState, EditAction } from '../services/CharacterReducer';
import * as T from '../types/characterTypes';
import CharacterRenderer from '../components/CharacterRenderer';
import HeaderPage from '../components/HeaderPage';


// Default view of a character. This is the one that has filtering, searching, and sorting.
type CharProps = {
  columnDefs: T.ColumnDefs,
  universalPropDefs: T.ColumnDefs,
}

export const Character: React.FC<CharProps> = ({columnDefs, universalPropDefs}) => {
  const state = useTrackedCharacterState();
  const charDoc = state.charDoc;
  //const moveOrder: MoveOrder[] = charDoc?.universalProps?.moveOrder || [];

  return (
    <HeaderPage title={state.characterDisplayName}>
      <IonContent fullscreen>
        <CharacterRenderer charDoc={charDoc} columnDefs={columnDefs} universalPropDefs={universalPropDefs} />
      </IonContent>
    </HeaderPage>
  )

};

export default Character;
