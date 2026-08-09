import { defaultState } from "../lib/mock-data.js";

const STORAGE_KEY = "brain_rot_balance_state";
let playbackCounter = {}; // videoId -> accumulator seconds

async function getStoredState() {
  const existing = await chrome.storage.local.get(STORAGE_KEY);
  if (existing && existing[STORAGE_KEY]) {
    return existing[STORAGE_KEY];
  }
  await chrome.storage.local.set({ [STORAGE_KEY]: defaultState });
  return defaultState;
}

async function saveStoredState(state) {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

async function notifyTabs(state) {
  const tabs = await chrome.tabs.query({ url: "*://*.youtube.com/*" });
  for (const tab of tabs) {
    chrome.tabs.sendMessage(tab.id, { type: "STATE_UPDATED", state }).catch(() => {});
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await getStoredState();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "OPEN_DASHBOARD") {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "GET_CONTEXT" && sender.tab) {
    sendResponse({
      ok: true,
      tabId: sender.tab.id,
      url: sender.tab.url || ""
    });
    return true;
  }

  if (message?.type === "TELEMETRY_TICK" && message.payload) {
    (async () => {
      const payload = message.payload;
      const state = await getStoredState();
      
      const videoId = payload.videoId;
      if (!playbackCounter[videoId]) {
        playbackCounter[videoId] = { secondsWatched: 0, secondsFocused: 0 };
      }

      const counter = playbackCounter[videoId];
      if (!payload.isPaused) {
        counter.secondsWatched += 5;
        if (payload.isFocused) {
          counter.secondsFocused += 5;
        }
      }

      // Basic heuristic score if not yet classified
      const titleLower = (payload.title || "").toLowerCase();
      const isEdu = titleLower.includes("explain") || titleLower.includes("tutorial") || titleLower.includes("deep dive") || titleLower.includes("course") || titleLower.includes("how to") || titleLower.includes("architecture");
      const eduScore = isEdu ? 88 : (payload.isShorts ? 15 : 35);

      state.session = state.session || {};
      state.session.currentVideo = {
        title: payload.title || "YouTube Video",
        channel: payload.channel || "YouTube Channel",
        educationScore: eduScore,
        entertainmentScore: 100 - eduScore,
        status: isEdu ? "Learning-positive" : "Entertainment"
      };

      // Wallet Accounting Every 60 Seconds of Viewing Time
      if (counter.secondsWatched >= 60) {
        counter.secondsWatched -= 60;
        
        if (isEdu) {
          // Educational Content - Earn Minutes
          const focusRatio = counter.secondsFocused / 60;
          const confidence = Math.min(1.0, 0.5 + focusRatio * 0.5);
          const earned = Math.round(1 * confidence);
          
          state.wallet.remainingMinutes = Math.min(state.wallet.totalMinutes, state.wallet.remainingMinutes + earned);
          state.wallet.earnedMinutes = (state.wallet.earnedMinutes || 0) + earned;
          state.dailyStats.learningMinutes = (state.dailyStats.learningMinutes || 0) + 1;
        } else {
          // Entertainment Content - Consume Minutes
          state.wallet.remainingMinutes = Math.max(0, state.wallet.remainingMinutes - 1);
          state.wallet.spentMinutes = (state.wallet.spentMinutes || 0) + 1;
          state.dailyStats.entertainmentMinutes = (state.dailyStats.entertainmentMinutes || 0) + 1;
        }

        // Focus mode trigger
        if (state.wallet.remainingMinutes <= 0) {
          state.wallet.focusMode = true;
        } else if (state.wallet.remainingMinutes > 5) {
          state.wallet.focusMode = false;
        }

        await saveStoredState(state);
        notifyTabs(state);
      }

      sendResponse({ ok: true, state });
    })();

    return true; // Keep message channel open for async response
  }
});

