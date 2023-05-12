import React  from 'react';
import { Provider } from 'use-pouchdb'
import * as myPouch from '../services/pouch';
type DBProviderProps = {
  db: string,
  children: React.ReactNode
}

//UNUSED
const DBProvider: React.FC<DBProviderProps > = ({db, children}) => {
  const localDb : PouchDB.Database = myPouch.getDB("local-" + db);
  const remoteDb : PouchDB.Database = myPouch.getDB(myPouch.remote + db);
  console.log("initialize DBProvider. Name = "+db);

  return (
    <Provider default="remote" databases={{local: localDb, remote: remoteDb}}>
      {children}
    </Provider> 
  );
};

export default DBProvider;
