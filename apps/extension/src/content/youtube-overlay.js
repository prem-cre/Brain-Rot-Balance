const STORAGE_KEY = "brain_rot_balance_state";

const defaultState = {
  wallet: {
    totalMinutes: 50,
    remainingMinutes: 12,
    earnedMinutes: 44,
    spentMinutes: 38,
    focusMode: false,
    streakDays: 12,
    learningConfidence: 0.93
  },
  session: {
    detectedIntent: "Balanced",
    prediction: "Entertainment wallet is active.",
    currentVideo: {
      title: "YouTube Video",
      channel: "YouTube",
      educationScore: 85,
      entertainmentScore: 15,
      status: "Learning-positive"
    }
  },
  vault: [
    { title: "System Design Deep Dive", meta: "25 min", reward: "+20 min" }
  ]
};

async function getState() {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    try {
      const res = await chrome.storage.local.get(STORAGE_KEY);
      if (res && res[STORAGE_KEY]) return res[STORAGE_KEY];
    } catch (e) {}
  }
  return defaultState;
}

const PANEL_ID = "brb-floating-panel";
const SHORTS_BLOCKER_ID = "brb-shorts-blocker";
let telemetryInterval = null;

function extractVideoInfo() {
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get("v") || (window.location.pathname.startsWith("/shorts/") ? window.location.pathname.split("/shorts/")[1] : null);
  
  const titleEl = document.querySelector("h1.ytd-watch-metadata, #title h1, .ytd-reel-player-header-renderer .title");
  const channelEl = document.querySelector("#channel-name a, #owner #channel-name, .ytd-reel-player-header-renderer .channel-name");
  const videoEl = document.querySelector("video");

  return {
    videoId: videoId || "unknown",
    title: titleEl ? titleEl.innerText.trim() : document.title.replace("- YouTube", "").trim(),
    channel: channelEl ? channelEl.innerText.trim() : "YouTube Creator",
    currentTime: videoEl ? Math.floor(videoEl.currentTime) : 0,
    duration: videoEl ? Math.floor(videoEl.duration || 0) : 0,
    playbackRate: videoEl ? videoEl.playbackRate : 1.0,
    isPaused: videoEl ? videoEl.paused : true,
    isShorts: window.location.pathname.startsWith("/shorts/"),
    isFocused: document.visibilityState === "visible"
  };
}

function handleShortsBlocking(isFocusMode) {
  const isShortsRoute = window.location.pathname.startsWith("/shorts/");
  let blocker = document.getElementById(SHORTS_BLOCKER_ID);

  if (isFocusMode && isShortsRoute) {
    if (!blocker) {
      blocker = document.createElement("div");
      blocker.id = SHORTS_BLOCKER_ID;
      blocker.className = "brb-shorts-blocker-overlay";
      blocker.innerHTML = `
        <div class="brb-shorts-blocker-card">
          <div class="brb-shorts-blocker-icon">🔒</div>
          <h2 class="brb-shorts-blocker-title">Focus Mode Active</h2>
          <p class="brb-shorts-blocker-body">
            Shorts are currently locked because your daily entertainment wallet reached 0 minutes.
            Watch verified educational content in your Learning Vault to unlock entertainment!
          </p>
          <button id="brb-go-vault-btn" class="brb-cta brb-cta--vault">Open Learning Vault</button>
        </div>
      `;
      document.body.appendChild(blocker);

      document.getElementById("brb-go-vault-btn")?.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD" });
      });

      const videoEl = document.querySelector("video");
      if (videoEl) videoEl.pause();
    }
  } else if (blocker) {
    blocker.remove();
  }
}

function updateFocusModeUI(state) {
  const isFocusMode = state.wallet.focusMode || state.wallet.remainingMinutes <= 0;
  
  if (isFocusMode) {
    document.body.classList.add("brb-focus-mode-active");
  } else {
    document.body.classList.remove("brb-focus-mode-active");
  }

  handleShortsBlocking(isFocusMode);
}

function buildPanel(state) {
  const existing = document.getElementById(PANEL_ID);
  if (existing) {
    existing.remove();
  }

  const panel = document.createElement("aside");
  panel.id = PANEL_ID;
  panel.className = "brb-floating-panel";

  const total = state.wallet.totalMinutes || 50;
  const remaining = Math.max(0, state.wallet.remainingMinutes);
  const consumed = Math.min(total, total - remaining);
  const consumedPercent = Math.min(100, Math.round((consumed / total) * 100));
  const isFocusMode = state.wallet.focusMode || remaining <= 0;

  const currentVid = state.session.currentVideo || {};
  const isEdu = currentVid.educationScore >= 60;
  const badgeClass = isFocusMode ? "brb-badge--focus" : (isEdu ? "brb-badge--edu" : "brb-badge--ent");
  const badgeText = isFocusMode ? "Focus Mode" : (isEdu ? "Learning" : "Entertainment");

  panel.innerHTML = `
    <div class="brb-floating-inner">
      <div class="brb-floating-head">
        <div>
          <div class="eyebrow" style="font-size:10px; text-transform:uppercase; color:#94a3b8; letter-spacing:0.05em; font-weight:700;">Learn2Unlock</div>
          <h3 class="panel-title" style="font-size:14px; font-weight:700; margin:2px 0 0 0;">YouTube Balance</h3>
        </div>
        <div class="brb-badge ${badgeClass}">${badgeText}</div>
      </div>
      <div>
        <div class="row-between" style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px;">
          <span class="muted" style="color:#94a3b8;">Entertainment Wallet</span>
          <strong style="color:${remaining <= 5 ? "#fb7185" : "#2dd4bf"}">${remaining} min left</strong>
        </div>
        <div class="brb-meter">
          <div class="brb-meter-fill" style="width: ${consumedPercent}%"></div>
        </div>
      </div>
      <div class="brb-floating-grid">
        <div class="brb-mini-stat">
          <span class="muted" style="font-size:11px; color:#94a3b8;">Edu Score</span>
          <strong>${currentVid.educationScore || 85}%</strong>
        </div>
        <div class="brb-mini-stat">
          <span class="muted" style="font-size:11px; color:#94a3b8;">Streak</span>
          <strong>🔥 ${state.wallet.streakDays || 1} Days</strong>
        </div>
      </div>
      <button id="brb-open-dash-btn" class="brb-cta ${isFocusMode ? "brb-cta--vault" : ""}">
        ${isFocusMode ? "Unlock via Learning Vault" : "Open Focus Dashboard"}
      </button>
    </div>
  `;

  document.body.appendChild(panel);

  document.getElementById("brb-open-dash-btn")?.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD" });
  });
}

function startTelemetryLoop() {
  if (telemetryInterval) clearInterval(telemetryInterval);

  telemetryInterval = setInterval(async () => {
    const videoInfo = extractVideoInfo();
    if (!videoInfo.isPaused) {
      try {
        const response = await chrome.runtime.sendMessage({
          type: "TELEMETRY_TICK",
          payload: videoInfo
        });

        if (response && response.state) {
          updateFocusModeUI(response.state);
          buildPanel(response.state);
        }
      } catch (err) {
        // Service worker connection retry
      }
    }
  }, 5000);
}

async function initOverlay() {
  if (!location.hostname.includes("youtube.com")) return;

  const state = await getState();
  updateFocusModeUI(state);
  buildPanel(state);
  startTelemetryLoop();

  window.addEventListener("yt-navigate-finish", async () => {
    const nextState = await getState();
    updateFocusModeUI(nextState);
    buildPanel(nextState);
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "STATE_UPDATED" && message.state) {
      updateFocusModeUI(message.state);
      buildPanel(message.state);
    }
  });
}

// Initial execution
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initOverlay);
} else {
  initOverlay();
}
