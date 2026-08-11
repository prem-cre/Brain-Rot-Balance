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

  if (message?.type === "CLAIM_BOOSTER") {
    (async () => {
      const state = await getStoredState();
      const bonusMinutes = message.minutes || 5;
      state.wallet.remainingMinutes = Math.min(
        state.wallet.totalMinutes,
        (state.wallet.remainingMinutes || 0) + bonusMinutes
      );
      state.wallet.earnedMinutes = (state.wallet.earnedMinutes || 0) + bonusMinutes;
      state.dailyStats = state.dailyStats || {};
      state.dailyStats.learningMinutes = (state.dailyStats.learningMinutes || 0) + bonusMinutes;

      if (state.wallet.remainingMinutes > 0) {
        state.wallet.focusMode = false;
      }

      await saveStoredState(state);
      await notifyTabs(state);
      sendResponse({ ok: true, state, claimedMinutes: bonusMinutes });
    })();
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

      // Check if video is educational (high score, keyword match, or vault match)
      const titleLower = (payload.title || "").toLowerCase();
      const isVaultVideo = (state.vault || []).some(
        (v) => v.videoId === videoId || (v.watchUrl && v.watchUrl.includes(videoId))
      );
      const isEdu = isVaultVideo || titleLower.includes("explain") || titleLower.includes("tutorial") || titleLower.includes("deep dive") || titleLower.includes("course") || titleLower.includes("how to") || titleLower.includes("architecture") || titleLower.includes("react") || titleLower.includes("docker") || titleLower.includes("python");
      const eduScore = isEdu ? (isVaultVideo ? 95 : 88) : (payload.isShorts ? 15 : 35);

      state.session = state.session || {};
      state.session.currentVideo = {
        title: payload.title || "YouTube Video",
        channel: payload.channel || "YouTube Channel",
        educationScore: eduScore,
        entertainmentScore: 100 - eduScore,
        status: isEdu ? "Learning-positive" : "Entertainment",
        isVaultVideo: isVaultVideo
      };

      state.dailyStats = state.dailyStats || { learningMinutes: 0, entertainmentMinutes: 0, focusMinutes: 0, knowledgeScore: 85 };

      let mintedJustNow = false;
      let earnedAmount = 0;

      // Wallet Accounting Every 60 Seconds of Viewing Time
      if (counter.secondsWatched >= 60) {
        counter.secondsWatched -= 60;
        
        if (isEdu) {
          // Educational Content - Earn Minutes
          const focusRatio = counter.secondsFocused / 60;
          const confidence = Math.min(1.0, 0.5 + focusRatio * 0.5);
          earnedAmount = Math.max(1, Math.round(1 * confidence));
          
          state.wallet.remainingMinutes = Math.min(
            state.wallet.totalMinutes,
            state.wallet.remainingMinutes + earnedAmount
          );
          state.wallet.earnedMinutes = (state.wallet.earnedMinutes || 0) + earnedAmount;
          state.dailyStats.learningMinutes = (state.dailyStats.learningMinutes || 0) + 1;
          mintedJustNow = true;
          counter.secondsFocused = 0;
        } else {
          // Entertainment Content - Consume Minutes
          state.wallet.remainingMinutes = Math.max(0, state.wallet.remainingMinutes - 1);
          state.wallet.spentMinutes = (state.wallet.spentMinutes || 0) + 1;
          state.dailyStats.entertainmentMinutes = (state.dailyStats.entertainmentMinutes || 0) + 1;
        }

        // Focus mode trigger / reset
        if (state.wallet.remainingMinutes <= 0) {
          state.wallet.focusMode = true;
        } else if (state.wallet.remainingMinutes > 0) {
          state.wallet.focusMode = false;
        }

        await saveStoredState(state);
        notifyTabs(state);
      }

      // Calculate progress towards next minute (0 - 100%)
      const mintingProgress = isEdu ? Math.min(100, Math.round((counter.secondsWatched / 60) * 100)) : 0;

      sendResponse({
        ok: true,
        state,
        mintingProgress,
        mintedJustNow,
        earnedAmount,
        isEducational: isEdu
      });
    })();

    return true; // Keep message channel open for async response
  }
});

