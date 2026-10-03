import type { Session } from './protocol';

const STORAGE_KEY = 'beer-game-player';

// sessionStorage (not localStorage) on purpose: it is private to one tab and
// survives a reload, so four tabs of one browser are four different players.

export function loadSession(): Session | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null') as Session | null;
    if (!saved) return null;
    const valid = /^[A-F0-9]{6}$/.test(saved.code) && /^[a-f0-9]{64}$/.test(saved.token);
    return valid ? saved : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage unavailable: the player just cannot resume after a reload.
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** Room code from an invite link such as /?room=A1B2C3. */
export function roomFromUrl(): string {
  return new URLSearchParams(location.search).get('room')?.trim().toUpperCase() ?? '';
}
