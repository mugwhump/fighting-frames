//import { IonRow, IonItemSliding, IonItemOptions, IonItemOption, IonCol, IonItem, IonIcon } from '@ionic/react';
import React, {} from 'react';
//import { createOutline } from 'ionicons/icons';
import * as T from '../types/characterTypes';
import { getNumStrColRegex, getTagStrColRegex, colDataToPrintable, isBasicString, isNumber, isNumericString, isTagString, isList, parseNumStrVal, parseTagStrList } from '../services/columnUtil';
import styles from '../theme/Character.module.css';

export type DataRendererProps = {
  defData: T.ColumnDefAndData, 
}
// This will help render tag lists
const DataRenderer: React.FC<DataRendererProps> = ({defData}) => {
  const prefix = defData.data && defData.def?.prefix;
  const suffix = defData.data && defData.def?.suffix;
  let renderedData = null;
  if(!defData.data || !defData.def) {
    renderedData = colDataToPrintable(defData);
  }
  else if(isNumericString(defData.data, defData.def.dataType)) {
    const regex = defData.def?._compiledNumStrRegex || getNumStrColRegex(defData.def);
    const match = regex.exec(defData.data)?.[0] ?? false;
    if(match) {
      renderedData = <><span className={styles.numStrVal}>{match}</span><span>{defData.data.substring(match.length)}</span></>
    }
    else renderedData = defData.data;
  }
  else if(isTagString(defData.data, defData.def.dataType)) {
    const regex = defData.def?._compiledTagStrRegex || getTagStrColRegex(defData.def);
    //TODO: could also use IonicSafeString to just insert tags into the string
    const html = defData.data.split(regex)
      .map((substr, index) => {
        return index % 2 !== 0
        ? <span key={index} className={styles.tagStrTag}>{substr}</span>
        : <React.Fragment key={index}>{substr}</React.Fragment>
      });
    renderedData = html;
  }
  else {
    renderedData = colDataToPrintable(defData);
  }

  return <>
    {prefix && <span className={styles.dataPrefix}>{prefix}</span>}
    <span className={styles.dataVal}>{renderedData}</span>
    {suffix && <span className={styles.dataSuffix}>{suffix}</span>}
  </>;
}
export default DataRenderer;
