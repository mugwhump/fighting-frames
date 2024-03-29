import { IonIcon, IonItem, IonGrid, IonRow, IonCol, IonButton, IonLabel, IonInput, useIonAlert, IonNote, useIonToast, IonContent, IonModal, IonSelect, IonSelectOption, IonicSafeString } from '@ionic/react';
import React, { useEffect, useState, useCallback } from 'react';
import { Prompt } from 'react-router-dom';
import { swapVerticalOutline, swapVerticalSharp, warningOutline, warningSharp } from 'ionicons/icons';
import * as T from '../types/characterTypes';
import { keys, keyVals, getApiUploadConfigUrl } from '../services/util';
import { getIonicSanitizedString } from '../services/renderUtil';
import { insertDefsSortGroupsCompileRegexes, repairDefOrder } from '../services/columnUtil';
import { makeApiCall } from '../services/pouch';
import { useMyToast, useMyAlert, useLoadingPromise } from '../services/hooks';
//import { useGameDispatch, Action as GameAction } from './GameProvider';
import HeaderPage from '../components/HeaderPage';
import NeedPermissions from '../components/NeedPermissions';
import DefEditModal from '../components/DefEditModal';
import DefOrdererModal from '../components/DefOrdererModal';
import DefAddModal from '../components/DefAddModal';
import DefEditCollection from '../components/DefEditCollection';
import HelpPopup from '../components/HelpPopup';
import { cloneDeep, isEqual, set, remove, sortBy } from 'lodash';
import characterStyles from '../theme/Character.module.css';
import styles from '../theme/DefEditor.module.css';

import PouchDB from 'pouchdb'; //TODO: testing, delete
import { useDoc } from 'use-pouchdb';

export type ConfigDocChanges = Partial<T.ConfigDoc> & {
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
  configDoc: T.ConfigDoc; //does NOT contain modified definitions, they're straight from DB
}
const DefEditor: React.FC<DefEditorProps> = ({gameId, configDoc}) => {
  const [docChanges, setDocChanges] = useState<ConfigDocChanges>({}); 
  const [clonedDoc, setClonedDoc] = useState<T.ConfigDoc>(cloneConfigDocStripMetaAddMandatory);
  //const [gameDisplayName, setGameDisplayName] = useState<string>(configDoc.displayName); 
  const [defToEdit, setDefToEdit] = useState<DefEditObj | null>(null); //null when not editing, defName is empty string when adding new def
  const [showReorderModal, setShowReorderModal] = useState<'props' | 'cols' | null>(null);
  const [showAddDefModal, setShowAddDefModal] = useState<'props' | 'cols' | null>(null);
  const [presentMyAlert, dismissAlert] = useMyAlert(); 
  const [presentMyToast, dismissToast] = useMyToast(); 
  const [loadingPromiseWrapper, dismissLoading] = useLoadingPromise(); 
  const [previewBreakpoint, setPreviewBreakpoint] = useState<T.Breakpoint | undefined>(undefined);
  let defObjBeingEdited: T.ColumnDef | undefined = undefined; //undefined if not editing or if adding new def
  if(defToEdit && defToEdit.defName !== "") {
    defObjBeingEdited = docChanges?.[defToEdit.propOrColPath]?.[defToEdit.defName] || clonedDoc[defToEdit.propOrColPath]?.[defToEdit.defName];
  }

  function cloneConfigDocStripMetaAddMandatory(): T.ConfigDoc {
    let newDoc = cloneDeep<T.ConfigDoc>(configDoc);
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

  useEffect(() => {
    return () => {
      console.log("Unmounting DefEditor, goodbye cruel world");
    }
  }, []);

  // handle conflicting changes to document
  useEffect(() => {
    // if editing def, can finish and close the modal
    if(defToEdit === null && configDoc._rev !== clonedDoc._rev) {
      //Can close these modals without losing anything. Reorderer in particular can bug out if you finish a reorder when defs were added/deletd on the server.
      setShowReorderModal(null);
      setShowAddDefModal(null);

      if(keys(docChanges).length === 0) {
        setClonedDoc(cloneDeep<T.ConfigDoc>(configDoc));
        presentMyToast("Loaded updated configuration from server", undefined, 7000);
      }
      else {
        //Catch order conflicts. Conflict if you changed, they changed, and theirs != yours
        let propOrderConflict, colOrderConflict = false;
        if(docChanges.changedOrders?.universalPropDefs && !isEqual(keys(clonedDoc.universalPropDefs), keys(configDoc.universalPropDefs)) 
           && !isEqual(docChanges.changedOrders.universalPropDefs, keys(configDoc.universalPropDefs))) {
          propOrderConflict = true;
        }
        if(docChanges.changedOrders?.columnDefs && !isEqual(keys(clonedDoc.columnDefs), keys(configDoc.columnDefs)) 
           && !isEqual(docChanges.changedOrders.columnDefs, keys(configDoc.columnDefs))) {
          colOrderConflict = true;
        }

        //check whether a change was made that actually conflicts, or you deleted a def. Should ignore your additions.
        let conflictingProps: string[] = [];
        let conflictingCols: string[] = [];
        let yourChangedOrDeletedProps  = new Set<string>([...docChanges?.deletedDefs?.universalPropDefs || [], ...keys(docChanges?.universalPropDefs || [])]);
        let yourChangedOrDeletedCols  = new Set<string>([...docChanges?.deletedDefs?.columnDefs || [], ...keys(docChanges?.columnDefs || [])]);
        for(const key of yourChangedOrDeletedProps ) {
          if(!isEqual(configDoc.universalPropDefs?.[key], clonedDoc.universalPropDefs?.[key])) {
            conflictingProps.push(key);
          }
        }
        for(const key of yourChangedOrDeletedCols ) {
          if(!isEqual(configDoc.columnDefs?.[key], clonedDoc.columnDefs?.[key])) {
            conflictingCols.push(key);
          }
        }
        if(propOrderConflict || colOrderConflict || conflictingProps.length > 0 || conflictingCols.length > 0) {
          let changedMessage =
            ((conflictingProps.length > 0) ? "<br>-Conflicting changes to universal property definitions " + conflictingProps.join(',') : "") +
            ((conflictingCols.length > 0) ? "<br>-Conflicting changes to move column definitions " + conflictingCols.join(',') : "") +
            (propOrderConflict ? "<br>-Conflicting order of Universal Properties" : "") +
            (colOrderConflict ? "<br>-Conflicting order of move columns" : "");
          presentMyAlert(
            {
              header: "Game configuration has been updated!",
              message: new IonicSafeString("While you were working, someone else updated this game's configuration."+changedMessage+".<br>You can choose whose changes to keep."),
              buttons: [
                { text: 'Discard their changes', handler: () => {setClonedDoc({...clonedDoc, _rev: configDoc._rev})} },
                { text: 'Discard your changes', handler: () => {
                    setClonedDoc(cloneDeep<T.ConfigDoc>(configDoc));
                    setDocChanges({});
                } },
                { text: 'Merge, preferring yours', role: "cancel", handler: () => {
                  //TESTED: you delete they modify (stays deleted but undeleting shows their change). You add, they reorder w/group change. 

                  //Repair order, using adds/dels from new doc. If you changed order, will slap your defs in to keep your additions (so it doesn't think doc deleted them).
                  //Will have your+their additions, keep your deletions in (as it should), and strip their deletions
                  setClonedDoc(cloneDeep<T.ConfigDoc>(configDoc));
                  const repairedChanges = repairChangedOrders(configDoc, true, docChanges);
                  setDocChanges(repairedChanges);
                } },
              ], 
            }
          );
        }
        else { //Definition changes do not conflict. If you changed some other setting, don't care, just take yours.
          //must repair order if you changed order and they made a group change that didn't cause an order change
          //must also repair order if THEY changed order and YOU made a group change that didn't cause an order change
          setClonedDoc(cloneDeep<T.ConfigDoc>(configDoc));
          const repairedChanges = repairChangedOrders(configDoc, false, docChanges);
          setDocChanges(repairedChanges);
          presentMyToast("Loaded and merged updated configuration from server; no conflicts found", undefined, 8000);
        }
      }
    }

    // used when merging a newly-loaded config doc. Keep pure.
    function repairChangedOrders(newDoc: Readonly<T.ConfigDoc>, additionsDeletionsFromDoc: boolean, docChanges: ConfigDocChanges): ConfigDocChanges {
      let newChanges = {...docChanges};
      for(const propOrColPath of ['universalPropDefs', 'columnDefs']) {
        const path = propOrColPath as 'universalPropDefs' | 'columnDefs';
        const changedOrder = docChanges.changedOrders?.[path];
        const defs = (changedOrder && additionsDeletionsFromDoc) ? {...newDoc[path], ...docChanges[path]} : newDoc[path];

        const repairedOrder = repairDefOrder(changedOrder ?? keys(newDoc[path]), defs, additionsDeletionsFromDoc, additionsDeletionsFromDoc);
        set(newChanges, `changedOrders.${path}`, repairedOrder);
        if(isEqual(repairedOrder, keys(configDoc[path]))) { // use configDoc because sometimes newDoc is a merged one just used to get defs in right groups
          delete newChanges.changedOrders?.[path];
        }
      }
      return newChanges;
    }

  }, [configDoc, clonedDoc, docChanges, defToEdit, presentMyAlert, presentMyToast]);

  function uploadDoc() {
    let newConfigDoc: T.ConfigDoc = getUpdatedDoc(clonedDoc, docChanges);

    const [url, method] = getApiUploadConfigUrl(gameId);

    loadingPromiseWrapper(

      makeApiCall(url, method, newConfigDoc).then((res) => {
        console.log(res.message ?? "Success!");
        presentMyAlert("Successfully updated config!");
        setDocChanges({});
      }).catch((err) => {
        console.error(err.message);
        if(err.status === 409) {
          //TODO: update conflict. This page forces use of remote db, but might get conflict if change subscription broke
          //Would still be good to fetch, update clonedDoc, and call this again.
          console.warn('update conflict');
        }
        presentMyAlert( {
          header: "Error",
          message: getIonicSanitizedString(err.message),
        })
      })

    , {message: "Uploading configuration...", duration: 10000});
  }

  function getUpdatedDoc(doc: Readonly<T.ConfigDoc>, changes: Readonly<ConfigDocChanges>): T.ConfigDoc {
    let result = {...doc};
    let newUniversalPropDefs: Record<string, T.ColumnDef> = {};
    let newColumnDefs: Record<string, T.ColumnDef> = {};

    result.displayName = changes.displayName ?? result.displayName;

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
    //console.log("Called updateDef with def " + JSON.stringify(def));
    if(!defToEdit) return "Error finding definition to edit";
    const path = defToEdit.propOrColPath;
    let newChanges = cloneDeep<ConfigDocChanges>(docChanges);
    set(newChanges, `${path}.${def.columnName}`, def); 

    //return error if trying to give new, non-suggested def a name that's already in use
    if(defToEdit.defName !== def.columnName && keys({...clonedDoc[path], ...docChanges[path]}).includes(def.columnName)) {
      return "Column ID "+def.columnName+" is already in use.";
    }

    //If def is just being added now, put new def in order at end of its group
    if(defToEdit.wasAdded && !docChanges?.[path]?.[defToEdit.defName]) {
      let order: string[] = docChanges.changedOrders?.[path] || keys(clonedDoc[path]);
      order.push(def.columnName);
      let repairedOrder = repairDefOrder(order, {...clonedDoc[path], ...newChanges[path]});
      set(newChanges, `changedOrders.${path}`, repairedOrder);
      //console.log(`Added column ${def.columnName} to order, new order is ${newChanges.changedOrders![path]}`);
    }
    else if(defToEdit.defName !== def.columnName) { //if trying to change name of existing column
      let oldName = defToEdit.defName;
      let newName = def.columnName;
      if(defToEdit.wasAdded) {
        delete newChanges[path]?.[oldName];
        let changedOrder = docChanges.changedOrders?.[path];
        if(changedOrder) {
          changedOrder = changedOrder.map((val) => (val === oldName) ? newName : val);
          set(newChanges, `changedOrders.${path}`, changedOrder);
        }
      }
      else {
        return "Cannot change name of already-uploaded column " + oldName + " to " + newName;
      }
      //UI ensures can't change column that's been deleted
    }
    setDocChanges(newChanges);
    return false;
  }, [defToEdit, docChanges, clonedDoc]);


  const deleteDefCallback = useCallback((defName: string) => {
    console.log("Called deleteDef for def " + defName);
    if(!defToEdit) return;
    let newChanges = cloneDeep<ConfigDocChanges>(docChanges);
    //set(newChanges, `${defToEdit.propOrColPath}.${defName}`, undefined);
    const orderArrayLength = newChanges?.deletedDefs?.[defToEdit.propOrColPath!]?.length ?? 0;
    set(newChanges, `deletedDefs.${defToEdit.propOrColPath}[${orderArrayLength}]`, defName);
    setDocChanges(newChanges);
  }, [defToEdit, docChanges]);


  //Undoes changes to existing columns, deletes newly-added columns. Makes appropriate changes to order.
  //If un-deleting an existing column, doesn't undo previous changes to it.
  const resetDefCallback = useCallback((defName: string) => {
    console.log("Called resetDef for def " + defName);
    if(!defToEdit || !defToEdit.propOrColPath) return;
    const path = defToEdit.propOrColPath;
    let newChanges = cloneDeep<ConfigDocChanges>(docChanges);

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
        else if(docChanges[path]?.[defName] && docChanges[path]?.[defName]?.group !== clonedDoc[path][defName]?.group) {
          presentMyAlert(`Column ${defName} was moved to back to group ${clonedDoc[path][defName]?.group}, please check its order inside the group`);
          let repairedOrder = repairDefOrder(changedOrder, {...clonedDoc[path], ...newChanges[path]});
          set(newChanges, `changedOrders.${path}`, repairedOrder);
        }
      }
    }
    setDocChanges(newChanges);
  }, [clonedDoc, defToEdit, docChanges, presentMyAlert]);


  const setDocChangesCallback = useCallback((changes: ConfigDocChanges) => {
    setDocChanges(changes);
  }, [])

  const resetDocChangesCallback = useCallback(() => {
    presentMyAlert(
      {
        header: "Discard changes?",
        message: "Would you like to discard your changes?",
        buttons: [
          { text: 'No', role: 'cancel' },
          { text: 'Discard', handler: () => { setDocChanges({}); } },
        ]
      }
    )
  }, [presentMyAlert])

  function chooseBreakpoint(e: any) {
    setPreviewBreakpoint(e.detail.value !== "undefined" ? e.detail.value as T.Breakpoint : undefined);
  }

  function updateDisplayName(displayName: string) {
    let newChanges: ConfigDocChanges = {...docChanges, displayName: displayName};
    if(displayName === configDoc.displayName) {
      delete newChanges.displayName;
    }
    setDocChanges(newChanges);
  }

  const setDefToEditCallback = useCallback((editObj: DefEditObj) => {
    setDefToEdit(editObj);
  }, []);

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

        <Prompt 
          when={keys(docChanges).length !== 0}
          message="You have unsubmitted changes. Would you like to proceed?"
        />

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
          <IonItem color="danger"><IonIcon slot="start" ios={warningOutline} md={warningSharp} /><span>Only game admins can change configuration. You can look at the configuration, but <b>cannot upload any changes</b>.</span></IonItem>
        )}
        />
        <IonButton onClick={resetDocChangesCallback} type="reset" expand="full" disabled={keys(docChanges).length === 0} >Undo all changes</IonButton>


        <IonItem counter={true}>
          <IonLabel position="floating">Game Display Name</IonLabel>
          <IonInput name="displayName" type="text" required={true} maxlength={50} minlength={2} value={docChanges.displayName ?? configDoc.displayName}
            onIonChange={e => updateDisplayName(e.detail.value!)}
          ></IonInput>
          {/*<IonNote slot="error">{charNameErr}</IonNote>*/}
          <IonNote slot="helper">Name of game as displayed to users</IonNote>
        </IonItem>


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
      </IonContent>
    </HeaderPage>
    </>
  );
}


export default DefEditor;
