var express = require('express');
var router = express.Router();
const { secrets } = require("docker-secret");
const admin = secrets.couch_admin;
const password = secrets.couch_password;
const nano = require('nano')(`http://${admin}:${password}@`+process.env.COUCHDB_URL); //TODO: put inside each API call?

/* GET api listing. */
router.get('/', function(req, res, next) {
  res.send('COUCHDB_URL = '+process.env.COUCHDB_URL+', secrets = '+admin+', '+password);
});
router.get('/test', function(req, res, next) {
  nano.db.list().then((dblist) => {
    res.send('list = '+JSON.stringify(dblist));
  }).catch((err) => {
    res.send('you made a booboo, '+err.message);
  });
});

module.exports = router;
