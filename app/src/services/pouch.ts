import PouchDB from 'pouchdb';
import PouchAuth from 'pouchdb-authentication';

// also currently have admin:password
export const remote: string = 'http://public:password@localhost:5984/';
PouchDB.plugin(PouchAuth);

export function getDB(name: string): PouchDB.Database {
  let db: PouchDB.Database;
  // if local DB by this name doesn't exist, makes one
  db = new PouchDB(name, {auth: {username: 'admin', password: 'password'}}); //creds are bein used for top menu
  // give it a url instead of name and it acts as client and tries to make remote db if none exists
  // Does not make local db by default
  //db = new PouchDB('http://admin:password@localhost:5984/' + name, {auth: {username: 'admin', password: 'password'}});
  console.log("---------CALLED getDB for " + name + "-----------");
  return db;
}

//TODO: sync and replicate are async! Switch these to use promises or (maybe better) async functions with await
//docs don't show db creation being async but deletion is for some reason, double-check that

export function syncDB(db: PouchDB.Database, live: boolean) {
  let options = {
    live: live, // This option makes it continuously push/pull changes
    retry: true,
    continuous: true
  };

  // sync is just short hand for db.replicate.to(otherDb) and db.replicate.from(otherDb)
  db.sync(remote + db.name, options);
  return db;
}

export function pullDB(db: PouchDB.Database) {
  db.replicate.from(remote + db.name);
  return db;
}

export function pushDB(db: PouchDB.Database) {
  db.replicate.to(remote + db.name);
  return db;
}
