import { Credentials } from '../components/LocalProvider';

export let CompileConstants = {
  DEFAULT_PREFER_LOCAL: false,
  DEFAULT_LOCAL_ENABLED: true,
  DELETE_TOP_IF_NOTHING_ELSE_WANTED: true,

  GAME_MATCH: "/game/:gameId",
  HOME_PATH: "/page/Inbox",

  DEFAULT_CREDENTIALS: {username: "public", password: "password"} as Credentials,
} as const;

export default CompileConstants;
