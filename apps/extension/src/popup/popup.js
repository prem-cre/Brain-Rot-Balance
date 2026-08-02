import { getState } from "../lib/storage.js";

function renderVault(items) {
  return items
    .map(
      (item) => `
      <article class="vault-item">
        <div>
          <h4>${item.title}</h4>
          <p>${item.meta}</p>
        </div>
        <span class="reward-pill">${item.reward}</span>
      </article>
    `
    )
    .join("");
}

function renderInsights(items) {
  return items
    .map(
      (item) => `
      <article class="stat-chip stat-chip--${item.tone}">
        <span>${item.label}</span>
        <strong>${item.value}</strong>
      </article>
    `
    )
    .join("");
}

async function openDashboard() {
  if (typeof chrome !== "undefined" && chrome.runtime?.openOptionsPage) {
    chrome.runtime.openOptionsPage();
    return;
  }
  window.location.href = "../options.html";
}

async function initPopup() {
  const state = await getState();
  const root = document.getElementById("popup-root");

  root.innerHTML = `
    <section class="popup-app">
      <div class="hero-panel">
        <div class="eyebrow">Learn first. Enjoy guilt-free later.</div>
        <div class="hero-grid">
          <div>
            <h1 class="hero-title">Brain-Rot Balance</h1>
            <p class="hero-copy">
              Your YouTube companion for turning passive scrolling into earned entertainment.
            </p>
          </div>
          <div class="wallet-orb">
            <span>Wallet</span>
            <strong>${state.wallet.remainingMinutes}</strong>
            <small>minutes left</small>
          </div>
        </div>
      </div>

      <div class="stats-row">
        <article class="metric-card">
          <span>Learning Confidence</span>
          <strong>${Math.round(state.wallet.learningConfidence * 100)}%</strong>
          <small>verified engagement</small>
        </article>
        <article class="metric-card">
          <span>Streak</span>
          <strong>${state.wallet.streakDays} days</strong>
          <small>consistent unlock loop</small>
        </article>
      </div>

      <article class="panel-card">
        <div class="row-between">
          <div>
            <div class="eyebrow">Now watching</div>
            <h3 class="panel-title">${state.session.currentVideo.title}</h3>
            <p class="muted">${state.session.currentVideo.channel}</p>
          </div>
          <div class="classification-stack">
            <span class="score-pill score-pill--edu">Edu ${state.session.currentVideo.educationScore}</span>
            <span class="score-pill score-pill--fun">Fun ${state.session.currentVideo.entertainmentScore}</span>
          </div>
        </div>
      </article>

      <article class="panel-card panel-card--soft">
        <div class="row-between">
          <div>
            <div class="eyebrow">Behavior prediction</div>
            <p class="body-copy">${state.session.prediction}</p>
          </div>
          <span class="intent-pill">${state.session.detectedIntent}</span>
        </div>
      </article>

      <section class="stack-section">
        <div class="section-head">
          <h2>Learning Vault</h2>
          <span class="muted">Best next unlocks</span>
        </div>
        ${renderVault(state.vault)}
      </section>

      <section class="stack-section">
        <div class="section-head">
          <h2>Today</h2>
          <span class="muted">Live snapshot</span>
        </div>
        <div class="chips-grid">
          ${renderInsights(state.insights)}
        </div>
      </section>

      <div class="cta-row">
        <button class="ghost-button" id="focusToggle">Focus mode ${state.wallet.focusMode ? "on" : "ready"}</button>
        <button class="primary-button" id="openDashboard">Open Dashboard</button>
      </div>
    </section>
  `;

  document
    .getElementById("openDashboard")
    .addEventListener("click", openDashboard);
}

initPopup();
