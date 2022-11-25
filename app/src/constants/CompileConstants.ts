import { Credentials } from '../components/LocalProvider';

export let CompileConstants = {
  DEFAULT_PREFER_LOCAL: false,
  DEFAULT_LOCAL_ENABLED: true,
  DELETE_TOP_IF_NOTHING_ELSE_WANTED: true,

  GAME_MATCH: "/game/:gameId",
  CHARACTER_MATCH: "/game/:gameId/character/:character",
  SEGMENT_MATCH: "/game/:gameId/character/:character/:segment",
  HOME_PATH: "/page/Inbox",

  AUTH_TIMEOUT_SECONDS: 3600,
  DEFAULT_CREDENTIALS: {username: "public", password: "password"} as Credentials,
  DEFAULT_USER_ROLES: ["read"] as string[],
} as const;

export default CompileConstants;
