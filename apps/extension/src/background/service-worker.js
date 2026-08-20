import { defaultState } from "../lib/mock-data.js";

const STORAGE_KEY = "brain_rot_balance_state";
const EDU_EARN_THRESHOLD_SECONDS = 300; // 5 minutes of educational watch time per +1 minute earned
const ENT_DRAIN_THRESHOLD_SECONDS = 60; // 1 minute of entertainment watch time per -1 minute drained

let playbackCounter = {}; // videoId -> { secondsWatched, secondsFocused }

const EDU_REGEX = /\b(tutorial|course|lecture|explained|how to|learn|architecture|system design|data structures|algorithms|leetcode|python|reactjs|react\.js|vuejs|angular|django|fastapi|docker|kubernetes|postgres|database|sql|aws|cloud computing|machine learning|artificial intelligence|deep learning|devops|cybersecurity|calculus|linear algebra|statistics|physics|chemistry|biology|neuroscience|documentary|crash course|deep dive|masterclass|study with me|web development|frontend development|backend development|full stack|veritasium|3blue1brown|kurzgesagt|khan academy|mit opencourseware|freecodecamp|traversy media|neetcode)\b/i;

const ENT_REGEX = /\b(reaction|reacting|reacts|prank|meme|memes|funny|comedy|gaming|gameplay|lets play|stream highlights|trailer|teaser|vlog|tiktok|shorts|parody|roast|fails|challenge|unboxing|gossip|drama|celebrity|music video|official audio|lyrics|diss track|standup|movie clip|entertainment|funniest|mrbeast|speedrun)\b/i;

function classifySemantic(title = "", channel = "", url = "") {
  const text = `${title} ${channel} ${url}`.trim();
  const hasEdu = EDU_REGEX.test(text);
  const hasEnt = ENT_REGEX.test(text);

  if (hasEdu && !hasEnt) {
    return { isEdu: true, eduScore: 92, entScore: 8 };
  }
  if (hasEnt && !hasEdu) {
    return { isEdu: false, eduScore: 10, entScore: 90 };
  }
  if (hasEdu && hasEnt) {
    // If it has "reaction" or "reacting" in title without "tutorial" or "course", it is entertainment!
    if (/\b(reaction|reacting|reacts|meme|prank|gaming)\b/i.test(text)) {
      return { isEdu: false, eduScore: 25, entScore: 75 };
    }
    return { isEdu: true, eduScore: 70, entScore: 30 };
  }
  // Default for unlabeled general YouTube videos is ENTERTAINMENT (whitelist approach)
  return { isEdu: false, eduScore: 20, entScore: 80 };
}

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

function parseYouTubeUrl(input) {
  if (!input) return { videoId: null, watchUrl: null };
  const trimmed = input.trim();
  
  // Standard watch URL: youtube.com/watch?v=VIDEO_ID
  const watchMatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (watchMatch && watchMatch[1]) {
    return {
      videoId: watchMatch[1],
      watchUrl: `https://www.youtube.com/watch?v=${watchMatch[1]}`
    };
  }

  // Shorts URL
  const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([^"&?\/\s]{11})/i);
  if (shortsMatch && shortsMatch[1]) {
    return {
      videoId: shortsMatch[1],
      watchUrl: `https://www.youtube.com/watch?v=${shortsMatch[1]}`
    };
  }

  // If already an 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return {
      videoId: trimmed,
      watchUrl: `https://www.youtube.com/watch?v=${trimmed}`
    };
  }

  // Search Query Topic fallback
  return {
    videoId: `search-${Date.now()}`,
    watchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(trimmed)}`
  };
}

async function checkAndPerformDailyReset(state) {
  const today = new Date().toISOString().slice(0, 10);
  if (!state.lastActiveDate) {
    state.lastActiveDate = today;
    await saveStoredState(state);
    return state;
  }

  if (state.lastActiveDate !== today) {
    const yesterdayLearned = (state.dailyStats?.learningMinutes || 0) >= 10;
    if (yesterdayLearned) {
      state.wallet.streakDays = (state.wallet.streakDays || 0) + 1;
    }

    state.wallet.remainingMinutes = state.wallet.totalMinutes || 50;
    state.wallet.spentMinutes = 0;
    state.wallet.earnedMinutes = 0;
    state.wallet.focusMode = false;
    state.dailyStats = {
      learningMinutes: 0,
      entertainmentMinutes: 0,
      focusMinutes: 0,
      knowledgeScore: 88
    };
    state.lastActiveDate = today;
    await saveStoredState(state);
    await notifyTabs(state);
  }
  return state;
}

chrome.runtime.onInstalled.addListener(async () => {
  const state = await getStoredState();
  await checkAndPerformDailyReset(state);
  if (chrome.alarms) {
    chrome.alarms.create("DAILY_MIDNIGHT_RESET", { periodInMinutes: 30 });
  }
});

if (chrome.alarms) {
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "DAILY_MIDNIGHT_RESET") {
      const state = await getStoredState();
      await checkAndPerformDailyReset(state);
    }
  });
}

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

  if (message?.type === "DELETE_FROM_VAULT" && message.id) {
    (async () => {
      const state = await getStoredState();
      state.vault = (state.vault || []).filter(
        (v) => v.id !== message.id && v.videoId !== message.id
      );
      await saveStoredState(state);
      await notifyTabs(state);
      sendResponse({ ok: true, state, message: "Removed from Learning Vault" });
    })();
    return true;
  }

  if (message?.type === "ADD_TO_VAULT" && message.payload) {
    (async () => {
      const state = await getStoredState();
      const item = message.payload;
      const parsed = parseYouTubeUrl(item.url || item.watchUrl || item.videoId || "");
      
      const videoId = parsed.videoId || item.videoId || `custom-${Date.now()}`;
      const watchUrl = parsed.watchUrl || item.watchUrl || `https://www.youtube.com/watch?v=${videoId}`;
      const title = (item.title || "").trim() || "Educational Masterclass";
      const category = item.category || "General Learning";

      // Strict Whitelist Classification: MUST BE EDUCATIONAL TO ENTER VAULT
      const classification = classifySemantic(title, item.channel || "", watchUrl);

      if (!classification.isEdu) {
        sendResponse({
          ok: false,
          warning: `⚠️ Cannot add to Learning Vault: "${title}" is classified as Entertainment (${classification.entScore}% Fun / ${classification.eduScore}% Edu). Only verified educational tutorials and courses can be queued in your vault.`
        });
        return;
      }

      state.vault = state.vault || [];
      const exists = state.vault.some(
        (v) => v.videoId === videoId || (v.title && v.title.toLowerCase() === title.toLowerCase())
      );

      if (!exists) {
        const newVaultItem = {
          id: `vault-${Date.now()}`,
          title: title,
          meta: `${item.channel || "YouTube"} • ${category}`,
          reward: "+1 min per 5m watched",
          videoId: videoId,
          watchUrl: watchUrl,
          educationScore: classification.eduScore
        };
        state.vault.unshift(newVaultItem);
        await saveStoredState(state);
        await notifyTabs(state);
      }
      sendResponse({ ok: true, state, message: `Added "${title}" to Learning Vault!` });
    })();
    return true;
  }

  if (message?.type === "CLAIM_MASTERY_BONUS") {
    (async () => {
      const state = await getStoredState();
      const bonusMinutes = message.minutes || 5;
      const videoId = message.videoId;

      state.wallet.remainingMinutes = Math.min(
        state.wallet.totalMinutes,
        (state.wallet.remainingMinutes || 0) + bonusMinutes
      );
      state.wallet.earnedMinutes = (state.wallet.earnedMinutes || 0) + bonusMinutes;
      state.dailyStats = state.dailyStats || {};
      state.dailyStats.learningMinutes = (state.dailyStats.learningMinutes || 0) + bonusMinutes;

      // Mark video as mastered in vault
      if (videoId && state.vault) {
        state.vault = state.vault.map((v) => {
          if (v.videoId === videoId || (v.watchUrl && v.watchUrl.includes(videoId))) {
            return { ...v, mastered: true, reward: "Mastered ✓ (+5m Earned)" };
          }
          return v;
        });
      }

      if (state.wallet.remainingMinutes > 0) {
        state.wallet.focusMode = false;
      }

      await saveStoredState(state);
      await notifyTabs(state);
      sendResponse({ ok: true, state, claimedMinutes: bonusMinutes });
    })();
    return true;
  }

  if (message?.type === "FETCH_QUIZ" && message.payload) {
    (async () => {
      const payload = message.payload;
      try {
        const res = await fetch("http://127.0.0.1:8000/api/v1/learning/quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            video_id: payload.videoId || "video-quiz",
            title: payload.title || "Educational Video",
            description: payload.description || ""
          })
        });
        if (res.ok) {
          const quizData = await res.json();
          sendResponse({ ok: true, quiz: quizData });
          return;
        }
      } catch (err) {
        // Fallback local quiz generation
      }

      // Local heuristic fallback if backend API is not running
      const titleLower = (payload.title || "").toLowerCase();
      let fallbackQuiz;

      if (titleLower.includes("react") || titleLower.includes("frontend") || titleLower.includes("component")) {
        fallbackQuiz = {
          concept: "React State Architecture",
          question: "Why should side effects (like data fetching) be placed inside useEffect instead of the component body?",
          options: [
            "To prevent infinite re-render loops and execute side-effects after DOM commits",
            "Because React components cannot execute standard JavaScript",
            "To automatically convert client code into server code",
            "To force synchronous component mounting"
          ],
          correct_index: 0,
          explanation: "useEffect schedules side effects to run after render completion according to explicit dependency changes.",
          bonus_minutes: 5
        };
      } else if (titleLower.includes("python") || titleLower.includes("asyncio")) {
        fallbackQuiz = {
          concept: "Python Generators",
          question: "What is the primary advantage of using Python generators with the 'yield' keyword?",
          options: [
            "O(1) memory efficiency through lazy evaluation",
            "Automatic thread safety without locks",
            "Direct GPU memory allocation",
            "Eliminating runtime exceptions"
          ],
          correct_index: 0,
          explanation: "Generators compute elements lazily on demand, avoiding the memory overhead of large collections.",
          bonus_minutes: 5
        };
      } else {
        fallbackQuiz = {
          concept: "System Architecture",
          question: "Which pattern is primarily used to distribute traffic and eliminate single points of failure in scalable web services?",
          options: [
            "Deploying a Reverse Proxy / Load Balancer",
            "Increasing single machine disk capacity",
            "Disabling database indices",
            "Hardcoding server IPs in clients"
          ],
          correct_index: 0,
          explanation: "Load balancers distribute network load across server pools, maximizing throughput and availability.",
          bonus_minutes: 5
        };
      }

      sendResponse({ ok: true, quiz: fallbackQuiz });
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

      // Check if video is in Learning Vault (Strict ID or URL check only)
      const isVaultVideo = (state.vault || []).some(
        (v) => (v.videoId && videoId && v.videoId === videoId) || 
               (v.watchUrl && videoId && v.watchUrl.includes(videoId))
      );

      // Semantic Classification
      const classification = classifySemantic(payload.title || "", payload.channel || "", payload.url || "");
      const isEdu = isVaultVideo || classification.isEdu;
      const eduScore = isVaultVideo ? 98 : classification.eduScore;
      const entScore = 100 - eduScore;

      state.session = state.session || {};
      state.session.currentVideo = {
        title: payload.title || "YouTube Video",
        channel: payload.channel || "YouTube Channel",
        educationScore: eduScore,
        entertainmentScore: entScore,
        status: isEdu ? "Learning-positive" : "Entertainment",
        isVaultVideo: isVaultVideo
      };

      state.dailyStats = state.dailyStats || { learningMinutes: 0, entertainmentMinutes: 0, focusMinutes: 0, knowledgeScore: 85 };

      let mintedJustNow = false;
      let earnedAmount = 0;

      // 5:1 RATIO: 5 Minutes (300s) of Educational Watch Time = +1 Minute Entertainment Wallet
      if (isEdu) {
        if (counter.secondsWatched >= EDU_EARN_THRESHOLD_SECONDS) {
          counter.secondsWatched -= EDU_EARN_THRESHOLD_SECONDS;
          earnedAmount = 1; // 1 minute earned per 5 minutes watched
          
          state.wallet.remainingMinutes = Math.min(
            state.wallet.totalMinutes,
            (state.wallet.remainingMinutes || 0) + earnedAmount
          );
          state.wallet.earnedMinutes = (state.wallet.earnedMinutes || 0) + earnedAmount;
          state.dailyStats.learningMinutes = (state.dailyStats.learningMinutes || 0) + 5;
          mintedJustNow = true;
          counter.secondsFocused = 0;

          if (state.wallet.remainingMinutes > 0) {
            state.wallet.focusMode = false;
          }

          await saveStoredState(state);
          notifyTabs(state);
        }
      } else {
        // Entertainment Content: 1 Minute (60s) of Viewing = -1 Minute Entertainment Wallet
        // NO MINTING PROGRESS CAN EVER INCREASE ON ENTERTAINMENT
        if (counter.secondsWatched >= ENT_DRAIN_THRESHOLD_SECONDS) {
          counter.secondsWatched -= ENT_DRAIN_THRESHOLD_SECONDS;
          
          state.wallet.remainingMinutes = Math.max(0, (state.wallet.remainingMinutes || 0) - 1);
          state.wallet.spentMinutes = (state.wallet.spentMinutes || 0) + 1;
          state.dailyStats.entertainmentMinutes = (state.dailyStats.entertainmentMinutes || 0) + 1;

          if (state.wallet.remainingMinutes <= 0) {
            state.wallet.focusMode = true;
          }

          await saveStoredState(state);
          notifyTabs(state);
        }
      }

      // Calculate progress towards next +1 min: STRICTLY 0 FOR ENTERTAINMENT
      const mintingProgress = isEdu
        ? Math.min(100, Math.round((counter.secondsWatched / EDU_EARN_THRESHOLD_SECONDS) * 100))
        : 0;

      sendResponse({
        ok: true,
        state,
        mintingProgress,
        mintingSecondsWatched: isEdu ? counter.secondsWatched : 0,
        mintedJustNow,
        earnedAmount,
        isEducational: isEdu
      });
    })();

    return true; // Keep message channel open for async response
  }
});
