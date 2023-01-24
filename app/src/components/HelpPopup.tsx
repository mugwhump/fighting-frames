import { IonPopover, IonIcon, IonButton, IonContent } from '@ionic/react';
import React, { useState, useRef } from 'react';
import { helpBuoyOutline, helpCircleOutline, helpCircleSharp } from 'ionicons/icons';


type HelpPopupProps = {
  children?: React.ReactNode,
}

export const HelpPopup: React.FC<HelpPopupProps> = ({children}) => {
  const popover = useRef<HTMLIonPopoverElement>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const openPopover = (e: any) => {
    popover.current!.event = e;
    setPopoverOpen(true);
  };

  return (
    <>
      {/*<IonButton onClick={openPopover}><IonIcon ios={helpCircleOutline} md={helpCircleSharp} /></IonButton>*/}
      <IonIcon size="large" onClick={openPopover} ios={helpCircleOutline} md={helpCircleSharp} />
      <IonPopover ref={popover} isOpen={popoverOpen} onDidDismiss={() => setPopoverOpen(false)}>
        <IonContent class="ion-padding">{children}</IonContent>
      </IonPopover>
    </>
  );
}

export default HelpPopup;
