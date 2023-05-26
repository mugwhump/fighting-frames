import { Credentials } from '../types/utilTypes';

//TODO: make everything plural. games, characters, not game or character
const charMatch = "/game/:gameId/character/:characterId";
const changesMatch = charMatch+"/changes";
const changeMatch = charMatch+"/changes/:changeTitle";
//TODO: can rename this, it's not just columns, and doesn't need to be a design doc... but I'm calling it a design doc everywhere
const configDocId = '_design/columns';

export let CompileConstants = {
  DEFAULT_PREFER_LOCAL: false,
  DEFAULT_LOCAL_ENABLED: true,
  DELETE_TOP_IF_NOTHING_ELSE_WANTED: true,

  //URLs
  GAME_MATCH: "/game/:gameId",
  CHARACTER_MATCH: charMatch,
  SEGMENT_MATCH: "/game/:gameId/character/:characterId/:segment", //TODO: nuke it
  EDIT_MATCH: charMatch+"/local-edit",
  CHANGES_MATCH: charMatch+"/changes",
  CHANGE_MATCH: changeMatch,
  CONFIGURATION_MATCH: "/game/:gameId/game-configuration",
  ADD_CHARACTER_MATCH: "/game/:gameId/add-character",
  DELETE_CHARACTER_MATCH: "/game/:gameId/delete-character",
  AUTHORIZED_USERS_MATCH: "/game/:gameId/authorized-users",
  HOME_PATH: "/page/Inbox",
  CONFIRMATION_PATH: "/page/confirmed", //TODO: make an env var so couch-auth can use it... although frontend currently isn't dockerized
  ADD_GAME_PATH: "/page/add-game",

  API_CHANGE_MATCH: changeMatch, //PUT. Would be POST if it ended at changes/. Using PUT since idempotent.
  API_CHARACTER_MATCH: charMatch, // PATCH with body of change title, since PUT replaces entire resource, patch also used for instructions, diffs. Also DELETE.
  API_CHARACTERS_MATCH: "/game/:gameId/character", //POST to create new char. Body contains charName and displayName.
  API_CONFIG_MATCH: "/game/:gameId/"+configDocId, //PUT new config doc 
  API_AUTHORIZED_USERS_MATCH: "/game/:gameId/_security", //PUT new security doc
  API_GAMES_MATCH: "/game", //POST to create new game

  //Auth
  AUTH_TIMEOUT_SECONDS: 3600,
  DEFAULT_CREDENTIALS: {username: "public", password: "password"} as Credentials,
  DEFAULT_USER_ROLES: ["read"] as string[],

  //UI
  TEXT_AREA_CHARACTERS: 80, //string columns get a textarea input if maxSize is >= this value

  //DATABASE IDS
  LOCAL_SETTINGS_DB: "local-provider",

  //DOC IDS
  CONFIG_DOC_ID: configDocId,
  LOCAL_DATA_DOC_ID: "_local/localData",
  LOCAL_LATEST_PAGE_DOC_ID: "_local/latestPage",

  //game and char ids completely url-safe, lowercase-only. Nothing can start with underscore. Discordbot will use ; as separator, rarely used in notations.
  //FORBIDDEN_GAME_ID_REGEX: /^(?:_)|[^a-z0-9\-\._~]/, 
  ALLOWED_GAME_ID_REGEX: /^(?!_|local|character|sl-users|top|game-template|config|internal)[a-z0-9\-._~]{1,20}$/, //can't start with _, local, character, or internal db names
  ALLOWED_GAME_DISPLAY_NAME_REGEX: /^[^\t\n]{2,50}$/, 
  ALLOWED_CHARACTER_ID_REGEX: /^(?!_)[a-z0-9\-._~]{1,25}$/,
  ALLOWED_CHARACTER_DISPLAY_NAME_REGEX: /^[^\t\n]{1,35}$/, //TODO: has colDef now so remove this and just remove tabs/returns during validation
  ALLOWED_CHANGE_TITLE_REGEX: /^[\w-.~]{3,25}$/, //uppercase permitted
  ALLOWED_CHANGE_VERSION_REGEX: /^[\d.]{1,10}$/,
  FORBIDDEN_MOVE_ID_REGEX: /^(?:_)|[^\w\-.,_~+:()[\]{}/><=]/, //uppercase permitted
  FORBIDDEN_COL_ID_REGEX: /^(?:_|group:)|[^\w\-._~]/, //can't start with _ or group: 
} as const;

export default CompileConstants;
