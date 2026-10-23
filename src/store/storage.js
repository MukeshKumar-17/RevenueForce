// Saves app state in the browser so imports and manual routes survive a refresh.
const STORAGE_KEY = "revenue-inbox/state/v2";

export function loadSavedState() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null; // private mode or corrupted data: start fresh instead of crashing
  }
}

export function saveState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the app keeps working for this session.
  }
}
