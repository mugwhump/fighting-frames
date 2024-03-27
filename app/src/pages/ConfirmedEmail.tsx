import React, { useEffect, useState } from 'react';
import { IonContent, IonList, IonListHeader, IonItem, IonLabel, IonNote } from '@ionic/react';
import { useQuery, useChangeDocOrReversion, useMyAlert } from '../services/hooks';
import HeaderPage from '../components/HeaderPage';
import styles from '../theme/General.module.css'


const ConfirmedEmail: React.FC<{}> = () => {
  // Query string can include stuff like error=Invalid%20token
  const query = useQuery();
  const error: string | null = query.get('error');

  return (
    <HeaderPage title={error? "Error confirming email" : "Confirmed"}>
      <IonContent fullscreen>
        {error ?
          (<IonItem color="danger"><IonLabel>Error: {error}</IonLabel></IonItem>)
          : (<IonItem><IonLabel>Email confirmed! Your account is now verified.</IonLabel></IonItem>)
        }
        {/*<div className={styles['content-padding']}> </div>*/}
      </IonContent>
    </HeaderPage>
  );
}

export default ConfirmedEmail;

