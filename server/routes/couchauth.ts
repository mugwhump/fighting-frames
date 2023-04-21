//var express = require('express');
//var router = express.Router();
//const SuperLogin = require('@sensu/superlogin');
import { CouchAuth } from '@perfood/couch-auth';
import { Config } from '@perfood/couch-auth/lib/types/config';
import { secrets } from "docker-secret";
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
const config: Config = {
  dbServer: {
    protocol: 'http://',
    host: process.env.COUCHDB_URL!,
    //publicURL: 'https://mydb.example.com', //even if backend uses localhost, client code obv can't. Only needed if couch-auth is giving users db addresses (like for personal dbs)
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
        pass: 'CUMCUMCUM',//mailApiKey, TODO: TESTING, does couch-auth's register route not catch error from calling sendEmail() from insertNewUserDocument() in user.ts?
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
    sessionLife: 3700, //50 seconds for testaroonis
    //if true couch-auth forwards errors to node err handler instead of sending response, test with requireAuth failures
    //Don't use without a custom error handler, node's default returns an html string
    forwardErrors: false, 
  },
  local: { //settings for couchAuth's internal user registration (aka when not signing in with google, FB, etc)
    emailUsername: false, // store the username in the database instead of an auto-generated key
    usernameLogin: true, // allow login with username instead of email TODO: maybe disable, this makes account-guessing easier
    sendConfirmEmail: true,
    requireEmailConfirm: false, //TODO: couch-auth is making the confirm url https, fails locally. It IS an api endpoint that users must GET via browser link...
    // If this is set, the user will be redirected to this location after confirming email instead of JSON response
    confirmEmailRedirectURL: process.env.FRONTEND_URL!+'/page/confirmed', //this is a frontend page showing success message, different from the api url used to actually confirm
    //passwordContraints: { various password restrictions }
  },
  emailTemplates: {
    templates: {
      confirmEmail: {
        subject: 'Please confirm your email',
      },
      //forgotPassword: {} same format as above
    }
  },
  userModel: {
    validate: {
      username: { //by default couch-auth trims username, forbids starting underscore, and must match /^[a-z0-9_-]{3,16}$/
        exclusion: {
          within: ['public', 'password', 'admin', '_admin', 'replicator-guy'],
          message: "^Cannot use that username"
        }
      }
    }
  },
  testMode: {
    noEmail: false,
    oauthDebug: true, //debug info in oauth dialogs
    debugEmail: true //logs outgoing emails to console
  }
};

const couchAuth = new CouchAuth(config);

export default couchAuth;
