//import { IonRow, IonItemSliding, IonItemOptions, IonItemOption, IonCol, IonItem, IonIcon } from '@ionic/react';
import React, {} from 'react';
//import { createOutline } from 'ionicons/icons';
import * as T from '../types/characterTypes';
import { colDataToPrintable } from '../services/util';
//import styles from '../theme/Character.module.css';

export type DataRendererProps = {
  defData: T.ColumnDefAndData, 
}
// This will help render tag lists
const DataRenderer: React.FC<DataRendererProps> = ({defData}) => {
  return <>{colDataToPrintable(defData)}</>;
}
export default DataRenderer;
