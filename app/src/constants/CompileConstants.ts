import { Credentials } from '../types/utilTypes';

export let CompileConstants = {
  DEFAULT_PREFER_LOCAL: false,
  DEFAULT_LOCAL_ENABLED: true,
  DELETE_TOP_IF_NOTHING_ELSE_WANTED: true,

  //URLs
  GAME_MATCH: "/game/:gameId",
  CHARACTER_MATCH: "/game/:gameId/character/:character",
  SEGMENT_MATCH: "/game/:gameId/character/:character/:segment",
  CONFIGURATION_MATCH: "/game/:gameId/game-configuration",
  ADD_CHARACTER_MATCH: "/game/:gameId/add-character",
  DELETE_CHARACTER_MATCH: "/game/:gameId/delete-character",
  AUTHORIZED_USERS_MATCH: "/game/:gameId/authorized-users",
  HOME_PATH: "/page/Inbox",
  CONFIRMATION_PATH: "/page/confirmed", //TODO: make an env var so couch-auth can use it... although frontend currently isn't dockerized

  //TODO: RESTful uris don't generally have verbs, they're like this so they match couchdb's uris. Is that useful? URLs are already different since these start with api/
  API_UPLOAD_CHANGE_MATCH: "/game/:gameId/character/:characterId/changes/:changeTitle", //PUT. Would be POST if it ended at changes/. Using PUT since idempotent.
  API_PUBLISH_CHANGE_MATCH: "/game/:gameId/character/:characterId/changes/:changeTitle/publish", //PUT. Would be more RESTFUL to end at :characterId and have changeTitle as body
  API_UPLOAD_AND_PUBLISH_CHANGE_MATCH: "/game/:gameId/character/:characterId/changes/:changeTitle/upload-publish", //PUT
  //API_PUBLISH_CHANGE_MATCH: "/game/:gameId/character/:characterId", //PUT. Body is either a changeId or a whole changeDoc
  API_UPLOAD_CONFIG_MATCH: "/game/:gameId/_design/columns", //PUT

  //Auth
  AUTH_TIMEOUT_SECONDS: 3600,
  DEFAULT_CREDENTIALS: {username: "public", password: "password"} as Credentials,
  DEFAULT_USER_ROLES: ["read"] as string[],

  //UI
  TEXT_AREA_CHARACTERS: 80, //string columns get a textarea input if maxSize is >= this value

  //game and char ids completely url-safe. Nothing can start with underscore. Discordbot will use ; as separator, rarely used in notations.
  //Reject if regex matches anywhere.
  FORBIDDEN_GAME_ID_REGEX: /^(?:_)|[^\w\-\._~]/, 
  FORBIDDEN_CHARACTER_ID_REGEX: /^(?:_)|[^\w\-\._~]/, 
  FORBIDDEN_MOVE_ID_REGEX: /^(?:_)|[^\w\-\.,_~+:()\[\]\{\}\/><=]/, 
  FORBIDDEN_COL_ID_REGEX: /^(?:_|group:)|[^\w\-\._~]/, //can't start with _ or group: 
} as const;

export default CompileConstants;
