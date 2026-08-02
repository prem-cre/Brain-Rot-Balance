import { getState } from "../lib/storage.js";

function renderVault(items) {
  return items
    .map(
      (item, index) => `
      <article class="vault-row">
        <div class="vault-index">${String(index + 1).padStart(2, "0")}</div>
        <div class="vault-copy">
          <h4>${item.title}</h4>
          <p>${item.meta}</p>
        </div>
        <div class="vault-meta">
          <span class="reward-pill">${item.reward}</span>
          <button class="mini-button">Queue</button>
        </div>
      </article>
    `
    )
    .join("");
}

async function initOptions() {
  const state = await getState();
  const root = document.getElementById("options-root");
  const walletUsed = state.wallet.totalMinutes - state.wallet.remainingMinutes;
  const walletPercent = Math.round(
    (walletUsed / state.wallet.totalMinutes) * 100
  );

  root.innerHTML = `
    <section class="dashboard-app">
      <header class="dash-hero">
        <div>
          <div class="eyebrow">Brain-Rot Balance</div>
          <h1 class="dash-title">A YouTube learning companion, not a punishment app.</h1>
          <p class="hero-copy">
            Track entertainment in minutes, trigger Focus Mode at the right time, and route yourself back into intentional learning.
          </p>
        </div>
        <div class="hero-actions">
          <button class="ghost-button">Export Insights</button>
          <button class="primary-button">Start Focus Cycle</button>
        </div>
      </header>

      <section class="hero-metrics">
        <article class="wallet-panel">
          <div class="row-between">
            <div>
              <div class="eyebrow">Entertainment Wallet</div>
              <h2>${state.wallet.remainingMinutes} min remaining</h2>
            </div>
            <div class="wallet-pill">${state.wallet.focusMode ? "Focus mode" : "Balanced"}</div>
          </div>
          <div class="meter meter--large">
            <div class="meter-fill" style="width: ${walletPercent}%"></div>
          </div>
          <div class="three-col">
            <div>
              <span class="muted">Spent</span>
              <strong>${state.wallet.spentMinutes} min</strong>
            </div>
            <div>
              <span class="muted">Earned</span>
              <strong>${state.wallet.earnedMinutes} min</strong>
            </div>
            <div>
              <span class="muted">Streak</span>
              <strong>${state.wallet.streakDays} days</strong>
            </div>
          </div>
        </article>

        <article class="signal-panel">
          <div class="eyebrow">Behavior Engine</div>
          <h3>${state.session.detectedIntent}</h3>
          <p class="body-copy">${state.session.prediction}</p>
          <div class="signal-stack">
            <span class="score-pill score-pill--edu">Learning confidence ${Math.round(
              state.wallet.learningConfidence * 100
            )}%</span>
            <span class="score-pill score-pill--fun">Knowledge score ${state.dailyStats.knowledgeScore}</span>
          </div>
        </article>
      </section>

      <section class="dashboard-grid">
        <article class="panel-card">
          <div class="section-head">
            <h2>Daily Breakdown</h2>
            <span class="muted">August 2, 2026</span>
          </div>
          <div class="breakdown-list">
            <div class="breakdown-row">
              <span>Learning time</span>
              <strong>${state.dailyStats.learningMinutes} min</strong>
            </div>
            <div class="breakdown-row">
              <span>Entertainment time</span>
              <strong>${state.dailyStats.entertainmentMinutes} min</strong>
            </div>
            <div class="breakdown-row">
              <span>Focus mode</span>
              <strong>${state.dailyStats.focusMinutes} min</strong>
            </div>
          </div>
        </article>

        <article class="panel-card">
          <div class="section-head">
            <h2>Current Video Intelligence</h2>
            <span class="muted">${state.session.currentVideo.status}</span>
          </div>
          <h3 class="panel-title">${state.session.currentVideo.title}</h3>
          <p class="muted">${state.session.currentVideo.channel}</p>
          <div class="dual-meter">
            <div>
              <div class="row-between">
                <span>Education score</span>
                <strong>${state.session.currentVideo.educationScore}</strong>
              </div>
              <div class="meter">
                <div class="meter-fill meter-fill--edu" style="width: ${state.session.currentVideo.educationScore}%"></div>
              </div>
            </div>
            <div>
              <div class="row-between">
                <span>Entertainment score</span>
                <strong>${state.session.currentVideo.entertainmentScore}</strong>
              </div>
              <div class="meter">
                <div class="meter-fill meter-fill--fun" style="width: ${state.session.currentVideo.entertainmentScore}%"></div>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section class="panel-card">
        <div class="section-head">
          <h2>Learning Vault</h2>
          <span class="muted">Recommended next unlocks</span>
        </div>
        <div class="vault-list">
          ${renderVault(state.vault)}
        </div>
      </section>

      <section class="panel-card">
        <div class="section-head">
          <h2>Product Vision Surface</h2>
          <span class="muted">What this frontend already represents</span>
        </div>
        <div class="feature-grid">
          <article class="feature-card">
            <span class="feature-tag">Wallet</span>
            <h3>Minute-based entertainment budget</h3>
            <p>Users think in time, not arbitrary credits, so the wallet stays legible and persuasive.</p>
          </article>
          <article class="feature-card">
            <span class="feature-tag">Focus Mode</span>
            <h3>Adaptive lock instead of a harsh blocker</h3>
            <p>Hide Shorts, blur noisy recommendations, and route the user into a purposeful learning queue.</p>
          </article>
          <article class="feature-card">
            <span class="feature-tag">AI Layer</span>
            <h3>Scoring and confidence, not just timers</h3>
            <p>Education score, entertainment score, and engagement confidence make the loop smarter.</p>
          </article>
        </div>
      </section>
    </section>
  `;
}

initOptions();
