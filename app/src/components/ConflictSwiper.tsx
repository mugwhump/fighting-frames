
import { IonRow, IonItemSliding, IonItemOptions, IonItemOption, IonCol, IonItem, IonIcon } from '@ionic/react';
import React, { useState, useEffect } from 'react';
import { createOutline } from 'ionicons/icons';
import { MoveCols, PropCols, Cols, Conflicts, Conflict, ColumnChange, DataType, ColumnDef, ColumnDefs, ColumnDefAndData } from '../types/characterTypes';
import { keys, keyVals, getNewFromChange, getOldFromChange } from '../services/util';
import { getDefsAndData } from '../services/renderUtil';
import { getChangedCols } from '../services/merging';
import { useCharacterDispatch } from '../services/CharacterReducer';
import MoveEditModal from './MoveEditModal';
import styles from '../theme/Character.module.css';
import '../theme/ConflictSwiper.css';
import DataRenderer from './DataRenderer';

export type ConflictSwiperProps = {
  defData: ColumnDefAndData, 
  moveName: string, 
  conflict: Conflict,
  //skipSwiper?: boolean, //used for columns of all-or-nothing conflicts that don't have their own swiper
}
const ConflictSwiper: React.FC<ConflictSwiperProps> = ({defData, moveName, conflict}) => {
  const characterDispatch = useCharacterDispatch();
  const columnName: string = defData.columnName;
  const isMoveNameConflict = defData.columnName === "moveName";
  const isMoveOrderConflict = defData.columnName === "moveOrder";

  //TODO: test all-or-nothing more
  /* 
     If there's a movename conflict, it's all-or-nothing. 
        Rebase movename: you delete they noop = you deleted move base modified
                         you add they noop = you modified move base deleted (stealth add) - WORKS
        Merge movename:  you delete they noop = you delete move they modified - WORKS
                         you noop they delete = you modified move they deleted - WORKS
                         you noop they add = they add move
     Conflicts in rebase: theirs == noop. In a redundant change, yours is also no-op.
     In merge, all of their changes make conflicts. If yours is no-op, should come autoresolved.
  */

  if(!(conflict.yours==="no-op" && conflict.theirs==="no-op")) {
    let baseVal = (conflict.yours !== "no-op") ? getOldFromChange(conflict.yours) : getOldFromChange(conflict.theirs as ColumnChange);
    let centerStyles = defData.cssClasses.join(" ") + " swiper-item";
    let centerElement = <span>"Conflict!"</span>;
    let yourVal = (conflict.yours !== "no-op") ? getNewFromChange(conflict.yours) : baseVal;
    let yourElement = <DataRenderer defData={{...defData, data: yourVal}} />;
    let theirVal = (conflict.theirs !== "no-op") ? getNewFromChange(conflict.theirs) : baseVal;
    let theirElement = <DataRenderer defData={{...defData, data: theirVal}} />;

    if(isMoveNameConflict) {
      centerElement = <span>"Conflicting move deletion, swipe to keep or delete"</span> ;
      if(conflict.yours !== "no-op" && conflict.yours.type === "delete") {
        yourElement = <span>Delete</span>;
        theirElement = <span>Keep</span>;
      }
      else if(conflict.theirs !== "no-op" && conflict.theirs.type === "add") {
        yourElement = <span>Don't Add</span>;
        theirElement = <span>Add</span>;
      }
      else {
        yourElement = <span>Keep</span>;
        theirElement = <span>Delete</span>;
      }
    }
    if(isMoveOrderConflict) {
      centerElement = <span>"Conflicting move order, swipe for yours or theirs"</span>;
      yourElement = <span>Your Order</span>;
      theirElement = <span>Their Order</span>;
    }

    //TODO: ionic's swiper covers up this background color with white
    let centerOption = !conflict.resolution ?  
      <IonItem className={centerStyles}>{centerElement}</IonItem>
      : (conflict.resolution === "yours" ?
         <IonItem className={centerStyles}>{yourElement}</IonItem>
         : <IonItem className={centerStyles}>{theirElement}</IonItem>
        )

    let yoursLeft = (conflict.resolution === "yours") ?
      null
      : <IonItemOptions onIonSwipe={()=>characterDispatch({actionType:"resolveColumn", moveName: moveName, columnName: columnName, resolution: "yours"})} side="start">
          <IonItemOption className={styles.resolvedYours} expandable>{yourElement}</IonItemOption>
        </IonItemOptions>

    let theirsRight = (conflict.resolution === "theirs") ?
      null
      : <IonItemOptions onIonSwipe={()=>characterDispatch({actionType:"resolveColumn", moveName: moveName, columnName: columnName, resolution: "theirs"})} side="end">
          <IonItemOption className={styles.resolvedTheirs} expandable>{theirElement}</IonItemOption>
        </IonItemOptions>
       
    if(!conflict.resolution) {
      return ( //need key so React doesn't see an IonItemSliding in the same place and beef the re-rendering
        <IonItemSliding key="unresolved">
          {yoursLeft}
          {centerOption}
          {theirsRight}
        </IonItemSliding>
      );
    }
    else if(conflict.resolution === "yours") {
      return (
        <IonItemSliding key="yours">
          {centerOption}
          {theirsRight}
        </IonItemSliding>
      );
    }
    else if(conflict.resolution === "theirs") {
      return (
        <IonItemSliding key="theirs">
          {yoursLeft}
          {centerOption}
        </IonItemSliding>
      );
    }
  }
  return null; //if no conflict or redundant change autoresolve
}
export default ConflictSwiper;
