import { Credentials } from '../components/LocalProvider';

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

  //Auth
  AUTH_TIMEOUT_SECONDS: 3600,
  DEFAULT_CREDENTIALS: {username: "public", password: "password"} as Credentials,
  DEFAULT_USER_ROLES: ["read"] as string[],

  //UI
  TEXT_AREA_CHARACTERS: 80, //string columns get a textarea input if maxSize is >= this value
} as const;

export default CompileConstants;
