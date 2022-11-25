import { useIonModal, useIonAlert, IonPopover, IonIcon, IonFab, IonFabButton, IonLabel, IonList, IonButton, IonSegment, IonSegmentButton, IonFooter, IonToolbar, IonContent, IonItem, IonGrid, IonRow } from '@ionic/react';
import React, { useEffect, useMemo } from 'react';
import { warningOutline } from 'ionicons/icons';
import { State, useCharacterDispatch, useTrackedCharacterState, EditAction } from '../services/CharacterReducer';
import { getEditingResolutionMoveOrder } from '../services/renderUtil';
import {MoveOrder, ColumnDef, ColumnDefs, ColumnData, Cols, PropCols, MoveCols, CharDoc, ChangeDoc } from '../types/characterTypes';
import ColumnHeaders from './ColumnHeaders';
import MoveOrUniversalProps from './MoveOrUniversalProps';
import { CategoryAndChildRenderer } from './CategoryAndChildRenderer';
import styles from '../theme/Character.module.css';

type CharacterRendererProps = {
  children?: React.ReactNode,
  charDoc: CharDoc,
  columnDefs: ColumnDefs,
  universalPropDefs: ColumnDefs,
  changes?: ChangeDoc,
  editingEnabled?: boolean,
  highlightChanges?: boolean,
  highlightConflicts?: boolean,
  filterSortEnabled?: boolean,
}

/**
Render character's data with options for editing, change highlighting, conflict display, and sorting/filtering
*/
export const CharacterRenderer: React.FC<CharacterRendererProps> = ({children, charDoc, columnDefs, universalPropDefs, editingEnabled, highlightChanges, highlightConflicts, filterSortEnabled, changes}) => {
  //const state = useTrackedCharacterState();
  const baseDoc = changes?.rebaseSource || changes?.mergeSource || charDoc; //in case new charDoc was loaded while conflicts unresolved
  const dispatch = useCharacterDispatch();
  // Get moveOrder that also shows changed or conflicting moves, and whichever order is preferred in a direct ordering conflict
  const moveOrder = useMemo<MoveOrder[]>(() => changes ? getEditingResolutionMoveOrder(baseDoc, changes) : baseDoc.universalProps.moveOrder, [baseDoc, changes]);
  const hasConflicts = !!changes?.conflictList; //Editing disabled until conflicts resolved and resolutions applied
  let cssClasses: string[] = [styles.characterRenderer];
  if (highlightChanges) cssClasses.push(styles.highlightChanges);
  if (highlightConflicts) cssClasses.push(styles.highlightConflicts);

  useEffect(() => {
    console.log("Changes updated!");
  }, [changes]);

  return (
    <IonGrid className={cssClasses.join(" ")}>
      <IonItem>
        <p>{baseDoc.charName} is the character (DB)</p><br />
        <p>{JSON.stringify(baseDoc)}</p>
      </IonItem>
      {children}
        <MoveOrUniversalProps moveName="universalProps" columns={baseDoc.universalProps} columnDefs={universalPropDefs} editMove={!!editingEnabled && !hasConflicts}
         changes={changes?.universalPropChanges} moveConflictsToHighlight={highlightConflicts ? changes?.conflictList?.universalProps : undefined} />
        <ColumnHeaders columnDefs={columnDefs} />
        {moveOrder.map((moveOrCat: MoveOrder) => {
          const {name, isCategory, indent} = {...moveOrCat};
          let moveCols = baseDoc.moves[name];
          let moveChanges = changes?.moveChanges?.[name];
          let moveConflicts = changes?.conflictList?.[name];
          let showMove = moveCols || moveChanges || moveConflicts; 
          return (
            <CategoryAndChildRenderer key={name} name={name} isCategory={isCategory} >
            {showMove
              ? <MoveOrUniversalProps moveName={name} indentLevel={indent} columns={moveCols} columnDefs={columnDefs} 
                 editMove={!!editingEnabled && !hasConflicts} changes={moveChanges} moveConflictsToHighlight={highlightConflicts ? moveConflicts : undefined} />
              : <div>No data for move {name}</div>
            }
            </CategoryAndChildRenderer> 
          );
        })}
    </IonGrid>
  );
};

export default CharacterRenderer;
