/** 从需求向导等到对话页时，用 sessionStorage 传递待打开的会话 id（兼容 HashRouter / StrictMode） */
export const CHAT_BOOTSTRAP_SESSION_KEY = 'aaaflow_bootstrap_session_id';

export function setChatBootstrapSessionId(sessionId: string): void {
  try {
    sessionStorage.setItem(CHAT_BOOTSTRAP_SESSION_KEY, sessionId);
  } catch {
    /* ignore */
  }
}
