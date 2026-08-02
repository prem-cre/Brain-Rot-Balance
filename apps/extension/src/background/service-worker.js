import { defaultState } from "../lib/mock-data.js";

const STORAGE_KEY = "brain_rot_balance_state";

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(STORAGE_KEY);
  if (!existing[STORAGE_KEY]) {
    await chrome.storage.local.set({ [STORAGE_KEY]: defaultState });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "OPEN_DASHBOARD") {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
  }

  if (message?.type === "GET_CONTEXT" && sender.tab) {
    sendResponse({
      ok: true,
      tabId: sender.tab.id,
      url: sender.tab.url || ""
    });
  }
});
