import React, { useEffect, useState, useCallback, useRef } from 'react';
import { IonContent, IonFooter, IonToolbar, IonRow, IonList, IonListHeader, IonNote, IonItem, IonIcon, IonLabel, IonInput, IonButton } from '@ionic/react';
import { useDoc } from 'use-pouchdb'
import { useParams, useHistory } from 'react-router';
import { Prompt } from 'react-router-dom';
import { Editor } from '@tinymce/tinymce-react';
import { Editor as TinyMCEEditor } from 'tinymce';
import { useMyAlert, useMyToast, useLoadingPromise } from '../services/hooks';
import * as util from '../services/util';
import * as myPouch from '../services/pouch';
import HeaderPage from '../components/HeaderPage';
import NeedPermissions from '../components/NeedPermissions';
import { HtmlPageRenderer } from './HtmlPage';
import CompileConstants from '../constants/CompileConstants';
import { HtmlPageDoc } from '../types/characterTypes'; //==
import { cloneDeep, isEqual } from 'lodash';

type EditHtmlPageProps = {
  gameDisplayName: string;
  existingDoc?: HtmlPageDoc;
}

export const EditHtmlPage = ({gameDisplayName, existingDoc}: EditHtmlPageProps) => {
  //const [workingDoc, setWorkingDoc] = useState<HtmlPageDoc>(getInitialWorkingDoc); // NAH. TinyMCE runs better as an uncontrolled component.
  const { gameId } = useParams<{ gameId: string }>(); 
  const history = useHistory();
  const [presentMyAlert, dismissAlert] = useMyAlert(); 
  const [presentMyToast, ] = useMyToast(); 
  const [loadingPromiseWrapper, ] = useLoadingPromise(); 

  const editorRef = useRef<TinyMCEEditor | null>(null);

  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);

  const [pageId, setPageId] = useState<string>(util.getHtmlPageIdFromDocId(existingDoc?._id ?? 'pages/'));
  const [pageIdErr, setPageIdErr] = useState<string | null>(null); 
  const [title, setTitle] = useState<string>(existingDoc?.title ?? 'New Page');
  const [titleErr, setTitleErr] = useState<string | null>(null); 

  const isFrontPage = existingDoc && existingDoc._id === CompileConstants.GAME_FRONTPAGE_DOC_ID; // TODO: make frontpage always exists, is never being added
  const canUpdateId = !existingDoc;
  const canUpdateTitle = !isFrontPage;
  

  useEffect(() => {
    let pageIdMatch = CompileConstants.ALLOWED_PAGE_ID_REGEX.test(pageId);
    setPageIdErr(pageIdMatch ? null : 'Must be between 1-25 characters, which must be lowercase alphanumeric or ~_-. (no spaces)');
  }, [pageId]);

  useEffect(() => {
    let titleMatch = CompileConstants.ALLOWED_PAGE_TITLE_REGEX.test(title);
    setTitleErr(titleMatch ? null : 'Must be between 2-50 characters, no tabs or line breaks');
  }, [title]);


  function submit() {
    if(!editorRef.current) return;
    const [url, method] = existingDoc ? util.getApiUpdateHtmlPageUrl(gameId, pageId) : util.getApiAddHtmlPageUrl(gameId);
    const doc: HtmlPageDoc = {
      _id: util.getHtmlPageDocId(pageId),
      _rev: existingDoc?._rev,
      title: title,
      html: editorRef.current.getContent(),
      updatedBy: '',
      updatedAt: ''
    }

    loadingPromiseWrapper(

        myPouch.makeApiCall(url, method, doc).then((resp) => {
          setDirty(false);

          presentMyAlert(resp.message, [ 
            {text: 'OK', role: 'cancel'},
            {text: 'View Page', handler: () => {
              //navigate to page
              let url = util.getHtmlPageUrl(gameId, pageId);
              history.push(url); 
            }}
          ]);

        }).catch((err) => {
          console.log(`Error uploading, ${JSON.stringify(err)}`);
          presentMyToast(err.message, 'danger');
        })
    , {message: "Updating page...", duration: 10000});
  }

  const log = () => {
    if (editorRef.current) {
      console.log(editorRef.current.getContent());
    }
  };


  // Always render Editor even if previewing, otherwise it unmounts and loses content. Just hide editing elements.
  return (
    <HeaderPage title={preview ? "Previewing " + title : (existingDoc?.title ?? "New Page")}>
      <IonContent fullscreen>
        <NeedPermissions permissions={"GameAdmin"}>

          <Prompt 
            when={dirty}
            message="You have unsubmitted changes. Would you like to proceed?"
          />

          {preview ?

            <HtmlPageRenderer doc={{
              _id: util.getHtmlPageDocId(pageId),
              _rev: '',
              title: title,
              html: editorRef.current?.getContent() ?? 'null editor ref',
              updatedBy: '',
              updatedAt: ''
            }} />

            :

            <>
              <IonItem counter={true} className={pageIdErr && pageId ? 'ion-invalid' : '' }>
                <IonLabel position="floating">Page ID (required)</IonLabel>
                <IonInput name="pageId" type="text" required={true} maxlength={25} value={pageId} disabled={!canUpdateId}
                  onIonChange={e => setPageId(e.detail.value!)}
                ></IonInput>
                <IonNote slot="error">{pageIdErr}</IonNote>
                <IonNote slot="helper">Unique identifier used in URLs. Cannot be changed.</IonNote>
              </IonItem>

              <br />

              <IonItem counter={true} className={titleErr && title ? 'ion-invalid' : '' }>
                <IonLabel position="floating">Page Title (required)</IonLabel>
                <IonInput name="title" type="text" required={true} maxlength={35} value={title} disabled={!canUpdateTitle}
                  onIonChange={e => setTitle(e.detail.value!)}> </IonInput>
                <IonNote slot="helper">Title of page shown to users. Displayed in menus and at top of page. Can be changed later.</IonNote>
                <IonNote slot="error">{titleErr}</IonNote>
              </IonItem>

              <br />
              <br />
            </>
          }

          <div style={preview ? {display: 'none'} : {}}>
            <Editor
              apiKey='sk65kkhtxrxcat2wsoyp6p1rx3c4me80ta0n00lslo901yyb'
              onInit={(evt, editor) => { editorRef.current = editor; }}
              onDirty={() => {setDirty(true); console.log("making dirty")}}
              onUndo={(evt, editor) => {if(!editor.undoManager.hasUndo()) setDirty(false)}}
              onRedo={(evt, editor) => {setDirty(true)}}
              initialValue={existingDoc?.html ?? "<p>Enter page content here</p>"}
              init={{
                height: 500,
                menubar: false,
                plugins: [
                  'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 
                  'anchor', 'visualblocks', 'fullscreen',
                  'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                ],
                toolbar: 'undo redo | blocks | ' +
                  'bold italic forecolor | alignleft aligncenter ' +
                  'alignright alignjustify | bullist numlist outdent indent | ' +
                  'removeformat | help',
                //content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
              }}
            />
          </div>

          <button onClick={log}>Log editor content</button> 
          {dirty && <i>You have unsaved changes</i>}

        </NeedPermissions>
      </IonContent>

      <IonFooter>
        <IonToolbar>
          <IonRow class="ion-justify-content-center">

            <IonButton onClick={() => setPreview(!preview)}>
              {preview ? "Edit" : "Preview"}
            </IonButton>

            <IonButton disabled={!existingDoc} routerLink={existingDoc ? util.getHtmlPageUrl(gameId, pageId) : ''}>
              View Existing Page
            </IonButton>

            <IonButton disabled={!dirty} type="submit" onClick={submit}>
              Submit
            </IonButton>

          </IonRow>
        </IonToolbar>
      </IonFooter>
    </HeaderPage>
  );
}



type EditExistingHtmlPageProps = {
  gameDisplayName: string;
}
export const EditExistingHtmlPage = ({gameDisplayName}: EditExistingHtmlPageProps) => {
  const { gameId, pageId } = useParams<{ gameId: string, pageId: string; }>(); 
  const { doc, loading, state, error } = useDoc<HtmlPageDoc>(util.getHtmlPageDocId(pageId), {db: 'remote'}); //must use remote to edit

  if (loading && !doc) {
    return (<HeaderPage title={"Editing "+pageId} contentMessage="Loading..." />)
  }

  if (state === 'error') {
    console.log(`Err in EditExistingHtmlPage, ${JSON.stringify(error)}\``);
    //if(error?.reason === 'missing') {
      //return (
        //<EditHtmlPage gameId={gameId} gameDisplayName={gameDisplayName} />
      //)
    //}
    return (
    <HeaderPage title="Page missing" contentMessage={"Error: " + error?.message} retryButton={true} />
      //<IonContent fullscreen>
        //<div>Error: {error?.message}</div>
        //<IonButton type="button" onClick={() => history.go(0)}>Retry</IonButton>
      //</IonContent>
    //</HeaderPage>
    );
  }

  return (
    <EditHtmlPage gameDisplayName={gameDisplayName} existingDoc={doc ?? undefined} />
  )
}

//export default EditHtmlPage;
