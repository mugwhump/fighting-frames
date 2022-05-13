import { DBStatus, initialDBStatus } from '../components/GameProvider';


//fixes JSON.stringify for Set<string>. Still can't use for(let i in set), must use for...of
//Pouch says it and couch don't store objs with own classes or special getter/setters, seems to turn this into normal Set<string> for storage.
//https://pouchdb.com/errors.html#could_not_be_cloned
export class StringSet extends Set<string> {
  toJSON() {
    return [...super.values()];
  }
}

//Map with a custom get() method that creates a default value if the db key isn't there
export class DBStatuses extends Map<string, DBStatus> {
  get(key: string): DBStatus {
    const val = super.get(key);
    if(val === undefined) {
      console.log("creating DBStatus for key "+key);
      const newVal = {...initialDBStatus};
      super.set(key, newVal);
      return newVal;
    }
    else {
      return val;
    }
  }
  toJSON() {
    return Array.from(super.entries());
  }
}

export type FieldError = {
  columnName: string;
  message: string;
}
//cannot override [] accessor without proxies, and then my custom accessor gives false positives if anything checks for existence of property, eg stringify checking for toJSON
//Also cannot add custom methods to children of Records since method is another property whose value is expected to be the Record's value type
//type DBStatuses = Record<string, DBStatus>; 


//export class MoveChanges extends Map<string, ColumnChange> {
  //public moveName: string;
  //constructor(name: string, changes?: [string, ColumnChange][]) {
    //super(changes);
    //this.moveName = name;
    //// Typescript recommends this for anything extending builtin types
    //Object.setPrototypeOf(this, ColumnChanges.prototype);
  //}
  ////override set to check that key matches columnNames and types are correct
  //set(key: string, change: ColumnChange): this {
    //if(change.type === "modify") {
      ////if(!change.new || !change.old) throw new Error("Modifying change must have both new and old data");
      //if(key !== change.new.columnName || key !== change.old.columnName) throw new Error("key does not match column names");
      //super.set(key, change);
    //}
    //else if(change.type === "add") {
      ////if(!change.new || change.old) throw new Error("Adding change must have new but no old data");
      //if(key !== change.new.columnName) throw new Error("key does not match column names");
      //super.set(key, change);
    //}
    //else if(change.type === "delete") {
      ////if(change.new || !change.old) throw new Error("Deleting change must have old but no new data");
      //if(key !== change.old.columnName) throw new Error("key does not match column names");
      //super.set(key, change);
    //}
    //return this;
  //}
  //toJSON() {
    //return Array.from(super.entries());
  //}
//}
