import React from 'react';
import MoveOrUniversalProps, { MoveProps } from './MoveOrUniversalProps';

//returns filtered name, whether it's a category, and # of indentation levels
//export function extractName (name: string): [string, boolean, number] {
  //if(name.charAt(0) === ':') {
    //return [name.replace(":", ""), true, 0]; //only first occurence replaced
  //}
  //else {
    //let indent = 0;
    //for(let i=0; i<name.length; i++) {
      //if (name.charAt(i) === '-') {
        //indent++;
      //}
      //else {
        //break;
      //}
    //}
    //return [name.slice(indent), false, indent];
  //}
//}

type CatMoveProps = {
  name: string;
  isCategory?: boolean;
  children: React.ReactNode;
}
export const CategoryAndChildRenderer: React.FC<CatMoveProps> = ({name, isCategory, children}) => {
  return (
    <>
    { isCategory ?
      <div>--------{name}----------</div>
    :
      <>{children}</>
    }
    </>
  );
}
export default CategoryAndChildRenderer;
