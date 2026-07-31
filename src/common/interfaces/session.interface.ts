export interface SessionData {
  step?: string;
  data?: Record<string, unknown>;
  currentScreen?: string;
}

export interface UserSession {
  userId: number;
  session: SessionData;
}
