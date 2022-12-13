
import { useIonModal, useIonAlert, IonContent, IonList, IonItem, IonButton, IonIcon, IonLabel, IonItemSliding, IonItemOptions, IonItemOption, IonReorder, IonReorderGroup } from '@ionic/react';
import { ItemReorderEventDetail } from '@ionic/core';
import { swapVerticalOutline, swapVerticalSharp, chevronForward, chevronBack, trash } from 'ionicons/icons';
//delete these 2
import React, { useState, useEffect, useRef } from 'react';
import { MoveOrder, ColumnDef, ColumnData, DataType } from '../types/characterTypes';
import { isMoveOrder } from '../services/columnUtil';
import { cloneDeep, isEqual } from 'lodash';


type MoveOrdererProps = {
  moveOrder: MoveOrder[];
  changeMoveOrder: (moveOrder: MoveOrder[])=>void;
  onDismiss: ()=>void;
}

//TODO: adding and deleting categories
//Dragging parent moves all children after the fact, ionic can't handle it.
const MoveOrdererModal: React.FC<MoveOrdererProps> = ({moveOrder: originalMoveOrder, changeMoveOrder, onDismiss}) => {
  const [currentOrder, setCurrentOrder] = useState<MoveOrder[]>(getClonedOrder);
  const [present, dismiss] = useIonAlert();

  useEffect(() => {
    console.log(JSON.stringify(originalMoveOrder))
  }, []);

  function getClonedOrder(): MoveOrder[] {
    return cloneDeep<MoveOrder[]>(originalMoveOrder);
  }

  function doReorder(event: CustomEvent<ItemReorderEventDetail>) {
    console.log(JSON.stringify(event));
    let {from: fromIndex, to: toIndex, complete} = {...event.detail};
    complete(currentOrder);
    //Move items with category... uh, does complete() change currentOrder instantly?
    //Moving children as groups is very complex... keep it purely aesthetic and make users control it
    
    console.log("items now " + JSON.stringify(currentOrder));
    setCurrentOrder([...currentOrder]);
  }

  function submit() {
    changeMoveOrder(currentOrder);
    console.log("submit!");
    onDismiss();
  }

  function addCategory() {
    present({
      message: "Add Category:",
      inputs: [{
        type: 'text',
        min: 1,
        max: 30,
      }],
      buttons: [
        'Cancel',
        { text: 'Ok', handler: (inputs) => setCurrentOrder([...currentOrder, {name: inputs[0], isCategory: true}]) },
      ],

    });
  }

  function deleteCategory(index: number) {
    if(!currentOrder[index].isCategory) {
      console.error(`Item at index ${index} is not a category!`);
    }
    else {
      currentOrder.splice(index, 1);
      setCurrentOrder([...currentOrder]);
    }
  }

  function changeIndent(index: number, indent:number) {
    const item = currentOrder[index];
    if(item) {
      if(item.isCategory) {
        console.error(`Trying to change index for a category`);
        return;
      }
      if(indent < 1) {
        delete item.indent;
      }
      else {
        item.indent = indent;
      }
      setCurrentOrder([...currentOrder]);
    }
  }

  function CategoryJSX({name, index}: {name:string, index:number}) {
    return (
      <IonItem>
        <IonButton onClick={() => present({
          message: `Delete Category ${name}?`,
          buttons: [
            'Cancel',
            { text: 'Ok', role: 'destructive', handler: () => deleteCategory(index) },
          ],
        })} >
          <IonIcon icon={trash} />
        </IonButton>
        <IonLabel>--------{name}--------</IonLabel>
        <IonReorder slot="end">
          <IonIcon ios={swapVerticalOutline} md={swapVerticalSharp}></IonIcon>
        </IonReorder>
      </IonItem>
    );
  }

  /*
     structure: [[{start:1,end:5},{start:5,end:9}],[{start:6,end:8}]]
0    0      [] 
1    L1     [1]
2    |L2    [1,2]  
3    | L3   [1,2]
4    | L3   [1,2] 1->{1-5}, 2->false
5    L1     [1]
6    |L2    [1,2]
7    ||L3   [1,2] 2->{6-8}
8    |L2    [1] 1->{5-9}
9    L1     [1] 
10    L2    [1] 1->false
11   0      []
  */
  /*
     0      []
     L1     [1] (has child, found lv.1 sibling, add)
     |L2    [1] (has child, no sibling)
     | L3   [1]
     | L3   [1]
     L1     [1] (is lv.1 sibling, pop, has child, found next sibling, add)
     |L2    [1,2] (has child, found lv.2 sibling, add)
     ||L3   [1,2]
     |L2    [1] (is lv.2 sibling, pop)
     L1     [] (is lv.1 sibling, pop, has child, no sibling)
      L2    []
     0      []
  */
  function changeIndentList(order: Readonly<MoveOrder[]>, index: number, currentIndents: number[]) {
    if(index > order.length -1) throw new Error("moveOrder index out of bounds");
    const {name, isCategory, indent=0} = {...order[index]}; 
    if(isCategory) return;
    //while last ident >= this indent, pop it
    while(currentIndents.length > 0 && currentIndents[currentIndents.length-1] >= indent) {
      currentIndents.pop();
    }
    const next: MoveOrder | null = order[index+1];
    //check if next item is child
    if(next.indent && next.indent > indent) {
      //look ahead for a sibling
      for(let i=index+1; i<order.length; i++) {
        const item = order[i];
        if(!item.indent || item.indent < indent) {
          break;
        }
        else if(item.indent === indent) {
          currentIndents.push(indent);
          return;
        }
      }
    }
  }
  let indentsWithChildren: number[] = [];


  return (
    <IonContent>
      <IonReorderGroup disabled={false} onIonItemReorder={doReorder}>
        {currentOrder.map((item, index) => {
          const {name, isCategory, indent=0}: MoveOrder = {...item};
          if(isCategory) { return (
            <CategoryJSX key={name} name={name} index={index} />
          )}
          else { return (
            <MoveJSX  key={name} name={name} indent={indent} index={index} changeIndent={changeIndent}/>
          )}
        })}
      </IonReorderGroup>


      <IonItem key="footer">
        <input type="submit" style={{display: "none"}}/> {/* enables enter key submission. TODO: test on mobile */}
        <IonButton onClick={submit}>Submit</IonButton>
        <IonButton onClick={addCategory}>Add Category</IonButton>
        <IonButton onClick={() => onDismiss()}>Cancel</IonButton>
      </IonItem>
    </IonContent> 
  );

}

  function MoveJSX({name, indent=0, index, changeIndent}: {name:string, indent:number | undefined, index:number, changeIndent:(x: number, y:number)=>void}) {
    const increaseIndent = <IonButton key="increase" onClick={()=>changeIndent(index, indent+1)}><IonIcon icon={chevronForward} /></IonButton>;
    const reduceIndent = indent > 0 ? <IonButton key="decrease" onClick={()=>changeIndent(index, indent-1)}><IonIcon icon={chevronBack} /></IonButton> : null;
    let buttons = [reduceIndent, increaseIndent];
    let indents = [];
    for(let i=0; i <= indent; i++) {
      let key="spacer-"+i;
      indents.push(<div key={key} style={{width: "var(--indent-spacer-width)"}}></div>);
    }
    return (
      <IonItem key={name}>
        {indents}
        <IonLabel>{name}</IonLabel>
        <IonReorder slot="end">
          <IonIcon ios={swapVerticalOutline} md={swapVerticalSharp}></IonIcon>
        </IonReorder>
        {buttons}
      </IonItem>
    );
  }

export default MoveOrdererModal;

      //-- Can have orderable subgroup that's reorderable within itself, but array completion only works within one group--
      //<IonReorderGroup disabled={false} onIonItemReorder={doReorder}>
        //-- Default reorder icon, end aligned items --
        //<IonItem>
          //<IonLabel>Item 1</IonLabel>
          //<IonReorder slot="start" />
        //</IonItem>

        //<IonItem>
          //<IonLabel>Item 2</IonLabel>
          //<IonReorder slot="start" />
        //</IonItem>

        //<IonReorder>
        //<IonReorderGroup disabled={false} onIonItemReorder={doReorder}>
          //-- Default reorder icon, end aligned items --
          //<IonItem>
            //<IonLabel>Item sub 1</IonLabel>
            //<IonReorder slot="start" />
          //</IonItem>

          //<IonItem>
            //<IonLabel>Item sub 2</IonLabel>
            //<IonReorder slot="start" />
          //</IonItem>
        //</IonReorderGroup>
        //</IonReorder>
      //</IonReorderGroup>

      //<IonList>
        //<IonItemSliding ref={testRef} onIonDrag={(args)=>console.log("item dragged [called for every pixel of movement]" + JSON.stringify(args))} >
          //<IonItemOptions side="start">
            //<IonItemOption onClick={() => console.log('favorite clicked')}>Favorite</IonItemOption>
            //<IonItemOption color="danger" onClick={() => console.log('share clicked')}>Share</IonItemOption>
          //</IonItemOptions>

          //<IonItem>
            //<IonLabel>Item Options</IonLabel>
                //<IonReorder slot="start" />
          //</IonItem>

          //<IonItemOptions side="end">
            //<IonItemOption onClick={() => console.log('unread clicked')}>Unread</IonItemOption>
          //</IonItemOptions>
        //</IonItemSliding>


   //Sliding item with expandable options on both sides 
        //<IonItemSliding>
    //<IonItemOptions side="start">
      //<IonItemOption color="danger" expandable>
        //Delete
      //</IonItemOption>
    //</IonItemOptions>

    //<IonItem>
      //<IonLabel>Expandable Options</IonLabel>
    //</IonItem>

    //<IonItemOptions side="end">
      //<IonItemOption color="tertiary" expandable>
        //Archive
      //</IonItemOption>
    //</IonItemOptions>
  //</IonItemSliding>

     //Multi-line sliding item with icon options on both sides 
  //<IonItemSliding id="item100">
    //<IonItem href="#">
      //<IonLabel>
        //<h2>HubStruck Notifications</h2>
        //<p>A new message in your network</p>
        //<p>Oceanic Next has joined your network</p>
      //</IonLabel>
      //<IonNote slot="end">
        //10:45 AM
      //</IonNote>
    //</IonItem>

    //<IonItemOptions side="start">
      //<IonItemOption>
        //<IonIcon slot="icon-only" icon={heart} />
      //</IonItemOption>
    //</IonItemOptions>

    //<IonItemOptions side="end">
      //<IonItemOption color="danger">
        //<IonIcon slot="icon-only" icon={trash} />
      //</IonItemOption>
      //<IonItemOption>
        //<IonIcon slot="icon-only" icon={star} />
      //</IonItemOption>
    //</IonItemOptions>
  //</IonItemSliding>

   //Sliding item with icon start options on end side 
  //<IonItemSliding>
    //<IonItem>
      //<IonLabel>
        //Sliding Item, Icons Start
      //</IonLabel>
    //</IonItem>
    //<IonItemOptions>
      //<IonItemOption color="primary">
        //<IonIcon slot="start" ios={ellipsisHorizontal} md={ellipsisVertical}></IonIcon>
        //More
      //</IonItemOption>
      //<IonItemOption color="secondary">
        //<IonIcon slot="start" icon={archive} />
        //Archive
      //</IonItemOption>
    //</IonItemOptions>
  //</IonItemSliding>

   //Sliding item with icon end options on end side 
  //<IonItemSliding>
    //<IonItem>
      //<IonLabel>
        //Sliding Item, Icons End
      //</IonLabel>
    //</IonItem>
    //<IonItemOptions>
      //<IonItemOption color="primary">
        //<IonIcon slot="end" ios={ellipsisHorizontal} md={ellipsisVertical}></IonIcon>
        //More
      //</IonItemOption>
      //<IonItemOption color="secondary">
        //<IonIcon slot="end" icon={archive} />
        //Archive
      //</IonItemOption>
    //</IonItemOptions>
  //</IonItemSliding>

   //Sliding item with icon top options on end side 
  //<IonItemSliding>
    //<IonItem>
      //<IonLabel>
        //Sliding Item, Icons Top
      //</IonLabel>
    //</IonItem>
    //<IonItemOptions>
      //<IonItemOption color="primary">
        //<IonIcon slot="top" ios={ellipsisHorizontal} md={ellipsisVertical}></IonIcon>
        //More
      //</IonItemOption>
      //<IonItemOption color="secondary">
        //<IonIcon slot="top" icon={archive} />
        //Archive
      //</IonItemOption>
    //</IonItemOptions>
  //</IonItemSliding>

   //Sliding item with icon bottom options on end side 
  //<IonItemSliding>
    //<IonItem>
      //<IonLabel>
        //Sliding Item, Icons Bottom
      //</IonLabel>
    //</IonItem>
    //<IonItemOptions>
      //<IonItemOption color="primary">
        //<IonIcon slot="bottom" ios={ellipsisHorizontal} md={ellipsisVertical}></IonIcon>
        //More
      //</IonItemOption>
      //<IonItemOption color="secondary">
        //<IonIcon slot="bottom" icon={archive} />
        //Archive
      //</IonItemOption>
    //</IonItemOptions>
  //</IonItemSliding>

      //</IonList>
