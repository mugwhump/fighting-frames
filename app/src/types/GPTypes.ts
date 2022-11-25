import { DBStatus, initialDBStatus } from '../components/GameProvider';


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
