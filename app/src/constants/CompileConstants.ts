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
  API_UPLOAD_CHANGE_MATCH: "/game/:gameId/character/:characterId/changes/:changeTitle",
  API_UPLOAD_CHANGE_MATCH_PUBLIC: "/public/game/:gameId/character/:characterId/changes/:changeTitle",
  API_PUBLISH_CHANGE_MATCH: "/game/:gameId/character/:characterId/changes/:changeTitle/publish",
  API_UPLOAD_CONFIG_MATCH: "/game/:gameId/config",

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
