import PouchDB from 'pouchdb';

export const remote: string = 'http://admin:password@localhost:5984/';

export function getDB(name: string): PouchDB.Database {
  let db: PouchDB.Database;
  // if local DB by this name doesn't exist, makes one
  db = new PouchDB(name, {auth: {username: 'admin', password: 'password'}});
  // give it a url instead of name and it acts as client and tries to make remote db if none exists
  // Does not make local db by default
  //db = new PouchDB('http://admin:password@localhost:5984/' + name, {auth: {username: 'admin', password: 'password'}});
  return db;
}

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
