import express, { Express, Request, Response, NextFunction } from 'express';
import logger from './logger';
import * as Security from '../shared/services/security';
import { secrets } from "docker-secret";
import couchAuth from '../routes/couchauth';
import * as CouchAuthTypes from '@perfood/couch-auth/lib/types/typings';
import { cloneDeep, isEqual } from 'lodash';
import * as Nano from 'nano';
import type * as T from '../shared/types/characterTypes'; //= //not included in runtime buildo
import type { ApiResponse, PublishChangeBody } from '../shared/types/utilTypes'; //= 

const admin = secrets.couch_admin;
const password = secrets.couch_password;
export const adminNano = Nano.default(`http://${admin}:${password}@`+process.env.COUCHDB_URL); //can configure http pool size, by default has infinite active connections

//Express doesn't normally expose Request
//export interface TypedRequest<T extends Query, U> extends Express.Request {
    //body: U,
    //query: T
//}
export interface TypedRequest<Params, ReqBody> extends Express.Request {
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
      const db = adminNano.use(req.params.gameId);
      const sec = await db.get("_security") as Security.SecObj;

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
