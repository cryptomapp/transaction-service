interface Session {
  joined: boolean;
  expired: boolean;
  timer?: NodeJS.Timeout;
}
