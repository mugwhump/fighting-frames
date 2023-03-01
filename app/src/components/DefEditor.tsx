import { IonIcon, IonItem, IonGrid, IonRow, IonCol, IonButton, IonLabel, useIonAlert, IonContent, IonModal, IonSelect, IonSelectOption, IonicSafeString } from '@ionic/react';
import React, { useEffect, useState, useCallback } from 'react';
import { swapVerticalOutline, swapVerticalSharp, warningOutline, warningSharp } from 'ionicons/icons';
import * as T from '../types/characterTypes';
import { keys, keyVals } from '../services/util';
import { getIonicSanitizedString } from '../services/renderUtil';
import { insertDefsSortGroupsCompileRegexes, repairOrder } from '../services/columnUtil';
import { makeApiCall, userHasPerms, PermissionLevel } from '../services/pouch';
import HeaderPage from './HeaderPage';
import NeedPermissions from './NeedPermissions';
import DefEditModal from './DefEditModal';
import DefOrdererModal from './DefOrdererModal';
import DefAddModal from './DefAddModal';
import DefEditCollection from './DefEditCollection';
import HelpPopup from './HelpPopup';
import { cloneDeep, isEqual, set, remove, sortBy } from 'lodash';
import characterStyles from '../theme/Character.module.css';
import styles from '../theme/DefEditor.module.css';


export type DesignDocChanges = Partial<T.DesignDoc> & {
  //if order is changed, it's shown here. Additions are added but deletions aren't removed.
  //These are differences compared to the cloned doc, which has mandatory defs added if missing, and defs sorted by group if they were out of place.
  changedOrders?: {
    universalPropDefs?: string[];
    columnDefs?: string[];
  }
  deletedDefs?: {
    universalPropDefs?: string[];
    columnDefs?: string[];
  }
};
export type DefEditObj = {defName: string, isUniversalProp: boolean, propOrColPath: "universalPropDefs" | "columnDefs", wasAdded?: boolean, wasDeleted?: boolean, 
  isSuggested?: boolean, isMandatory?: boolean};

type DefEditorProps = {
  gameId: string;
  designDoc: T.DesignDoc; //does NOT contain modified definitions, they're straight from DB
}
const DefEditor: React.FC<DefEditorProps> = ({gameId, designDoc}) => {
  const [docChanges, setDocChanges] = useState<DesignDocChanges>({}); 
  const [clonedDoc, setClonedDoc] = useState<T.DesignDoc>(cloneDesignDocStripMetaAddMandatory);
  const [defToEdit, setDefToEdit] = useState<DefEditObj | null>(null); //null when not editing, defName is empty string when adding new def
  const [showReorderModal, setShowReorderModal] = useState<'props' | 'cols' | null>(null);
  const [showAddDefModal, setShowAddDefModal] = useState<'props' | 'cols' | null>(null);
  const [presentAlert, dismissAlert] = useIonAlert(); 
  const [previewBreakpoint, setPreviewBreakpoint] = useState<T.Breakpoint | undefined>(undefined);
  let defObjBeingEdited: T.ColumnDef | undefined = undefined; //undefined if not editing or if adding new def
  if(defToEdit && defToEdit.defName !== "") {
    defObjBeingEdited = docChanges?.[defToEdit.propOrColPath]?.[defToEdit.defName] || clonedDoc[defToEdit.propOrColPath]?.[defToEdit.defName];
  }


  function cloneDesignDocStripMetaAddMandatory(): T.DesignDoc {
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

    //Add mandatory columns and sort by group
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

  function uploadDoc() {
    let newDesignDoc: T.DesignDoc = getUpdatedDoc(clonedDoc, docChanges);

    //newDesignDoc.universalPropDefs.Bio!.shortName = 'TOO LOOOOONG';
    makeApiCall(`game/${gameId}/config/publish`, 'POST', newDesignDoc).then((res) => {
      console.log(res.message ?? "Success!");
      presentAlert("Successfully updated config!");
      //TODO: refresh for updated ddoc, handle conflict
      setDocChanges({});
    }).catch((err) => {
      console.error(err.message);
      if(err.status === 409) {
        //TODO: update conflict, trigger a fetch.
      }
      presentAlert( {
        header: "Error",
        message: getIonicSanitizedString(err.message),
      })
      //presentAlert(getIonicSanitizedString("Error updating config: " +err.message));
    });
  }

  function getUpdatedDoc(doc: Readonly<T.DesignDoc>, changes: Readonly<DesignDocChanges>): T.DesignDoc {
    let result = {...doc};
    let newUniversalPropDefs: Record<string, T.ColumnDef> = {};
    let newColumnDefs: Record<string, T.ColumnDef> = {};

    //iterate through in new order, add new def if not in deleted
    for(const propKey of changes.changedOrders?.universalPropDefs ?? keys(doc.universalPropDefs)) {
      const def = changes.universalPropDefs?.[propKey] ?? doc.universalPropDefs[propKey];
      if(def && !changes.deletedDefs?.universalPropDefs?.includes(propKey)) {
        newUniversalPropDefs[propKey] = def;
      }
    }
    result.universalPropDefs = newUniversalPropDefs;

    for(const columnKey of changes.changedOrders?.columnDefs ?? keys(doc.columnDefs)) {
      const def = changes.columnDefs?.[columnKey] ?? doc.columnDefs[columnKey];
      if(def && !changes.deletedDefs?.columnDefs?.includes(columnKey)) {
        newColumnDefs[columnKey] = def;
      }
    }
    result.columnDefs = newColumnDefs;
    return result;
  }

  //returns string if error, false otherwise
  const updateOrAddDefCallback  = useCallback((def: T.ColumnDef) => {
    console.log("Called updateDef with def " + JSON.stringify(def));
    if(!defToEdit) return "Error finding definition to edit";
    const path = defToEdit.propOrColPath;
    let newChanges = cloneDeep<DesignDocChanges>(docChanges);
    set(newChanges, `${path}.${def.columnName}`, def); 

    //return error if trying to give new, non-suggested def a name that's already in use
    if(defToEdit.defName === "" && keys({...clonedDoc[path], ...docChanges[path]}).includes(def.columnName)) {
      return "Column ID "+def.columnName+" is already in use.";
    }

    //If def is just being added now, put new def in order at end of its group
    if(defToEdit.wasAdded && !docChanges?.[path]?.[def.columnName]) {
      let order: string[] = docChanges.changedOrders?.[path] || keys(clonedDoc[path]);
      order.push(def.columnName);
      let newOrder = repairOrder(order, {...clonedDoc[path], ...newChanges[path]});
      set(newChanges, `changedOrders.${path}`, newOrder);
      console.log(`Added column ${def.columnName} to order, new order is ${newChanges.changedOrders![path]}`);
    }
    else if(defToEdit.defName !== def.columnName) { //if changed columnName of existing column
      //TODO: add new one w/ new key to changes, add... old one to deletions? And update order with new key where old one was??
      //UI ensures can't change column that's been deleted
      console.log("If edited, new docChanges would be" + JSON.stringify(newChanges));
      return "Cannot change name of existing column " + defToEdit.defName + " to " + def.columnName;
    }
    setDocChanges(newChanges);
    return false;
  }, [defToEdit, docChanges]);


  const deleteDefCallback = useCallback((defName: string) => {
    console.log("Called deleteDef for def " + defName);
    if(!defToEdit) return;
    let newChanges = cloneDeep<DesignDocChanges>(docChanges);
    //set(newChanges, `${defToEdit.propOrColPath}.${defName}`, undefined);
    const orderArrayLength = newChanges?.deletedDefs?.[defToEdit.propOrColPath!]?.length ?? 0;
    set(newChanges, `deletedDefs.${defToEdit.propOrColPath}[${orderArrayLength}]`, defName);
    setDocChanges(newChanges);
  }, [clonedDoc, defToEdit, docChanges]);


  //Undoes changes to existing columns, deletes newly-added columns. Makes appropriate changes to order.
  //If un-deleting an existing column, doesn't undo previous changes to it.
  const resetDefCallback = useCallback((defName: string) => {
    console.log("Called resetDef for def " + defName);
    if(!defToEdit || !defToEdit.propOrColPath) return;
    const path = defToEdit.propOrColPath;
    let newChanges = cloneDeep<DesignDocChanges>(docChanges);

    //If it was deleted, remove from deletions and DON'T reset other changes that might have been made
    if(defToEdit.wasDeleted) {
      remove(newChanges.deletedDefs?.[path] || [], ((x) => x === defName));
    }
    else {
      //undo the def changes
      if(defToEdit.isUniversalProp && newChanges.universalPropDefs) {
        delete newChanges?.universalPropDefs?.[defName];
        if(keys(newChanges?.universalPropDefs).length === 0) delete newChanges.universalPropDefs;
      }
      else if(!defToEdit.isUniversalProp && newChanges.columnDefs) {
        delete newChanges?.columnDefs?.[defName];
        if(keys(newChanges?.columnDefs).length === 0) delete newChanges.columnDefs;
      }
      //Undo any ordering changes
      const changedOrder = newChanges.changedOrders?.[path];
      if(changedOrder) {
        //If it was added, remove from order
        if(defToEdit.wasAdded) {
          remove(changedOrder, ((x) => x === defName)); 
          if(keys(changedOrder).length === 0) delete newChanges.changedOrders?.[path];
        }
        //if a reorder changed a non-added col's group, this resets its group, so must fix order. 
        //TODO: maybe have resetting not reset its order/group by making new changed def w/ just group change?
        else if(docChanges[path]?.[defName] && docChanges[path]?.[defName]?.group !== clonedDoc[path][defName]?.group) {
          presentAlert(`Column ${defName} was moved to back to group ${clonedDoc[path][defName]?.group}, please check its order inside the group`);
          let repairedOrder = repairOrder(changedOrder, {...clonedDoc[path], ...newChanges[path]});
          set(newChanges, `changedOrders.${path}`, repairedOrder);
        }
      }
    }
    setDocChanges(newChanges);
  }, [clonedDoc, defToEdit, docChanges]);


  const setDocChangesCallback = useCallback((changes: DesignDocChanges) => {
    setDocChanges(changes);
  }, [docChanges])

  function chooseBreakpoint(e: any) {
    setPreviewBreakpoint(e.detail.value !== "undefined" ? e.detail.value as T.Breakpoint : undefined);
  }

  const setDefToEditCallback = useCallback((editObj: DefEditObj) => {
    setDefToEdit(editObj);
  }, [clonedDoc, docChanges]);

  const dismissEditorCallback  = useCallback(() => {
    setDefToEdit(null);
  }, []);

  const dismissReordererCallback  = useCallback(() => {
    setShowReorderModal(null);
  }, []);

  const dismissAddDefCallback  = useCallback(() => {
    setShowAddDefModal(null);
  }, []);

  return (
    <>
    <HeaderPage title={"Editing config for " + clonedDoc.displayName}>
      <IonContent fullscreen>

        <IonModal isOpen={defToEdit !== null} onDidDismiss={dismissEditorCallback} backdropDismiss={false} >
          {defToEdit &&
            ((docChanges.deletedDefs?.[defToEdit.propOrColPath]?.includes(defToEdit.defName)) 
            ?  <IonContent>
                <IonItem key="header">
                  <IonLabel>Restore deleted column?</IonLabel>
                </IonItem>
                <IonItem>The column {defToEdit?.defName} has been deleted. Would you like to restore it?</IonItem>
                <IonItem key="footer">
                  <IonButton onClick={() => {resetDefCallback(defToEdit!.defName); dismissEditorCallback()}}>Restore column</IonButton>
                  <IonButton onClick={dismissEditorCallback}>Cancel</IonButton>
                </IonItem>
              </IonContent>
            : <DefEditModal defEditingInfo={defToEdit || {defName:"", isUniversalProp:false, propOrColPath:"columnDefs"}} colDef={defObjBeingEdited} updateDefCallback={updateOrAddDefCallback }
              deleteDefCallback={deleteDefCallback} resetDefCallback={resetDefCallback} dismissModalCallback={dismissEditorCallback } />
            )}
        </IonModal>

        <IonModal isOpen={showReorderModal === 'props'} onDidDismiss={dismissReordererCallback}>
          <DefOrdererModal doc={clonedDoc} docChanges={docChanges} isUniversalProps={true} changeDefOrder={setDocChangesCallback} dismissModalCallback={dismissReordererCallback} />
        </IonModal>
        <IonModal isOpen={showReorderModal === 'cols'} onDidDismiss={dismissReordererCallback}>
          <DefOrdererModal doc={clonedDoc} docChanges={docChanges} isUniversalProps={false} changeDefOrder={setDocChangesCallback} dismissModalCallback={dismissReordererCallback} />
        </IonModal>

        <IonModal isOpen={showAddDefModal === 'props'} onDidDismiss={dismissAddDefCallback}>
          <DefAddModal doc={clonedDoc} docChanges={docChanges} isUniversalProps={true} setDefToEditCallback={setDefToEditCallback} dismissModalCallback={dismissAddDefCallback} />
        </IonModal>
        <IonModal isOpen={showAddDefModal === 'cols'} onDidDismiss={dismissAddDefCallback}>
          <DefAddModal doc={clonedDoc} docChanges={docChanges} isUniversalProps={false} setDefToEditCallback={setDefToEditCallback} dismissModalCallback={dismissAddDefCallback} />
        </IonModal>

        <NeedPermissions permissions="GameAdmin" ifYes={(
          <IonButton onClick={uploadDoc} type="submit" expand="full" disabled={keys(docChanges).length === 0} >Upload New Config</IonButton>
        )}
        ifNo={(
          <IonItem color="danger"><IonIcon slot="start" ios={warningOutline} md={warningSharp} /><span>Only game admins can change configuration. You can look at the configuration, but <b>cannot upload any changes</b>.</span><IonButton onClick={uploadDoc} type="submit" expand="full" disabled={keys(docChanges).length === 0}>Test upload without permission</IonButton></IonItem>
        )}
        />

        <IonSelect interface="action-sheet" placeholder="Screen width preview: Select a size" onIonChange={chooseBreakpoint}
            interfaceOptions={{header: "Preview Screen Width", subHeader: "This lets you see how the columns will be arranged on devices of varying sizes"}}>
          <IonSelectOption value="undefined">Responsive - resize your browser to observe changes</IonSelectOption>
          <IonSelectOption value="xs">XS</IonSelectOption>
          <IonSelectOption value="sm">SM - 576px</IonSelectOption>
          <IonSelectOption value="md">MD - 768px</IonSelectOption>
          <IonSelectOption value="lg">LG - 992px</IonSelectOption>
          <IonSelectOption value="xl">XL - 1200px</IonSelectOption>
        </IonSelect>

        <IonGrid>

        <div className={styles.columnDefCollection}>
          <IonRow className='ion-justify-content-between ion-align-items-center'>
            <IonCol sizeXs="12" sizeMd="auto">
              <span className={styles.columnDefCollectionHeader}>Universal Properties</span>  
              <HelpPopup>{"These are for data about the character that shows up once above their move list. Properties like name, age, total health, backdash frames, etc. These properties are more likely to be a whole row wide. Consider putting some of them in the 'Hide by default' group so they appear inside a closed accordion and don't take up space, since users will usually be more interested in the movelist."}</HelpPopup>
            </IonCol>
            <IonCol sizeXs="12" sizeMd="7">
              <IonButton onClick={() => setShowAddDefModal('props')}>Add</IonButton>
              <IonButton onClick={() => setShowReorderModal('props')}>Reorder / Change Group
              <IonIcon ios={swapVerticalOutline} md={swapVerticalSharp}></IonIcon>
            </IonButton></IonCol>
          </IonRow>
          <DefEditCollection doc={clonedDoc} docChanges={docChanges} isUniversalProps={true} previewBreakpoint={previewBreakpoint} itemClicked={setDefToEditCallback} />
        </div>

        <div className={styles.columnDefCollection}>
          <IonRow className='ion-justify-content-between ion-align-items-center'>
            <IonCol sizeXs="12" sizeMd="auto">
              <span className={styles.columnDefCollectionHeader}>Move Columns</span>  
              <HelpPopup>{"These are for the characters' moves. Whereas a character only has one set of universal properties, these columns are repeated for each move in their movelist. Things like damage, input, startup frames, etc. For columns in the 'Needs Header' group, any that fit in the first row at a given breakpoint (determined by the widths you define) will have a floating header at the top of the screen. Put the most essential numeric columns here!"}</HelpPopup>
            </IonCol>
            <IonCol sizeXs="12" sizeMd="7">
              <IonButton onClick={() => setShowAddDefModal('cols')}>Add</IonButton>
              <IonButton onClick={() => setShowReorderModal('cols')}>Reorder / Change Group
                <IonIcon ios={swapVerticalOutline} md={swapVerticalSharp}></IonIcon>
              </IonButton></IonCol>
          </IonRow>
          <DefEditCollection doc={clonedDoc} docChanges={docChanges} isUniversalProps={false} previewBreakpoint={previewBreakpoint} itemClicked={setDefToEditCallback} />
        </div>

        </IonGrid>
        {/*<div>{JSON.stringify(clonedDoc)}</div>*/}
      </IonContent>
    </HeaderPage>
    </>
  );
}



export default DefEditor;
