import { getState } from "../lib/storage.js";

const PANEL_ID = "brb-floating-panel";

function buildPanel(state) {
  const existing = document.getElementById(PANEL_ID);
  if (existing) {
    existing.remove();
  }

  const panel = document.createElement("aside");
  panel.id = PANEL_ID;
  panel.className = "brb-floating-panel";

  const consumed = state.wallet.totalMinutes - state.wallet.remainingMinutes;
  const consumedPercent = Math.min(
    100,
    Math.round((consumed / state.wallet.totalMinutes) * 100)
  );

  panel.innerHTML = `
    <div class="brb-floating-inner">
      <div class="brb-floating-head">
        <div>
          <div class="eyebrow">Brain-Rot Balance</div>
          <h3 class="panel-title">Stay in control without leaving YouTube.</h3>
        </div>
        <div class="brb-badge">${state.session.detectedIntent}</div>
      </div>
      <div>
        <div class="row-between">
          <span class="muted">Entertainment wallet</span>
          <strong>${state.wallet.remainingMinutes} min left</strong>
        </div>
        <div class="brb-meter">
          <div class="brb-meter-fill" style="width: ${consumedPercent}%"></div>
        </div>
      </div>
      <div class="panel-card panel-card--soft">
        <div class="muted">Prediction</div>
        <div class="body-copy">${state.session.prediction}</div>
      </div>
      <div class="brb-floating-grid">
        <div class="brb-mini-stat">
          <span class="muted">Edu score</span>
          <strong>${state.session.currentVideo.educationScore}</strong>
        </div>
        <div class="brb-mini-stat">
          <span class="muted">Earn next</span>
          <strong>${state.vault[0].reward}</strong>
        </div>
      </div>
      <a class="brb-cta" href="${chrome.runtime.getURL("options.html")}">Open Focus Dashboard</a>
    </div>
  `;

  document.body.appendChild(panel);
}

function shouldInject() {
  return location.hostname.includes("youtube.com");
}

async function initOverlay() {
  if (!shouldInject()) {
    return;
  }
  const state = await getState();
  buildPanel(state);
}

initOverlay();
