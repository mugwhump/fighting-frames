import { useIonModal, useIonAlert, IonContent, IonList, IonItem, IonHeader, IonToolbar, IonTitle, IonFooter, IonButton, IonIcon, IonLabel, IonNote, IonItemSliding, IonItemOptions, IonItemOption, IonReorder, IonReorderGroup, IonRow } from '@ionic/react';
import { ItemReorderEventDetail } from '@ionic/core';
import { swapVerticalOutline, swapVerticalSharp, chevronForward, chevronBack, trash } from 'ionicons/icons';
//delete these 2
import React, { useState, useEffect, useRef } from 'react';
import { DefGroup, groupList, ConfigDoc, ColumnDefs, ColumnDef, ColumnData, DataType } from '../types/characterTypes';
import { groupDescriptions, predefinedWidths, specialDefs } from '../constants/internalColumns';
import { ConfigDocChanges } from '../pages/DefEditor';  
import { keys } from '../services/util';
import { cloneDeep, isEqual, set } from 'lodash';
import { HelpPopup } from './HelpPopup';
import characterStyles from '../theme/Character.module.css';
import styles from '../theme/DefEditor.module.css';


type DefOrdererProps  = {
  doc: Readonly<ConfigDoc>; //current working definitions in proper order
  docChanges: Readonly<ConfigDocChanges>;
  isUniversalProps: boolean;
  changeDefOrder : (changes: ConfigDocChanges)=>void; //must return changed definitions in case of group changes
  dismissModalCallback: ()=>void;
}

// One instance of this for universal props, one for columns
const DefOrdererModal: React.FC<DefOrdererProps > = ({doc, docChanges, changeDefOrder, isUniversalProps, dismissModalCallback}) => {
  //const [changes, setChanges] = useState<DesignDocChanges>(()n> cloneDeep<DesignDocChanges>(originalChanges));
  const path = isUniversalProps ? "universalPropDefs" : "columnDefs";
  const movedItems = useRef<Set<string>>(new Set());
  const [order, setOrder] = useState<string[]>(getInitialOrder); //includes groups, prefixed by 'group:'
  const [presentAlert, dismiss] = useIonAlert();

  function wasDeleted(key: string): boolean {
    return !!docChanges.deletedDefs?.[path]?.includes(key);
  }

  function getInitialOrder(): string[] {
    const ord: Readonly<string[]> = docChanges.changedOrders?.[path] || keys(doc[path]);
    let result: string[] = [];

    // Loop over groups to ensure they're all present and defs are properly ordered
    let nextItemIndex = 0;
    for(let group of groupList) {
      result.push(`group:${group}`);
      for(let item of ord) {
        const def: ColumnDef | undefined = docChanges?.[path]?.[item] ?? doc[path][item];
        if(!def) throw new Error("Cannot find definition for "+item);
        if(def.group === group) {
          if(ord[nextItemIndex] !== item) {
            console.warn(`item ${item} in group ${group} is out of order`);
            movedItems.current.add(item); //everything between the misplaced item and where it's moved to will be considered misplaced
          }
          result.push(item);
          nextItemIndex++;
        }
      }
    }

    return result;
  }

  function doReorder(event: CustomEvent<ItemReorderEventDetail>) {
    console.log(JSON.stringify(event));
    const {from: fromIndex, to: toIndex, complete} = {...event.detail};
    const itemKey = order[fromIndex];
    // Do not allow groups to be dragged, or for an item to be dragged to the top (making it groupless)
    if(itemKey.startsWith(`group:`) || toIndex === 0 || wasDeleted(itemKey)) {
      complete(false);
      return;
    }
    //Will check if they tried to move mandatory defs out of their group during submission. They can be reordered, just not to a different group.

    movedItems.current.add(itemKey);
    let newOrder = [...order];
    complete(newOrder);
    
    console.log("items now " + JSON.stringify(newOrder) + ". movedItems = " + [...movedItems.current].join(', '));
    setOrder(newOrder);
  }

  function submit() {
    //Loop through order, check if they moved and their group changed, add/update changedDefs if so. 
    let newChanges = cloneDeep<ConfigDocChanges>(docChanges);
    let currentGroup: DefGroup = groupList[0];
    for(let item of order) {
      if(item.startsWith('group:')) {
        currentGroup = item.slice(item.indexOf(`:`)+1) as DefGroup;
      }
      else if(movedItems.current.has(item)) {
        let newDef: ColumnDef = cloneDeep<ColumnDef>(docChanges[path]?.[item] ?? doc[path][item]!);
        if(newDef.group !== currentGroup) {
          // Don't let mandatory defs have their group changed
          const mandatoryDefs = (specialDefs.mandatory[path]);
          if(keys(mandatoryDefs).includes(newDef.columnName)) {
            presentAlert( newDef.columnName + " is a special column that must stay in group " + newDef.group,);
            return;
          }
          newDef.group = currentGroup;
          //needsHeader cols must have widths, give them extra small. Also can't have dontRenderEmpty
          if(currentGroup === "needsHeader") {
            if(!newDef.widths) {
              newDef.widths = {...predefinedWidths['extra small']};
            }
            delete newDef.dontRenderEmpty;
          }
          set(newChanges, `${path}.${item}`, newDef);
        }
      }
    }
    //update changedOrders with groups stripped out.
    let newOrder = [...order];
    newOrder = newOrder.filter((item) => !item.startsWith('group:'));
    set(newChanges, `changedOrders.${path}`, newOrder);
    console.log("submitting order " + newOrder.join(', '));

    //Test that user didn't just move an order then move it right back
    if(isEqual(docChanges, newChanges)) {
      console.warn("Nothing actually changed");
    }
    changeDefOrder(newChanges);
    dismissModalCallback();
  }


  return (
    <>
    <IonContent>
      <IonReorderGroup disabled={false} onIonItemReorder={doReorder}>
        {order.map((item, index) => {
          if(item.startsWith(`group:`)) {
            const groupName = item.slice(item.indexOf(`:`)+1);
            return (
              <GroupJSX key={groupName} name={groupName} />
            );
          }
          else {
            return (
              <ColJSX key={item} name={item} wasDeleted={wasDeleted(item)} />
            );
          }
        })}
      </IonReorderGroup>

    </IonContent> 

    <IonFooter>
      <IonToolbar>
        <IonRow class="ion-justify-content-center">
          <IonButton disabled={movedItems.current.size === 0} onClick={submit}>Submit</IonButton>
          <IonButton onClick={dismissModalCallback}>Cancel</IonButton>
        </IonRow>
      </IonToolbar>
    </IonFooter>
    </>
  );

}

function GroupJSX({name}: {name:string}) {
  const title = groupDescriptions[name as keyof typeof groupDescriptions]?.title ?? name;
  const desc = groupDescriptions[name as keyof typeof groupDescriptions]?.desc ?? null;
  return (
    <IonItem color="secondary">
      <IonLabel>Group: {title}</IonLabel>
      <IonNote className={characterStyles.helperNote} slot="end">{desc && <HelpPopup>{desc}</HelpPopup>}</IonNote>
      <IonReorder slot="end">
        {/*<IonIcon ios={swapVerticalOutline} md={swapVerticalSharp}></IonIcon>*/}
      </IonReorder>
    </IonItem>
  );
}

//TODO: special coloring for mandatory defs, which can be moved, but not out of their group
function ColJSX({name, wasDeleted}: {name:string, wasDeleted: boolean}) {
  return (
    <IonReorder>
      <IonItem color={wasDeleted ? 'danger' : ''}>
        <IonLabel>{name + (wasDeleted ? ' (Deleted) ' : '')}</IonLabel>
        {!wasDeleted && <IonIcon slot="end" ios={swapVerticalOutline} md={swapVerticalSharp}></IonIcon>}
      </IonItem>
    </IonReorder>
  );
}

export default DefOrdererModal;
