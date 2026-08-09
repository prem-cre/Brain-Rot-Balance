# Learn2Unlock (Brain-Rot Balance) — Project Masterplan & Technical Specification

## 1. System Identity & Vision
**Learn2Unlock** (repository: `Brain-Rot Balance`) is a Chrome Extension-first product for YouTube designed to redesign online watching habits. Rather than forcing hard blocks, it introduces a dynamic behavioral economics loop:
- **Daily Entertainment Budget**: Measured in minutes.
- **Consumption vs Earning**: Watching entertainment drains wallet minutes; watching verified educational content earns wallet minutes back.
- **Focus Mode**: Activated when the wallet hits 0. Hides Shorts, blurs entertainment recommendations, and promotes the user's Learning Vault.
- **Telemetry Verification**: Unlocks are verified using tab focus, watch ratio, playback speed, and optional comprehension checks.

---

## 2. System Architecture

```text
[ Chrome Extension Manifest V3 ]
   |
   +---> Content Script (youtube-overlay.js)
   |        - Injects overlay UI & wallet pill
   |        - Monitors video telemetry (watch time, tab focus %, playback rate)
   |        - Enforces Focus Mode (Shorts route blocker + recommendation feed blur)
   |
   +---> Background Service Worker (service-worker.js)
   |        - Manages minute-by-minute wallet accounting
   |        - Persists state in chrome.storage.local / IndexedDB
   |        - Communicates with FastAPI backend via REST API (X-Device-ID header)
   |
   +---> Popup UI & Options Page (popup.html / options.html)
            - Glassmorphism dark studio design system
            - Wallet status, streak tracking, Learning Vault queue, live analytics

[ FastAPI Backend Service (apps/api) ]
   |
   +---> Video Intelligence Service: Dual scoring engine (Education vs Entertainment)
   +---> Learning Service: Confidence score calculation formula
   +---> Wallet Service: Daily reset, minute additions & deductions
   +---> PostgreSQL / Neon Database: Async SQLAlchemy ORM persistence
```

---

## 3. Core Engine Formulas

### Learning Confidence Score
$$\text{Confidence Score} = (0.40 \times \text{Watch Ratio}) + (0.30 \times \text{Focus Ratio}) + (0.15 \times \text{Playback Speed Weight}) + (0.15 \times \text{Quiz Score})$$

### Earned Wallet Minutes
$$\text{Earned Minutes} = \text{Video Duration (mins)} \times \text{Education Score} \times \text{Confidence Score}$$

---

## 4. Repository Structure & Key Components

- **`apps/extension/`**: Chrome Extension Manifest V3
  - [youtube-overlay.js](file:///c:/Users/PremKumar/Documents/Brain-Rot Balance/apps/extension/src/content/youtube-overlay.js): YouTube DOM player telemetry & Focus Mode DOM engine.
  - [youtube-overlay.css](file:///c:/Users/PremKumar/Documents/Brain-Rot Balance/apps/extension/src/content/youtube-overlay.css): Glassmorphism panels, focus mode blurs, and Shorts overlay.
  - [service-worker.js](file:///c:/Users/PremKumar/Documents/Brain-Rot Balance/apps/extension/src/background/service-worker.js): Background wallet accounting & state machine.
  - [popup.js](file:///c:/Users/PremKumar/Documents/Brain-Rot Balance/apps/extension/src/popup/popup.js): Extension popup interface.

- **`apps/api/`**: FastAPI Backend
  - [main.py](file:///c:/Users/PremKumar/Documents/Brain-Rot Balance/apps/api/src/main.py): Application entry point and route registrations.
  - [postgres_repository.py](file:///c:/Users/PremKumar/Documents/Brain-Rot Balance/apps/api/src/postgres_repository.py): Async PostgreSQL database layer.
  - [video_intelligence.py](file:///c:/Users/PremKumar/Documents/Brain-Rot Balance/apps/api/src/services/video_intelligence.py): Classification service.
  - [learning.py](file:///c:/Users/PremKumar/Documents/Brain-Rot Balance/apps/api/src/services/learning.py): Confidence verification logic.

---

## 5. Development & Testing Instructions

### Extension Installation (Unpacked)
1. Open `chrome://extensions/` in Google Chrome.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select `apps/extension`.

### FastAPI Backend Server
```bash
cd apps/api
pip install -e .[dev]
uvicorn src.main:app --reload --port 8000
```

### Running Backend Unit Tests
```bash
cd apps/api
python -m pytest
```
