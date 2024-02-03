import { CouchAuth } from '@perfood/couch-auth';
import { Config } from '@perfood/couch-auth/lib/types/config';
import { secrets } from "docker-secret";
import logger from '../util/logger';
const admin = secrets.couch_admin;
const adminPassword = secrets.couch_password;
const couch_replicator_user = secrets.couch_replicator_user;
const mailFrom = secrets.mail_from_address;
const mailUser = secrets.mail_user;
const mailApiKey = secrets.mail_api_key;

const useMailHog = (process.env.NODE_ENV !== 'production');

// see https://github.com/perfood/couch-auth/blob/master/src/config/default.config.ts for all options and their default values
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
    // in development, catch mails w/ mailhog.
    options: useMailHog ? 
      {
        host: "mailhog",
        port: 1025,
      }
      :
      {
        host: "live.smtp.mailtrap.io",
        port: 587,
        //secure: false, // true for 465, false for other ports
        auth: {
          user: mailUser,
          pass: mailApiKey
        }
      }
      /* { //ethereal sux
        host: "smtp.ethereal.email",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: mailFrom, 
          pass: mailApiKey, //TODO: couch-auth's register route doesn't catch error from calling sendEmail() from insertNewUserDocument() in user.ts, hangs server
        }
      } ,
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
          within: ['public', 'password', '_admin', 'replicator', admin, couch_replicator_user],
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


//if (useEtherealMail){
  //createTestAccount((err, account) => {
    //if(err) logger.error("Failed to create ethereal test account: " + err.message);
    //else {
      //config.mailer!.options =
      //{
        //host: "smtp.ethereal.email",
        //port: 587,
        //secure: false, // true for 465, false for other ports
        //auth: {
          //user: account.user, 
          //pass: account.pass, 
        //}
      //}
    //}
  //});
//}

const couchAuth = new CouchAuth(config);

export default couchAuth;
