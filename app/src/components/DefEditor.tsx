import { IonIcon, IonItem, IonItemGroup, IonGrid, IonRow, IonCol, IonButton, useIonAlert, IonContent, IonModal, IonSelect, IonSelectOption } from '@ionic/react';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { swapVerticalOutline, swapVerticalSharp } from 'ionicons/icons';
import { CharacterContextProvider, MiddlewareContext, MiddlewareSetterContext, Middleware } from '../services/CharacterReducer';
import { useGameContext, useGameDispatch, Action as GameAction } from './GameProvider';
import HeaderPage from './HeaderPage';
import DefEditModal from './DefEditModal';
import DefOrdererModal from './DefOrdererModal';
import * as T from '../types/characterTypes';
import { keys, keyVals } from '../services/util';
import { isString, isMoveOrder, } from '../services/columnUtil';
import { calculateHideBreakpoints } from '../services/renderUtil';
import { insertDefsSortGroupsCompileRegexes   } from '../services/columnUtil';
import { cloneDeep, isEqual, set, remove } from 'lodash';
import ColumnHeaders from './ColumnHeaders';
import CompileConstants from '../constants/CompileConstants';
import characterStyles from '../theme/Character.module.css';
import styles from '../theme/DefEditor.module.css';
import Select  from 'react-select'; //testing


export type DesignDocChanges = Partial<T.DesignDoc> & {
  //if order is changed, it's shown here. Additions are added but deletions aren't removed.
  //These are differences compared to the cloned doc, which has required defs added if missing, and defs sorted by group if they were out of place.
  changedOrders?: {
    universalPropDefs?: string[];
    columnDefs?: string[];
  }
  deletedDefs?: {
    universalPropDefs?: string[];
    columnDefs?: string[];
  }
};
export type DefEditObj = {defName: string, isUniversalProp: boolean, propOrColPath: "universalPropDefs" | "columnDefs", wasAdded?: boolean, wasDeleted?: boolean};

type DefEditorProps = {
  designDoc: T.DesignDoc; //does NOT contain modified definitions
}
const DefEditor: React.FC<DefEditorProps> = ({designDoc}) => {
  const [docChanges, setDocChanges] = useState<DesignDocChanges>({}); 
  const [clonedDoc, setClonedDoc] = useState<T.DesignDoc>(cloneDesignDocStripMetaAddRequired);
  const [defToEdit, setDefToEdit] = useState<DefEditObj | null>(null); //null when not editing, defName is empty string when adding new def
  const [showReorderModal, setShowReorderModal] = useState<'props' | 'cols' | null>(null);
  const [presentAlert, dismissAlert] = useIonAlert(); 
  const [previewBreakpoint, setPreviewBreakpoint] = useState<T.Breakpoint>('xs');
  let defObjBeingEdited: T.ColumnDef | undefined = undefined; //undefined if not editing or adding new def
  if(defToEdit && defToEdit.defName !== "") {
    if(defToEdit.isUniversalProp) {
      defObjBeingEdited = docChanges?.universalPropDefs?.[defToEdit.defName] || clonedDoc.universalPropDefs?.[defToEdit.defName];
    }
    else {
      defObjBeingEdited = docChanges?.columnDefs?.[defToEdit.defName] || clonedDoc.columnDefs?.[defToEdit.defName];
    }
  }


  function cloneDesignDocStripMetaAddRequired(): T.DesignDoc {
    let newDoc = cloneDeep<T.DesignDoc>(designDoc);
    //strip out definitions with "meta" group. There shouldn't be any of those in the DB document, though... probably.
    for(const [key, def] of keyVals(newDoc.universalPropDefs)) {
      if(def?.group === "meta") {
        delete newDoc.universalPropDefs[key];
      }
    }
    for(const [key, def] of keyVals(newDoc.columnDefs)) {
      if(def?.group === "meta") {
        delete newDoc.columnDefs[key];
      }
    }

    //Add required columns and sort by group
    newDoc.universalPropDefs = insertDefsSortGroupsCompileRegexes(newDoc.universalPropDefs, true, false, false);
    newDoc.columnDefs = insertDefsSortGroupsCompileRegexes(newDoc.columnDefs, false, false, false);
    return newDoc;
  }


  // handle conflicting changes to document
  useEffect(() => {
    if(designDoc._rev !== clonedDoc._rev) {
      if(keys(docChanges).length === 0) {
        setClonedDoc(cloneDeep<T.DesignDoc>(designDoc));
      }
      else {
        //close modal if def changed?
        setDefToEdit(null);
        //check whether a change was made that actually conflicts, or you deleted a def. Should ignore your additions.
        let conflictingProps: string[] = [];
        let conflictingCols: string[] = [];
        let yourChangedProps = new Set<string>([...docChanges?.deletedDefs?.universalPropDefs || [], ...keys(docChanges?.universalPropDefs || [])]);
        let yourChangedCols = new Set<string>([...docChanges?.deletedDefs?.columnDefs || [], ...keys(docChanges?.columnDefs || [])]);
        for(const key in yourChangedProps) {
          if(!isEqual(designDoc.universalPropDefs?.[key], clonedDoc.universalPropDefs?.[key])) {
            conflictingProps.push(key);
          }
        }
        for(const key in yourChangedCols) {
          if(!isEqual(designDoc.columnDefs?.[key], clonedDoc.columnDefs?.[key])) {
            conflictingCols.push(key);
          }
        }
        if(conflictingProps.length > 0 || conflictingCols.length > 0) {
          let changedMessage: string = (conflictingProps.length > 0) ? " Conflicting changes to universal property definitions " + conflictingProps.join(',') : "" +
                                       (conflictingCols.length > 0) ? " Conflicting changes to move column definitions " + conflictingCols.join(',') : "";
          presentAlert(
            {
              header: "Game configuration has been updated!",
              message: "While you were working, someone else updated this game's configuration."+changedMessage+". You can keep your changes and discard theirs, or keep theirs and discard yours.",
              buttons: [
                { text: 'Keep yours', handler: () => {setClonedDoc({...clonedDoc, _rev: designDoc._rev})} },
                { text: 'Keep theirs', role: "cancel", handler: () => {
                    //TODO: some way to keep your changes that don't conflict, but theirs when there is a conflict
                    setClonedDoc(cloneDeep<T.DesignDoc>(designDoc));
                    setDocChanges({});
                } },
              ], 
              //onDidDismiss: (e) => { },
            }
          );
        }
        else { //Definition changes do not conflict. If you changed some other setting, don't care, just take yours.
          setClonedDoc(cloneDeep<T.DesignDoc>(designDoc));
        }
      }
    }
  }, [designDoc, clonedDoc, docChanges, defToEdit]);

  function getUpdatedDoc(doc: T.DesignDoc, changes: DesignDocChanges): T.DesignDoc {
    return doc;
  }

  //returns string if error, false otherwise
  const updateOrAddDefCallback  = useCallback((def: T.ColumnDef) => {
    console.log("Called updateDef with def " + JSON.stringify(def));
    if(!defToEdit) return "Error finding definition to edit";
    const path = defToEdit.propOrColPath;
    let newChanges = {...docChanges};
    set(newChanges, `${path}.${def.columnName}`, def); 
    if(defToEdit.defName === "") {//new defs are added at end of order
      //return error if trying to give def a name that's already in use TODO: test
      if(keys({...clonedDoc[path], ...newChanges[path]}).includes(def.columnName)) {
        return "Column name "+def.columnName+" is already in use.";
      }
      const orderArrayLength = newChanges?.changedOrders?.[path!]?.length ?? 0;
      set(newChanges, `changedOrders.${path}[${orderArrayLength}]`, def.columnName);
    }
    setDocChanges(newChanges);
    return false;
  }, [defToEdit, docChanges]);


  const deleteDefCallback = useCallback((defName: string) => {
    console.log("Called deleteDef for def " + defName);
    if(!defToEdit) return;
    let newChanges: DesignDocChanges = {...docChanges}; //NOTE: intermediate object references aren't updated
    //set(newChanges, `${defToEdit.propOrColPath}.${defName}`, undefined);
    const orderArrayLength = newChanges?.deletedDefs?.[defToEdit.propOrColPath!]?.length ?? 0;
    set(newChanges, `deletedDefs.${defToEdit.propOrColPath}[${orderArrayLength}]`, defName);
    setDocChanges(newChanges);
  }, [clonedDoc, defToEdit, docChanges]);


  const resetDefCallback = useCallback((defName: string) => {
    console.log("Called resetDef for def " + defName);
    if(!defToEdit || !defToEdit.propOrColPath) return;
    let newChanges = {...docChanges};

    if(defToEdit.isUniversalProp && newChanges.universalPropDefs) {
      delete newChanges?.universalPropDefs?.[defName];
      if(keys(newChanges?.universalPropDefs).length === 0) delete newChanges.universalPropDefs;
    }
    else if(!defToEdit.isUniversalProp && newChanges.columnDefs) {
      delete newChanges?.columnDefs?.[defName];
      if(keys(newChanges?.columnDefs).length === 0) delete newChanges.columnDefs;
    }
    //If it was new, remove from order
    //TODO: empty parent objs not deleted
    if(!clonedDoc[defToEdit.propOrColPath][defName] && newChanges.changedOrders?.[defToEdit.propOrColPath]) {
      remove(newChanges.changedOrders[defToEdit.propOrColPath]!, ((x) => x === defName));
    }
    //If it was deleted, remove from deletions
    remove(newChanges.deletedDefs?.[defToEdit.propOrColPath] || [], ((x) => x === defName));

    setDocChanges(newChanges);
  }, [clonedDoc, defToEdit, docChanges]);

  const reorderCallback = useCallback((changes: DesignDocChanges) => {
    setDocChanges(changes);
  }, [docChanges])

  function chooseBreakpoint(e: any) {
    setPreviewBreakpoint(e.detail.value as T.Breakpoint);
  }

  const itemClicked = useCallback((editObj: DefEditObj) => {
    setDefToEdit(editObj);
  }, [clonedDoc, docChanges]);

  const dismissEditorCallback  = useCallback(() => {
    setDefToEdit(null);
  }, []);

  const dismissReordererCallback  = useCallback(() => {
    setShowReorderModal(null);
  }, []);

  return (
    <>
    <HeaderPage title={"Editing configuration for " + clonedDoc.displayName}>
      <IonContent fullscreen>
        <IonModal isOpen={defToEdit !== null} onDidDismiss={dismissEditorCallback} backdropDismiss={false} >
          <DefEditModal defEditingInfo={defToEdit || {defName:"", isUniversalProp:false, propOrColPath:"columnDefs"}} colDef={defObjBeingEdited} updateDefCallback={updateOrAddDefCallback }
            deleteDefCallback={deleteDefCallback} resetDefCallback={resetDefCallback} dismissModalCallback={dismissEditorCallback } />
        </IonModal>
        <IonModal isOpen={showReorderModal === 'props'} onDidDismiss={dismissReordererCallback}>
          <DefOrdererModal doc={clonedDoc} docChanges={docChanges} isUniversalProps={true} changeDefOrder={reorderCallback} dismissModalCallback={dismissReordererCallback} />
        </IonModal>
        <IonModal isOpen={showReorderModal === 'cols'} onDidDismiss={dismissReordererCallback}>
          <DefOrdererModal doc={clonedDoc} docChanges={docChanges} isUniversalProps={false} changeDefOrder={reorderCallback} dismissModalCallback={dismissReordererCallback} />
        </IonModal>
        <IonSelect interface="action-sheet" placeholder="Screen width preview" onIonChange={chooseBreakpoint}
            interfaceOptions={{header: "Preview Screen Width", subHeader: "This lets you see how the columns will be arranged on devices of varying sizes"}}>
          <IonSelectOption value="xs">XS</IonSelectOption>
          <IonSelectOption value="sm">SM - 576px</IonSelectOption>
          <IonSelectOption value="md">MD - 768px</IonSelectOption>
          <IonSelectOption value="lg">LG - 992px</IonSelectOption>
          <IonSelectOption value="xl">XL - 1200px</IonSelectOption>
        </IonSelect>
        <IonGrid>
          <IonRow className='ion-align-items-center'><IonCol className='ion-float-left'>Universal Properties</IonCol>
            <IonCol className='ion-float-right'><IonButton onClick={() => setShowReorderModal('props')}>Reorder
              <IonIcon ios={swapVerticalOutline} md={swapVerticalSharp}></IonIcon>
            </IonButton></IonCol>
          </IonRow>
          <DefCollection doc={clonedDoc} docChanges={docChanges} isUniversalProps={true} previewBreakpoint={previewBreakpoint} itemClicked={itemClicked} />
          <IonRow className='ion-align-items-center'><IonCol className='ion-float-left'>Move Columns</IonCol>
            <IonCol className='ion-float-right'><IonButton onClick={() => setShowReorderModal('cols')}>Reorder
              <IonIcon ios={swapVerticalOutline} md={swapVerticalSharp}></IonIcon>
            </IonButton></IonCol>
          </IonRow>
          <DefCollection doc={clonedDoc} docChanges={docChanges} isUniversalProps={false} previewBreakpoint={previewBreakpoint} itemClicked={itemClicked} />
        </IonGrid>
        <div>{JSON.stringify(clonedDoc)}</div>
      </IonContent>
    </HeaderPage>
    </>
  );
}


type DefGroupsProps = {
  doc: T.DesignDoc,
  docChanges: DesignDocChanges,
  isUniversalProps: boolean,
  previewBreakpoint: T.Breakpoint,
  itemClicked: (editObj: DefEditObj) => void,
}
const DefCollection: React.FC<DefGroupsProps> = ({doc, docChanges, isUniversalProps, itemClicked, previewBreakpoint}) => {
  const path = isUniversalProps ? "universalPropDefs" : "columnDefs";
  const order: string[] = docChanges.changedOrders?.[path] || keys(doc[path]);
  const mergedDefs: T.ColumnDefs = {};
  for(const key of order) {
    let def = docChanges?.[path]?.[key] || doc[path][key];
    mergedDefs[key] = def;
  }
  if(!isUniversalProps) {
    calculateHideBreakpoints(mergedDefs, previewBreakpoint);
  }

  let currentGroup: T.ColumnDef['group'] | null = null; //start as null
  let allGroups = [];
  let currentGroupArray = [];

  for(const key of order) {
    const def = mergedDefs[key];
    if(!def) throw new Error("Cannot find definition for "+key+" among available definitions: "+JSON.stringify(mergedDefs));
    const thisGroup = def.group;
    if(currentGroup !== thisGroup) { //if first item of new group
      if(currentGroup !== null) { //if finished with group and starting new one
        let headerRow = null;
        //if new group is needsHeader, insert the headerColumns here. 
        //Note that deleted columns are still here. But there shouldn't usually be deletions.
        if(currentGroup === "needsHeader" && !isUniversalProps) {
          headerRow = (
            <ColumnHeaders columnDefs={mergedDefs} />
          );
        }
        allGroups.push(
          <IonCol key={currentGroup} size="12">
            <IonRow>Column Group: {currentGroup}</IonRow>
            {headerRow}
            <IonRow>{currentGroupArray}</IonRow>
          </IonCol>
        );
        currentGroupArray = [];
      }
      currentGroup = thisGroup;
    }

    let editObj: DefEditObj = {defName: key, isUniversalProp: isUniversalProps, propOrColPath: path, wasAdded: false, wasDeleted: false};
    editObj.wasAdded = !doc[path];
    editObj.wasDeleted = !!docChanges.deletedDefs?.[path]?.find((x) => x === key);
    let classes = [styles.defPreview];
    if(editObj.wasAdded) classes.push(styles.add);
    if(editObj.wasDeleted) classes.push(styles.delete);

    let width: string | undefined = undefined;
    let showHeader: boolean = false;
    //give column a single size based on whichever of its defined widths is closest to the one being previewed
    let bps: T.Breakpoint[] = ['xs','sm','md','lg','xl'];
    for(let bp of bps) {
      if(def.widths?.[`size-${bp}`]) {
        width = def.widths?.[`size-${bp}`] + '';
      }
      if(bp === previewBreakpoint) { //quit loop once we reach the breakpoint being previewed
        break;
      }
    }
    currentGroupArray.push(
      <IonCol key={key} size={width} className={classes.join(' ')} onClick={() => itemClicked(editObj)}>
        {(def.group === "needsHeader" || def.group === "defaultHideNeedsHeader") && 
          <div className={characterStyles.standaloneHeaderCol + ' ' + (def._calculatedMoveHeaderHideClass  || '')}>{def.shortName || def.displayName || def.columnName}</div>
        }
        {key}
      </IonCol>
    )
  }
  allGroups.push( //push the final group
    <IonCol key={currentGroup} size="12">
      <IonRow>Column Group: {currentGroup}</IonRow>
      <IonRow>{currentGroupArray}</IonRow>
    </IonCol>
  );
  return <>{allGroups}</>
}

export default DefEditor;
