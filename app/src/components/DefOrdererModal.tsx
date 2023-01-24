import { useIonModal, useIonAlert, IonContent, IonList, IonItem, IonButton, IonIcon, IonLabel, IonItemSliding, IonItemOptions, IonItemOption, IonReorder, IonReorderGroup } from '@ionic/react';
import { ItemReorderEventDetail } from '@ionic/core';
import { swapVerticalOutline, swapVerticalSharp, chevronForward, chevronBack, trash } from 'ionicons/icons';
//delete these 2
import React, { useState, useEffect, useRef } from 'react';
import { DefGroup, groupList , DesignDoc, ColumnDefs, ColumnDef, ColumnData, DataType } from '../types/characterTypes';
import { DesignDocChanges } from './DefEditor';  
import { keys } from '../services/util';
import { cloneDeep, isEqual, set } from 'lodash';


type DefOrdererProps  = {
  doc: Readonly<DesignDoc>; //current working definitions in proper order
  docChanges: Readonly<DesignDocChanges>;
  isUniversalProps: boolean;
  changeDefOrder : (changes: DesignDocChanges)=>void; //must return changed definitions in case of group changes
  dismissModalCallback: ()=>void;
}

// One instance of this for universal props, one for columns
const DefOrdererModal: React.FC<DefOrdererProps > = ({doc, docChanges, changeDefOrder, isUniversalProps, dismissModalCallback}) => {
  //const [changes, setChanges] = useState<DesignDocChanges>(()n> cloneDeep<DesignDocChanges>(originalChanges));
  const path = isUniversalProps ? "universalPropDefs" : "columnDefs";
  const movedItems = useRef<Set<string>>(new Set());
  const [order, setOrder] = useState<string[]>(getInitialOrder); //includes groups, prefixed by 'group:'
  const [presentAlert, dismiss] = useIonAlert();


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
    let {from: fromIndex, to: toIndex, complete} = {...event.detail};
    // Do not allow groups to be dragged, or for an item to be dragged to the top (making it groupless)
    if(order[fromIndex].startsWith(`group:`) || toIndex === 0) {
      complete(false);
      return;
    }
    //Will check if they tried to move displayName out of title group during submission

    movedItems.current.add(order[fromIndex]);
    let newOrder = [...order];
    complete(newOrder);
    
    console.log("items now " + JSON.stringify(newOrder) + ". movedItems = " + [...movedItems.current].join(', '));
    setOrder(newOrder);
  }

  function submit() {
    //Loop through order, check if they moved and their group changed, add/update changedDefs if so. 
    let newChanges = cloneDeep<DesignDocChanges>(docChanges);
    let currentGroup: DefGroup = groupList[0];
    for(let item of order) {
      if(item.startsWith('group:')) {
        currentGroup = item.slice(item.indexOf(`:`)+1) as DefGroup;
      }
      else if(movedItems.current.has(item)) {
        let newDef: ColumnDef = cloneDeep<ColumnDef>(docChanges[path]?.[item] ?? doc[path][item]!);
        if(newDef.group !== currentGroup) {
          // Don't let displayName have its group changed
          if(newDef.columnName === "displayName") {
            presentAlert(
              {
                header: "Cannot change group",
                message: "displayName is a special column that must stay in the title group",
                buttons: [ { text: 'OK', role: 'cancel' }, ], 
              }
            );
            return;
          }
          newDef.group = currentGroup;
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
              <ColJSX key={item} name={item} />
            );
          }
        })}
      </IonReorderGroup>


      <IonItem key="footer">
        <input type="submit" style={{display: "none"}}/> {/* enables enter key submission. TODO: test */}
        <IonButton disabled={movedItems.current.size === 0} onClick={submit}>Submit</IonButton>
        <IonButton onClick={dismissModalCallback}>Cancel</IonButton>
      </IonItem>
    </IonContent> 
  );

}

function GroupJSX({name}: {name:string}) {
  return (
    <IonItem >
      <IonLabel>--------{name}--------</IonLabel>
      <IonReorder slot="end">
        {/*<IonIcon ios={swapVerticalOutline} md={swapVerticalSharp}></IonIcon>*/}
      </IonReorder>
    </IonItem>
  );
}

function ColJSX({name}: {name:string}) {
  return (
      <IonReorder>
    <IonItem >
      <IonLabel>{name}</IonLabel>
        <IonIcon slot="end" ios={swapVerticalOutline} md={swapVerticalSharp}></IonIcon>
    </IonItem>
      </IonReorder>
  );
}

export default DefOrdererModal;
