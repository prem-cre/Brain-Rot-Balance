import { defaultState } from "./mock-data.js";

const STORAGE_KEY = "brain_rot_balance_state";

function hasChromeStorage() {
  return typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
}

export async function getState() {
  if (hasChromeStorage()) {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    if (result[STORAGE_KEY]) {
      return result[STORAGE_KEY];
    }
    await chrome.storage.local.set({ [STORAGE_KEY]: defaultState });
    return defaultState;
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
    return defaultState;
  }
  return JSON.parse(raw);
}

export async function setState(nextState) {
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ [STORAGE_KEY]: nextState });
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}
