import { useIonViewDidEnter, IonButtons, IonHeader, IonContent, IonMenuButton, IonPage, IonTitle, IonToolbar, IonButton } from '@ionic/react';
import React  from 'react';
import { useHistory } from 'react-router';

type HeaderPageProps  = {
  title: string,
  children?: React.ReactNode;
  contentMessage?: string;
  retryButton?: boolean;
}

const HeaderPage: React.FC<HeaderPageProps > = ({title, children, contentMessage, retryButton}) => {
  const history = useHistory();
  if(contentMessage) {
    if(children) throw new Error(`Error in HeaderPage ${title}, do not provide both children and contentMessage ${contentMessage}`);
  }
  else {
    if(retryButton) throw new Error(`Error in HeaderPage ${title}, must provide contentMessage with retryButton`);
  }
  //useIonViewDidEnter(() => {
    //console.log("HeaderPage IonViewDidEnter fired");
  //});

  return (
    <IonPage>
      <IonHeader> 
        <IonToolbar>
          <IonButtons slot="start">
          {/* if no menu specified, button attaches to active view/outlet */}
          {/* if specified menu points to inactive/nonexistent view/routeroutlet, button doesn't show */}
            <IonMenuButton auto-hide={true} />
          </IonButtons>
          <IonTitle>{title}</IonTitle>
        </IonToolbar>
      </IonHeader>

      {children}

      {contentMessage &&
        <IonContent fullscreen>
          <div>{contentMessage}</div>
          {retryButton &&
            <IonButton type="button" onClick={() => history.go(0)}>Retry</IonButton>
          }
        </IonContent>
      }

    </IonPage>
  );
};

export default HeaderPage;
