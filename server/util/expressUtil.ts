import express, { Express, Request, Response, NextFunction } from 'express';
import logger from './logger';
import * as Security from '../shared/services/security';
import http from 'http';
import { secrets } from "docker-secret";
import couchAuth from '../routes/couchauth';
import * as CouchAuthTypes from '@perfood/couch-auth/lib/types/typings';
import { cloneDeep, isEqual } from 'lodash';
import * as Nano from 'nano';
import type * as T from '../shared/types/characterTypes'; //= //not included in runtime buildo
import type { ApiResponse, PublishChangeBody } from '../shared/types/utilTypes'; //= 

const admin = secrets.couch_admin;
const password = secrets.couch_password;
//This object persists between requests, so don't modify its configuration
//TODO: test if 2 different reqs at same time use different dbs? I'd guess adminNano.use() returns a new DocumentScope object
export const adminNano = Nano.default(`http://${admin}:${password}@`+process.env.COUCHDB_URL); 
//Nano appears to be smart enough to hide credentials when stringifying object but I'll disallow it anyway.
(adminNano as any).toJSON = () => "Not stringifying nano object";

//can configure http pool size, by default has infinite active connections
//const myagent = new http.Agent({
  //keepAlive: true,
  //maxSockets: 25
//})
//export const adminNano = Nano.default({url: `http://${admin}:${password}@`+process.env.COUCHDB_URL, requestDefaults: {agent: myagent}}); 

export const frontend_url: string = process.env.FRONTEND_URL!;

export const testModuleObj = {val: 10}; //initialized once, persists between multiple requests. 

//Express doesn't normally expose Request
export interface TypedRequest<Params, ReqBody> extends express.Request<Params> {
    body: ReqBody,
    params: Params
}

export function getSuccessObject(message: string, code: number = 200): ApiResponse {
  return {message: message, status: code};
}
export function sendSuccess(res: Response, message: string, code: number = 200): Response<ApiResponse> {
  return res.status(code).json(getSuccessObject(message, code));
}
export function getErrorObject(message: string, code: number = 500): ApiResponse {
  return {message: message, status: code};
}
export function sendError(res: Response, message: string, code: number = 500): Response<ApiResponse> {
  // Pouchdb error obj has name, error, message, and reason fields
  logger.warn(`${code} error: ${message}`);
  return res.status(code).json(getSuccessObject(message, code));
}

//Could make it so any route with a :game match attaches the nano db obj to the request, but it's not really saving anything
//Would also have to extend the Request type like so https://blog.logrocket.com/extend-express-request-object-typescript/
//router.param('game', function(req: Request, res: Response, next: NextFunction, gameId: string) {
  //try {
    //const db = adminNano.use(req.params.gameId);
    //req.db = db;
    //next();
  //}
  //catch (err) {
    //sendError(res, `Error using db ${gameId}, ${err}`);
  //}
//});

export function needsPermissions(perms: Security.PermissionLevel) {
  //TODO: debug occasional empty responses w/ "failed to fetch" message. 
  return async function(req: Request, res: Response, next: NextFunction) { //actual middleware
    try {
      //for manager/admin operations that aren't on specific games (eg adding a game), there's no db or secObj
      const db = req.params?.gameId ? adminNano.use(req.params.gameId) : null;
      const sec = db ? await db.get("_security") as Security.SecObj : null;

      if(req.headers.authorization?.startsWith('Bearer ')) {
        couchAuth.requireAuth(req, res, () => { //this is the next() function I'm giving to couchAuth that it calls upon success
          //Don't think there's any need for couchAuth.requireRole('user'), requireAuth only works with SL users
          const user: CouchAuthTypes.SlRequestUser = req.user!;
          let hasPerms = Security.userHasPerms({secObj: sec, currentUser: user._id, roles: user.roles}, perms);
          if(hasPerms) {
            next(); //I let the chain progress
          }
          else {
            return sendError(res, "Not logged in as user with permissions "+perms, 403);
          }
        }); //if couchAuth.requireAuth() rejects, it sets res to 401 and doesn't call next.
      }
      else {
        let hasPerms = Security.userHasPerms({secObj: sec, currentUser: 'public'}, perms);
        if(hasPerms) {
          next();
        }
        else {
          return sendError(res, "Non-users require permissions "+perms+" for endpoint "+req.url, 403);
        }
      }
    }
    catch(err) {
      return sendError(res, `Authorization error, ${err}`);
    }
  }
}

// If this request went through couchAuth authentication, it attached user to request object. If no user, request was made as public.
export function getUser<Params, ReqBody>(req: TypedRequest<Params, ReqBody>): CouchAuthTypes.SlRequestUser | undefined {
  return req.user;
}

export async function mySleep(ms: number) {
  return new Promise((resolve) =>setTimeout(resolve, ms));
}
