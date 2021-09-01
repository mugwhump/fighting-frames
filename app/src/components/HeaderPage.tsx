import { useIonViewDidEnter, IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import React  from 'react';
type HeaderPageProps  = {
  title: string,
  children: React.ReactNode
}

const HeaderPage: React.FC<HeaderPageProps > = ({title, children}) => {
  useIonViewDidEnter(() => {
    //console.log("HeaderPage IonViewDidEnter fired");
  });

  return (
    <IonPage>
      <IonHeader> 
        <IonToolbar>
          <IonButtons slot="start">
          {/* if no menu specified, button attaches to active view/outlet */}
          {/* if specified menu points to inactive/nonexistent view/routeroutlet, button doesn't show */}
            <IonMenuButton auto-hide={false} />
          </IonButtons>
          <IonTitle>{title}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        {children}
      </IonContent>
    </IonPage>
  );
};

export default HeaderPage;
