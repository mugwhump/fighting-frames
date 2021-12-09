export function shallowCompare(obj1: any, obj2: any): boolean {
  if(!obj1 && !obj2) { //true if both null/undefined
    return true;
  }
  else {
    return (obj1 && obj2) && //false if only one null/undefined
    Object.keys(obj1).length === Object.keys(obj2).length &&
    Object.keys(obj1).every(key => 
      obj2.hasOwnProperty(key) && obj1[key] === obj2[key]
    );
  }
}

// This is not actually needed, problems were with pouch deserializing as a basic Set
//export function myStringify(obj: Object): string {
  //return JSON.stringify(obj, function(key, value){
    //if(value && typeof value.toJSON === 'function') {
      //return value.toJSON();
    //}
    //else {
      //return JSON.stringify(value);
    //}
  //});
//}
