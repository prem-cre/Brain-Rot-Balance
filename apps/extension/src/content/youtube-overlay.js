const STORAGE_KEY = "brain_rot_balance_state";

const defaultState = {
  wallet: {
    totalMinutes: 50,
    remainingMinutes: 0,
    earnedMinutes: 44,
    spentMinutes: 50,
    focusMode: true,
    streakDays: 12,
    learningConfidence: 0.93
  },
  session: {
    detectedIntent: "Focus Mode",
    prediction: "Watch educational content to unlock your entertainment wallet.",
    currentVideo: {
      title: "YouTube Video",
      channel: "YouTube",
      educationScore: 85,
      entertainmentScore: 15,
      status: "Learning-positive"
    }
  },
  vault: [
    {
      id: "vault-1",
      title: "Docker Networking Deep Dive",
      meta: "28 min · Systems",
      reward: "+24 min",
      videoId: "0O1w65c6c0E",
      watchUrl: "https://www.youtube.com/watch?v=0O1w65c6c0E"
    },
    {
      id: "vault-2",
      title: "React Hooks Through Real Examples",
      meta: "19 min · Frontend",
      reward: "+18 min",
      videoId: "TNhaISOUy6Q",
      watchUrl: "https://www.youtube.com/watch?v=TNhaISOUy6Q"
    },
    {
      id: "vault-3",
      title: "Binary Search Trees Without Memorizing",
      meta: "24 min · DSA",
      reward: "+22 min",
      videoId: "fAAZ2rCfc18",
      watchUrl: "https://www.youtube.com/watch?v=fAAZ2rCfc18"
    }
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
const VAULT_DRAWER_ID = "brb-vault-drawer";
const PASS_BANNER_ID = "brb-pass-banner";
const TOAST_ID = "brb-mint-toast";

let telemetryInterval = null;
let currentMintingProgress = 0;

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

      document.getElementById("brb-go-vault-btn")?.addEventListener("click", async () => {
        const state = await getState();
        toggleVaultDrawer(state);
      });

      const videoEl = document.querySelector("video");
      if (videoEl) videoEl.pause();
    }
  } else if (blocker) {
    blocker.remove();
  }
}

function renderLearningPassBanner(isEdu, isFocusMode) {
  let banner = document.getElementById(PASS_BANNER_ID);
  const playerContainer = document.querySelector("#primary-inner, #player-container, #ytd-player");

  if (isFocusMode && isEdu) {
    if (!banner) {
      banner = document.createElement("div");
      banner.id = PASS_BANNER_ID;
      banner.className = "brb-learning-pass-banner";
      banner.innerHTML = `
        <div class="brb-pass-content">
          <span class="brb-pass-icon">🎓</span>
          <div>
            <strong>Learning Pass Active</strong>
            <span class="brb-pass-sub">Watching this lesson mints +1 min entertainment time every 60s.</span>
          </div>
        </div>
        <button id="brb-pass-booster-btn" class="brb-pass-booster">+5m Booster</button>
      `;
      
      if (playerContainer) {
        playerContainer.insertBefore(banner, playerContainer.firstChild);
      } else {
        document.body.appendChild(banner);
      }

      document.getElementById("brb-pass-booster-btn")?.addEventListener("click", async () => {
        try {
          const res = await chrome.runtime.sendMessage({ type: "CLAIM_BOOSTER", minutes: 5 });
          if (res && res.ok) {
            showMintedToast(5, "⚡ Instant +5 Min Booster Claimed!");
            if (res.state) {
              updateFocusModeUI(res.state);
              buildPanel(res.state);
            }
          }
        } catch (e) {}
      });
    }
  } else if (banner) {
    banner.remove();
  }
}

function updateFocusModeUI(state) {
  const isFocusMode = state.wallet.focusMode || state.wallet.remainingMinutes <= 0;
  const currentVid = state.session?.currentVideo || {};
  const titleLower = (currentVid.title || "").toLowerCase();
  const isEdu = (currentVid.educationScore >= 60) || titleLower.includes("explain") || titleLower.includes("tutorial") || titleLower.includes("deep dive") || titleLower.includes("course") || titleLower.includes("how to") || titleLower.includes("architecture");

  if (isFocusMode) {
    document.body.classList.add("brb-focus-mode-active");
    if (isEdu) {
      document.body.classList.add("brb-learning-pass-active");
    } else {
      document.body.classList.remove("brb-learning-pass-active");
    }
  } else {
    document.body.classList.remove("brb-focus-mode-active");
    document.body.classList.remove("brb-learning-pass-active");
  }

  renderLearningPassBanner(isEdu, isFocusMode);
  handleShortsBlocking(isFocusMode);
}

function showMintedToast(amount = 1, message = null) {
  let toast = document.getElementById(TOAST_ID);
  if (toast) toast.remove();

  toast = document.createElement("div");
  toast.id = TOAST_ID;
  toast.className = "brb-mint-toast";
  toast.innerHTML = `
    <span class="brb-toast-icon">🎉</span>
    <div>
      <strong>${message || `+${amount} Min Entertainment Unlocked!`}</strong>
      <small>Wallet refilled from learning playback</small>
    </div>
  `;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("brb-toast-show");
  }, 50);

  setTimeout(() => {
    toast.classList.remove("brb-toast-show");
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

function toggleVaultDrawer(state) {
  let drawer = document.getElementById(VAULT_DRAWER_ID);
  if (drawer) {
    drawer.remove();
    return;
  }

  const vaultItems = state.vault || defaultState.vault;

  drawer = document.createElement("div");
  drawer.id = VAULT_DRAWER_ID;
  drawer.className = "brb-vault-drawer";

  const vaultListHTML = vaultItems
    .map(
      (item, idx) => `
      <article class="brb-vault-card" data-url="${item.watchUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(item.title)}`}">
        <div class="brb-vault-num">0${idx + 1}</div>
        <div class="brb-vault-info">
          <h4>${item.title}</h4>
          <p>${item.meta || "Educational video"}</p>
        </div>
        <button class="brb-vault-watch-btn">${item.reward || "+20 min"}</button>
      </article>
    `
    )
    .join("");

  drawer.innerHTML = `
    <div class="brb-vault-drawer-inner">
      <div class="brb-vault-drawer-head">
        <div>
          <div class="eyebrow" style="color:#2dd4bf; font-weight:700; font-size:11px;">LEARNING VAULT QUEUE</div>
          <h2 style="margin:4px 0 0 0; font-size:18px; font-weight:800; color:#f8fafc;">Earn Entertainment Time</h2>
        </div>
        <button id="brb-close-drawer" class="brb-close-btn">&times;</button>
      </div>
      <p style="font-size:13px; color:#94a3b8; margin:0 0 16px 0; line-height:1.5;">
        Select an educational video below to launch with an active <strong>Learning Pass</strong> and refill your wallet minutes!
      </p>
      <div class="brb-vault-list">
        ${vaultListHTML}
      </div>
    </div>
  `;

  document.body.appendChild(drawer);

  document.getElementById("brb-close-drawer")?.addEventListener("click", () => {
    drawer.remove();
  });

  drawer.querySelectorAll(".brb-vault-card").forEach((card) => {
    card.addEventListener("click", () => {
      const targetUrl = card.getAttribute("data-url");
      if (targetUrl) {
        window.location.href = targetUrl;
      }
    });
  });
}

function buildPanel(state, mintingProgress = 0) {
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

  const currentVid = state.session?.currentVideo || {};
  const isEdu = (currentVid.educationScore >= 60);
  const badgeClass = isFocusMode ? "brb-badge--focus" : (isEdu ? "brb-badge--edu" : "brb-badge--ent");
  const badgeText = isFocusMode ? "Focus Mode" : (isEdu ? "Learning Pass" : "Entertainment");

  const mintingBarHTML = (isFocusMode && isEdu) ? `
    <div class="brb-minting-bar-wrap" style="margin-top:8px;">
      <div class="row-between" style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">
        <span style="color:#2dd4bf; font-weight:600;">⚡ Minting Next Minute</span>
        <strong style="color:#2dd4bf;">${mintingProgress}%</strong>
      </div>
      <div class="brb-meter" style="height:6px; background:rgba(45, 212, 191, 0.15);">
        <div class="brb-meter-fill" style="width: ${mintingProgress}%; background:linear-gradient(90deg, #2dd4bf, #34d399);"></div>
      </div>
    </div>
  ` : "";

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
        ${mintingBarHTML}
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
        ${isFocusMode ? "🎓 Open Learning Vault" : "Open Focus Dashboard"}
      </button>
    </div>
  `;

  document.body.appendChild(panel);

  document.getElementById("brb-open-dash-btn")?.addEventListener("click", () => {
    if (isFocusMode) {
      toggleVaultDrawer(state);
    } else {
      chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD" });
    }
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
          currentMintingProgress = response.mintingProgress || 0;
          updateFocusModeUI(response.state);
          buildPanel(response.state, currentMintingProgress);

          if (response.mintedJustNow) {
            showMintedToast(response.earnedAmount || 1);
          }
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
      buildPanel(message.state, currentMintingProgress);
    }
  });
}

// Initial execution
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initOverlay);
} else {
  initOverlay();
}
