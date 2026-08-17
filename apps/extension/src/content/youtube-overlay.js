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
      title: "System Design Deep Dive: Architecture Patterns",
      meta: "Tech With Tim • System Design",
      reward: "+1 min per 5m",
      videoId: "0O1w65c6c0E",
      watchUrl: "https://www.youtube.com/results?search_query=System+Design+Deep+Dive+Architecture"
    },
    {
      id: "vault-2",
      title: "React 19 & Next.js Full Course",
      meta: "Frontend Mastery • Web Dev",
      reward: "+1 min per 5m",
      videoId: "TNhaISOUy6Q",
      watchUrl: "https://www.youtube.com/results?search_query=React+19+Tutorial+Full+Course"
    },
    {
      id: "vault-3",
      title: "Data Structures & Algorithms in Python",
      meta: "NeetCode • DSA Practice",
      reward: "+1 min per 5m",
      videoId: "fAAZ2rCfc18",
      watchUrl: "https://www.youtube.com/results?search_query=NeetCode+Data+Structures+Algorithms+Python"
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
const MODAL_ID = "brb-add-vault-modal";
const QUIZ_MODAL_ID = "brb-quiz-modal";
const BUFFER_MODAL_ID = "brb-buffer-modal";

let telemetryInterval = null;
let currentMintingProgress = 0;
let currentMintingSeconds = 0;

let preFetchedQuiz = null;
let preFetchingVideoId = null;
let quizShownVideoId = null;
let bufferModalShownThisSession = false;

function extractVideoInfo() {
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get("v") || (window.location.pathname.startsWith("/shorts/") ? window.location.pathname.split("/shorts/")[1] : null);
  
  const titleEl = document.querySelector("h1.ytd-watch-metadata, #title h1, .ytd-reel-player-header-renderer .title");
  const channelEl = document.querySelector("#channel-name a, #owner #channel-name, .ytd-reel-player-header-renderer .channel-name");
  const videoEl = document.querySelector("video");

  const title = titleEl ? titleEl.innerText.trim() : (document.title ? document.title.replace("- YouTube", "").trim() : "YouTube Video");

  return {
    videoId: videoId || (window.location.pathname.includes("/watch") ? "current-video" : "youtube-feed"),
    title: title || "YouTube Video",
    channel: channelEl ? channelEl.innerText.trim() : "YouTube Creator",
    url: window.location.href,
    watchUrl: window.location.href,
    currentTime: videoEl ? Math.floor(videoEl.currentTime) : 0,
    duration: videoEl ? Math.floor(videoEl.duration || 0) : 0,
    playbackRate: videoEl ? videoEl.playbackRate : 1.0,
    isPaused: videoEl ? videoEl.paused : true,
    isShorts: window.location.pathname.startsWith("/shorts/"),
    isFocused: document.visibilityState === "visible"
  };
}

function showMintedToast(amount = 1, customText = null, isWarning = false) {
  let toast = document.getElementById(TOAST_ID);
  if (!toast) {
    toast = document.createElement("div");
    toast.id = TOAST_ID;
    document.body.appendChild(toast);
  }

  toast.className = `brb-mint-toast ${isWarning ? "brb-toast--warning" : ""}`;
  toast.innerHTML = `
    <div class="brb-toast-icon">${isWarning ? "⚠️" : (amount > 0 ? "🎉" : "✅")}</div>
    <div>
      <strong>${customText || `+${amount} Minute Earned!`}</strong>
      <small>${isWarning ? "Attention" : (amount > 0 ? "Verified learning reward credited!" : "Learning Vault updated")}</small>
    </div>
  `;

  setTimeout(() => toast.classList.add("brb-toast-show"), 50);
  setTimeout(() => {
    toast.classList.remove("brb-toast-show");
  }, 4500);
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
            Watch verified educational content in your Learning Vault to earn entertainment time back!
          </p>
          <button id="brb-go-vault-btn" class="brb-cta brb-cta--vault">Open Learning Vault Queue</button>
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
            <strong>Learning Pass Active (Unlocked)</strong>
            <span class="brb-pass-sub">Every 5 min of learning adds +1m. Complete 80% to unlock the +5m Mastery Quiz!</span>
          </div>
        </div>
        <button id="brb-pass-booster-btn" class="brb-pass-booster">+5m Quick Booster</button>
      `;
      
      if (playerContainer) {
        playerContainer.insertBefore(banner, playerContainer.firstChild);
      } else {
        document.body.appendChild(banner);
      }

      document.getElementById("brb-pass-booster-btn")?.addEventListener("click", async () => {
        try {
          const res = await chrome.runtime.sendMessage({
            type: "CLAIM_BOOSTER",
            minutes: 5
          });
          if (res && res.ok) {
            showMintedToast(5, "Claimed +5 min Study Booster!");
            if (res.state) {
              updateFocusModeUI(res.state);
              buildPanel(res.state, currentMintingProgress, currentMintingSeconds);
            }
          }
        } catch (e) {}
      });
    }
  } else if (banner) {
    banner.remove();
  }
}

function check3MinVaultBuffer(state) {
  const remaining = state.wallet?.remainingMinutes || 0;
  const isFocusMode = state.wallet?.focusMode || remaining <= 0;
  const currentVid = state.session?.currentVideo || {};
  const isEdu = (currentVid.educationScore >= 60) || currentVid.isVaultVideo;

  // Trigger when wallet is <= 3 minutes, not in focus mode, not an edu video, and vault has < 3 videos
  if (remaining <= 3 && remaining > 0 && !isFocusMode && !isEdu) {
    const vaultCount = (state.vault || []).length;
    if (vaultCount < 3 && !bufferModalShownThisSession) {
      bufferModalShownThisSession = true;
      const videoEl = document.querySelector("video");
      if (videoEl && !videoEl.paused) videoEl.pause();
      open3MinBufferModal(state);
    }
  }
}

function open3MinBufferModal(state) {
  let modal = document.getElementById(BUFFER_MODAL_ID);
  if (modal) modal.remove();

  modal = document.createElement("div");
  modal.id = BUFFER_MODAL_ID;
  modal.className = "brb-modal-overlay";

  const renderQueueCount = (vault) => `
    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(245, 158, 11, 0.12); padding:10px 14px; border-radius:14px; border:1px solid rgba(245, 158, 11, 0.3);">
      <span style="color:#fbbf24; font-weight:700; font-size:12px;">Required: 3 Videos</span>
      <span class="brb-buffer-badge" id="brb-buffer-counter">${(vault || []).length} / 3 Queued</span>
    </div>
  `;

  modal.innerHTML = `
    <div class="brb-modal-card">
      <div class="brb-modal-head">
        <h3 style="color:#fbbf24;"><span>🚨</span> 3 Minutes Left in Wallet!</h3>
      </div>

      <p style="font-size:13px; color:#cbd5e1; line-height:1.5; margin:0;">
        Your entertainment time is running out. <strong>Pre-commit to your learning queue</strong> by adding at least 3 educational videos to your Learning Vault before Focus Mode locks.
      </p>

      <div id="brb-buffer-status-box">
        ${renderQueueCount(state.vault)}
      </div>

      <div class="brb-input-group">
        <label>Paste YouTube Video Link</label>
        <input type="text" id="brb-buffer-url-input" class="brb-input-text" placeholder="https://youtube.com/watch?v=... or 'System Design'">
      </div>

      <div class="brb-input-group">
        <label>Quick Suggestions (1-Click Add)</label>
        <div class="brb-chips-container">
          <span class="brb-preset-chip" data-topic="System Design Deep Dive Architecture">⚡ System Design</span>
          <span class="brb-preset-chip" data-topic="Python Full Course for Beginners">🐍 Python Course</span>
          <span class="brb-preset-chip" data-topic="React 19 Tutorial Full Course">⚛️ React 19</span>
          <span class="brb-preset-chip" data-topic="Data Structures Algorithms Full Course">🧩 DSA Mastery</span>
          <span class="brb-preset-chip" data-topic="Docker and Kubernetes Tutorial">🐳 Docker & K8s</span>
        </div>
      </div>

      <div class="brb-modal-actions">
        <button id="brb-buffer-submit" class="brb-modal-submit">Add to Vault & Continue</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelectorAll(".brb-preset-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const topic = chip.getAttribute("data-topic");
      const urlInput = document.getElementById("brb-buffer-url-input");
      if (urlInput) urlInput.value = topic;
    });
  });

  document.getElementById("brb-buffer-submit")?.addEventListener("click", async () => {
    const urlInput = document.getElementById("brb-buffer-url-input")?.value?.trim();
    if (!urlInput) {
      showMintedToast(0, "Please enter a YouTube link or choose a suggestion!", true);
      return;
    }

    try {
      const res = await chrome.runtime.sendMessage({
        type: "ADD_TO_VAULT",
        payload: {
          url: urlInput,
          watchUrl: urlInput,
          title: urlInput,
          category: "Pre-Commitment Queue"
        }
      });

      if (res && res.ok && res.state) {
        const newCount = (res.state.vault || []).length;
        const statusBox = document.getElementById("brb-buffer-status-box");
        if (statusBox) statusBox.innerHTML = renderQueueCount(res.state.vault);

        const urlInputEl = document.getElementById("brb-buffer-url-input");
        if (urlInputEl) urlInputEl.value = "";

        if (newCount >= 3) {
          modal.remove();
          showMintedToast(0, "✅ Learning Queue Ready (3/3 Videos)! Resuming...");
          const videoEl = document.querySelector("video");
          if (videoEl && videoEl.paused) videoEl.play();
        } else {
          showMintedToast(0, `Added! Please add ${3 - newCount} more video(s) to continue.`);
        }
      }
    } catch (err) {
      showMintedToast(0, "Error adding video to vault.", true);
    }
  });
}

function triggerQuizIfAtMilestone(videoInfo) {
  if (!videoInfo || !videoInfo.duration || videoInfo.duration < 30) return;
  if (videoInfo.isPaused) return;

  const progress = videoInfo.currentTime / videoInfo.duration;

  // 1. Silent Pre-Fetch at 75%
  if (progress >= 0.75 && progress < 0.80 && preFetchingVideoId !== videoInfo.videoId) {
    preFetchingVideoId = videoInfo.videoId;
    chrome.runtime.sendMessage({
      type: "FETCH_QUIZ",
      payload: { videoId: videoInfo.videoId, title: videoInfo.title }
    }).then((res) => {
      if (res && res.quiz) preFetchedQuiz = res.quiz;
    }).catch(() => {});
  }

  // 2. Pop up quiz at 80% completion
  if (progress >= 0.80 && quizShownVideoId !== videoInfo.videoId) {
    quizShownVideoId = videoInfo.videoId;
    const videoEl = document.querySelector("video");
    if (videoEl && !videoEl.paused) videoEl.pause();

    if (preFetchedQuiz) {
      renderQuizModal(preFetchedQuiz, videoInfo);
    } else {
      chrome.runtime.sendMessage({
        type: "FETCH_QUIZ",
        payload: { videoId: videoInfo.videoId, title: videoInfo.title }
      }).then((res) => {
        const quiz = (res && res.quiz) ? res.quiz : {
          concept: "Core Concept",
          question: `Which fundamental principle is demonstrated in this lesson on ${videoInfo.title}?`,
          options: [
            "Modular architecture and efficient resource allocation",
            "Disabling error handling and security checks",
            "Increasing compute latency indefinitely",
            "Bypassing runtime execution rules"
          ],
          correct_index: 0,
          explanation: "Mastering foundational concepts and architectural patterns ensures robust implementation.",
          bonus_minutes: 5
        };
        renderQuizModal(quiz, videoInfo);
      });
    }
  }
}

function renderQuizModal(quiz, videoInfo) {
  let modal = document.getElementById(QUIZ_MODAL_ID);
  if (modal) modal.remove();

  modal = document.createElement("div");
  modal.id = QUIZ_MODAL_ID;
  modal.className = "brb-modal-overlay";

  const letters = ["A", "B", "C", "D"];
  const optionsHTML = quiz.options.map((opt, idx) => `
    <button class="brb-quiz-opt-btn" data-index="${idx}">
      <span class="brb-quiz-opt-letter">${letters[idx]}</span>
      <span>${opt}</span>
    </button>
  `).join("");

  modal.innerHTML = `
    <div class="brb-quiz-card">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="brb-quiz-badge">🎓 80% Milestone • AI Comprehension Check</span>
        <span style="font-size:12px; font-weight:800; color:#fbbf24;">🏆 +5m Mastery Bonus</span>
      </div>

      <div class="brb-quiz-question">
        ${quiz.question}
      </div>

      <div class="brb-quiz-options">
        ${optionsHTML}
      </div>

      <div id="brb-quiz-feedback-box" style="display:none;"></div>

      <div class="brb-modal-actions" id="brb-quiz-actions" style="display:none;">
        <button id="brb-quiz-continue-btn" class="brb-modal-submit">Claim +5m Bonus & Resume</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  let answered = false;
  modal.querySelectorAll(".brb-quiz-opt-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (answered) return;
      answered = true;

      const selectedIdx = parseInt(btn.getAttribute("data-index"), 10);
      const isCorrect = selectedIdx === quiz.correct_index;
      const feedbackBox = document.getElementById("brb-quiz-feedback-box");
      const actionsBox = document.getElementById("brb-quiz-actions");

      modal.querySelectorAll(".brb-quiz-opt-btn").forEach((b) => {
        b.disabled = true;
        const bIdx = parseInt(b.getAttribute("data-index"), 10);
        if (bIdx === quiz.correct_index) {
          b.classList.add("brb-quiz-opt--correct");
        } else if (bIdx === selectedIdx && !isCorrect) {
          b.classList.add("brb-quiz-opt--incorrect");
        }
      });

      if (feedbackBox) {
        feedbackBox.style.display = "block";
        feedbackBox.className = `brb-quiz-feedback ${isCorrect ? "" : "brb-quiz-feedback--error"}`;
        feedbackBox.innerHTML = `
          <strong>${isCorrect ? "🎉 Brilliant! Correct Answer." : "💡 Almost! Here is the explanation:"}</strong>
          <p style="margin:4px 0 0 0; font-size:12px; color:#cbd5e1;">${quiz.explanation}</p>
        `;
      }

      if (isCorrect) {
        try {
          const res = await chrome.runtime.sendMessage({
            type: "CLAIM_MASTERY_BONUS",
            minutes: 5,
            videoId: videoInfo.videoId
          });
          if (res && res.state) {
            updateFocusModeUI(res.state);
            buildPanel(res.state, currentMintingProgress, currentMintingSeconds);
          }
        } catch (e) {}
      }

      if (actionsBox) {
        actionsBox.style.display = "flex";
      }

      document.getElementById("brb-quiz-continue-btn")?.addEventListener("click", () => {
        modal.remove();
        showMintedToast(isCorrect ? 5 : 0, isCorrect ? "🎉 +5 Mastery Minutes Added to Wallet!" : "Video Resumed");
        const videoEl = document.querySelector("video");
        if (videoEl && videoEl.paused) videoEl.play();
      });
    });
  });
}

function updateFocusModeUI(state) {
  const isFocusMode = state.wallet.focusMode || state.wallet.remainingMinutes <= 0;
  const currentVid = state.session?.currentVideo || {};
  const isEdu = (currentVid.educationScore >= 60) || currentVid.isVaultVideo;

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

  handleShortsBlocking(isFocusMode);
  renderLearningPassBanner(isEdu, isFocusMode);
  check3MinVaultBuffer(state);
}

function openAddVaultModal(state) {
  let modal = document.getElementById(MODAL_ID);
  if (modal) modal.remove();

  const currentInfo = extractVideoInfo();
  const isWatchPage = window.location.pathname.includes("/watch");
  const currentVid = state.session?.currentVideo || {};
  const isCurrentVideoEdu = (currentVid.educationScore >= 60) || currentVid.isVaultVideo;

  // ONLY auto-fill if the user is currently watching an educational video!
  // If watching entertainment, provide clean empty blanks.
  const defaultTitle = (isWatchPage && isCurrentVideoEdu && currentInfo.title && currentInfo.title !== "YouTube Video") ? currentInfo.title : "";
  const defaultUrl = (isWatchPage && isCurrentVideoEdu) ? window.location.href : "";

  modal = document.createElement("div");
  modal.id = MODAL_ID;
  modal.className = "brb-modal-overlay";

  modal.innerHTML = `
    <div class="brb-modal-card">
      <div class="brb-modal-head">
        <h3><span>📚</span> Add to Learning Vault</h3>
        <button id="brb-modal-close" class="brb-close-btn">&times;</button>
      </div>

      <p style="font-size:12px; color:#94a3b8; margin:-6px 0 2px 0; line-height:1.4;">
        ${isCurrentVideoEdu && isWatchPage ? "📌 Current educational video auto-filled below." : "💡 Enter an educational YouTube link or topic below to queue for your study sessions."}
      </p>

      <div id="brb-modal-warning-box" style="display:none; margin-bottom:4px;"></div>

      <div class="brb-input-group">
        <label>YouTube Link or Search Topic</label>
        <input type="text" id="brb-vault-url-input" class="brb-input-text" placeholder="https://youtube.com/watch?v=... or 'System Design'" value="${defaultUrl}">
      </div>

      <div class="brb-input-group">
        <label>Video Title / Note</label>
        <input type="text" id="brb-vault-title-input" class="brb-input-text" placeholder="e.g. System Design Tutorial" value="${defaultTitle}">
      </div>

      <div class="brb-input-group">
        <label>Quick Suggestions (1-Click Add)</label>
        <div class="brb-chips-container">
          <span class="brb-preset-chip" data-topic="System Design Deep Dive Architecture">⚡ System Design</span>
          <span class="brb-preset-chip" data-topic="Python Full Course for Beginners">🐍 Python Course</span>
          <span class="brb-preset-chip" data-topic="React 19 Tutorial Full Course">⚛️ React 19</span>
          <span class="brb-preset-chip" data-topic="Data Structures Algorithms Full Course">🧩 DSA Mastery</span>
          <span class="brb-preset-chip" data-topic="Docker and Kubernetes Tutorial">🐳 Docker & K8s</span>
        </div>
      </div>

      <div class="brb-modal-actions">
        <button id="brb-modal-cancel" class="brb-modal-cancel">Cancel</button>
        <button id="brb-modal-submit" class="brb-modal-submit">Save to Learning Vault</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("brb-modal-close")?.addEventListener("click", () => modal.remove());
  document.getElementById("brb-modal-cancel")?.addEventListener("click", () => modal.remove());

  modal.querySelectorAll(".brb-preset-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const topic = chip.getAttribute("data-topic");
      const urlInput = document.getElementById("brb-vault-url-input");
      const titleInput = document.getElementById("brb-vault-title-input");
      if (urlInput) urlInput.value = topic;
      if (titleInput) titleInput.value = topic;
    });
  });

  document.getElementById("brb-modal-submit")?.addEventListener("click", async () => {
    const urlInput = document.getElementById("brb-vault-url-input")?.value?.trim();
    const titleInput = document.getElementById("brb-vault-title-input")?.value?.trim();
    const warningBox = document.getElementById("brb-modal-warning-box");

    if (!urlInput && !titleInput) {
      showMintedToast(0, "Please enter a video URL or topic!", true);
      return;
    }

    const payload = {
      url: urlInput || defaultUrl,
      watchUrl: urlInput || defaultUrl,
      title: titleInput || urlInput || "Educational Video",
      channel: currentInfo.channel || "YouTube",
      category: "Verified Education"
    };

    try {
      const res = await chrome.runtime.sendMessage({
        type: "ADD_TO_VAULT",
        payload: payload
      });

      if (res && res.ok) {
        modal.remove();
        showMintedToast(0, res.message || "Added to Learning Vault!");
        if (res.state) {
          buildPanel(res.state, currentMintingProgress, currentMintingSeconds);
          const drawer = document.getElementById(VAULT_DRAWER_ID);
          if (drawer) {
            drawer.remove();
            toggleVaultDrawer(res.state);
          }
        }
      } else if (res && res.warning) {
        if (warningBox) {
          warningBox.style.display = "block";
          warningBox.className = "brb-quiz-feedback brb-quiz-feedback--error";
          warningBox.innerHTML = `<strong>⚠️ Action Blocked</strong><p style="margin:4px 0 0 0; font-size:12px; color:#fca5a5;">${res.warning}</p>`;
        }
        showMintedToast(0, res.warning, true);
      } else {
        showMintedToast(0, res?.warning || "Failed to add video.", true);
      }
    } catch (err) {
      showMintedToast(0, "Error adding to vault.", true);
    }
  });
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
          <p>${item.meta || "Educational video • +1m per 5m watched"}</p>
        </div>
        <button class="brb-vault-watch-btn" title="Watch on YouTube">${item.mastered ? "Mastered ✓" : "Watch"}</button>
        <button class="brb-vault-del-btn" data-id="${item.id || item.videoId}" title="Remove from Vault">&times;</button>
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
      <p style="font-size:13px; color:#94a3b8; margin:0 0 14px 0; line-height:1.5;">
        Watch any educational video below to restore your entertainment wallet (<strong>5 min watch = +1 min wallet</strong>) + take the 80% AI quiz for <strong>+5m bonus</strong>!
      </p>

      <button id="brb-drawer-add-btn" class="brb-cta brb-cta--vault" style="margin-bottom:16px; padding:10px 14px; font-size:12px;">
        + Add New Video / Topic to Vault
      </button>

      <div class="brb-vault-list">
        ${vaultListHTML || '<p style="color:#64748b; font-size:13px;">Your Learning Vault is empty. Click above to add videos!</p>'}
      </div>
    </div>
  `;

  document.body.appendChild(drawer);

  document.getElementById("brb-close-drawer")?.addEventListener("click", () => drawer.remove());

  document.getElementById("brb-drawer-add-btn")?.addEventListener("click", () => {
    openAddVaultModal(state);
  });

  drawer.querySelectorAll(".brb-vault-watch-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const card = btn.closest(".brb-vault-card");
      const targetUrl = card?.getAttribute("data-url");
      if (targetUrl) window.location.href = targetUrl;
    });
  });

  drawer.querySelectorAll(".brb-vault-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.classList.contains("brb-vault-del-btn")) return;
      const targetUrl = card.getAttribute("data-url");
      if (targetUrl) window.location.href = targetUrl;
    });
  });

  drawer.querySelectorAll(".brb-vault-del-btn").forEach((delBtn) => {
    delBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = delBtn.getAttribute("data-id");
      if (!id) return;
      try {
        const res = await chrome.runtime.sendMessage({
          type: "DELETE_FROM_VAULT",
          id: id
        });
        if (res && res.ok && res.state) {
          drawer.remove();
          toggleVaultDrawer(res.state);
          buildPanel(res.state, currentMintingProgress, currentMintingSeconds);
        }
      } catch (err) {}
    });
  });
}

function buildPanel(state, mintingProgress = 0, mintingSeconds = 0) {
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
  const isEdu = (currentVid.educationScore >= 60) || currentVid.isVaultVideo;
  const badgeClass = isFocusMode ? "brb-badge--focus" : (isEdu ? "brb-badge--edu" : "brb-badge--ent");
  const badgeText = isFocusMode ? "Focus Mode" : (isEdu ? "Learning Pass" : "Entertainment");

  const elapsedMins = Math.floor(mintingSeconds / 60);
  const elapsedSecs = mintingSeconds % 60;
  const timeProgressLabel = `${elapsedMins}m ${elapsedSecs}s / 5m`;

  const mintingBarHTML = (isEdu) ? `
    <div class="brb-minting-bar-wrap" style="margin-top:8px;">
      <div class="row-between" style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">
        <span style="color:#2dd4bf; font-weight:600;">⚡ Minting +1 min (${timeProgressLabel})</span>
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
      <div style="display:grid; gap:6px;">
        <button id="brb-open-dash-btn" class="brb-cta ${isFocusMode ? "brb-cta--vault" : ""}">
          ${isFocusMode ? "🎓 Open Learning Vault" : "Open Focus Dashboard"}
        </button>
        <button id="brb-add-vault-btn" class="brb-cta-sub" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:#94a3b8; border-radius:12px; padding:8px; font-size:11px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
          <span>➕</span> Add Video to Vault
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  document.getElementById("brb-open-dash-btn")?.addEventListener("click", () => {
    if (isFocusMode) {
      toggleVaultDrawer(state);
    } else {
      chrome.runtime.openOptionsPage ? chrome.runtime.openOptionsPage() : chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD" });
    }
  });

  document.getElementById("brb-add-vault-btn")?.addEventListener("click", () => {
    openAddVaultModal(state);
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
          currentMintingProgress = response.isEducational ? (response.mintingProgress || 0) : 0;
          currentMintingSeconds = response.isEducational ? (response.mintingSecondsWatched || 0) : 0;
          updateFocusModeUI(response.state);
          buildPanel(response.state, currentMintingProgress, currentMintingSeconds);

          if (response.mintedJustNow && response.isEducational) {
            showMintedToast(response.earnedAmount || 1, "🎉 +1 Minute Earned! (5m of learning completed)");
          }

          if (response.isEducational) {
            triggerQuizIfAtMilestone(videoInfo);
          }
        }
      } catch (err) {
        // Service worker retry
      }
    }
  }, 5000);
}

async function initOverlay() {
  if (!location.hostname.includes("youtube.com")) return;

  const state = await getState();
  updateFocusModeUI(state);
  buildPanel(state, currentMintingProgress, currentMintingSeconds);
  startTelemetryLoop();

  window.addEventListener("yt-navigate-finish", async () => {
    preFetchedQuiz = null;
    preFetchingVideoId = null;
    quizShownVideoId = null;
    currentMintingProgress = 0;
    currentMintingSeconds = 0;
    const nextState = await getState();
    updateFocusModeUI(nextState);
    buildPanel(nextState, currentMintingProgress, currentMintingSeconds);
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "STATE_UPDATED" && message.state) {
      updateFocusModeUI(message.state);
      buildPanel(message.state, currentMintingProgress, currentMintingSeconds);
    }
  });
}

// Initial execution
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initOverlay);
} else {
  initOverlay();
}
