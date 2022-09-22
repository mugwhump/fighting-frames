//var express = require('express');
//var router = express.Router();
//const SuperLogin = require('@sensu/superlogin');
const { CouchAuth } = require('@perfood/couch-auth');
const { secrets } = require("docker-secret");
const admin = secrets.couch_admin;
const adminPassword = secrets.couch_password;
const mailFrom = secrets.mail_from_address;
const mailApiKey = secrets.mail_api_key;

/* GET home page. */
//router.get('/', function(req, res, next) {
  ////res.render('index', { title: 'Express' });
  //res.send('Welcome to superlogin, COUCHDB_URL = '+process.env.COUCHDB_URL+', secrets = '+admin+', '+adminPassword);
//});

// see https://github.com/colinskow/superlogin/blob/master/config.example.js for all options and their default values
const config = {
  dbServer: {
    protocol: 'http://',
    host: process.env.COUCHDB_URL,
    user: admin,
    password: adminPassword,
    userDB: 'sl-users',
    couchAuthDB: '_users'
  },
  mailer: {
    fromEmail: mailFrom,
    // ethereal test mail
    options: {
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: mailFrom, 
        pass: mailApiKey, 
      }
    },
    // Can't activate my SendinBlue SMTP account until I can submit ticket w/ my website, skip for now
    /*options: {
      service: 'SendinBlue',
      auth: {
        //apiKey: mailApiKey // I'm using SMTP, not the SendinBlue api
        user: mailFrom,
        pass: mailApiKey
      }
    }
    */
  },
  // Personal per-user DBs. 
  //userDBs: {
    //defaultDBs: { // DBs to create by default upon signup
      //private: ['supertest'] //just for user
      //shared: ['errybodysDB'] //shared DB this user should get access to
    //}
  //},
  security: {
    defaultRoles: ['user', 'read'], //I keep user in case superlogin expects it
    //Other options about login lockout, session life, etc
    sessionLife: 3700, //50 seconds for testing
  },
  local: { //settings for couchAuth's internal user registration (aka when not signing in with google, FB, etc)
    emailUsername: false, // store the username in the database instead of an auto-generated key
    usernameLogin: true, // allow login with username
    sendConfirmEmail: true,
    requireEmailConfirm: false,
    // If this is set, the user will be redirected to this location after confirming email instead of JSON response
    confirmEmailRedirectURL: '/',
    //passwordContraints: { various password restrictions }
  },
  emails: {
    confirmEmail: {
      subject: 'Please confirm your email',
      //template: path.join(__dirname, './templates/email/confirm-email.ejs'),
      // 'text' or 'html'
      format: 'text'
    },
    //forgotPassword: {} same format as above
  },
  testMode: {
    noEmail: false,
    oauthDebug: true, //debug info in oauth dialogs
    debugEmail: true //logs outgoing emails to console
  }
};

const couchAuth = new CouchAuth(config);

module.exports = couchAuth;
