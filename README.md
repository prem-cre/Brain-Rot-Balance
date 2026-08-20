# 🧠 Brain-Rot Balance (Learn2Unlock)

[![Chrome Extension](https://img.shields.io/badge/Manifest_V3-Chrome_Extension-blue?logo=googlechrome)](apps/extension)
[![FastAPI Backend](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi)](apps/api)
[![Groq LLM](https://img.shields.io/badge/Groq-llama--3.1--8b--instant-f55036)](apps/api)
[![Reinforcement Learning](https://img.shields.io/badge/RL-LinUCB_Contextual_Bandit-purple)](apps/api/src/ml)
[![Tests](https://img.shields.io/badge/Tests-9%20Passed%20(100%25)-success)](apps/api/tests)

> **"Learn first. Enjoy entertainment guilt-free later."**  
> A behavior-redesign Chrome extension and AI system for YouTube that transforms passive brain-rot scrolling into an earned, high-retention learning routine.

---

## 🎯 The Core Philosophy: Behavior Redesign over Hard Blocking

Traditional website blockers fail because they rely on punitive restrictions. When willpower is depleted, users disable or uninstall them.

**Brain-Rot Balance** re-engineers the digital reward loop:
1. **The Entertainment Wallet**: Every day, the user receives an entertainment budget measured in minutes (e.g. 50 minutes).
2. **Dynamic Consumption**: Watching entertainment drains wallet minutes (1 minute per minute watched).
3. **Adaptive Focus Mode**: When the wallet reaches 0 minutes, YouTube enters Focus Mode (recommendation feeds are blurred and Shorts `/shorts/*` are blocked).
4. **The 5:1 Educational Minting Ratio**: Focus Mode is unlocked by watching verified lessons in the **Learning Vault** ($5\text{ minutes of focused learning} = +1\text{ minute of entertainment wallet}$).
5. **AI Comprehension Quizzes**: At the 80% completion milestone of a lesson, Groq `llama-3.1-8b-instant` generates an instant 1-question micro-quiz. Answering correctly unlocks a **+5 Minute Mastery Jackpot**!

---

## 🏗️ Dual-Tier Edge + Cloud Architecture

To ensure **zero friction for open-source users** (<50 KB extension size, 0ms local latency) while providing **advanced applied ML/RL for production scale**, the system implements a dual-tier architecture:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CHROME EXTENSION (CLIENT-SIDE EDGE)                      │
│  • Size: < 50 KB (Zero downloads, zero PyTorch/TensorFlow bloat)            │
│  • Manifest V3 Content Script + Service Worker + Alarms                     │
│  • Fast Regex & Semantic Token Classifier (0ms offline latency)             │
│  • YouTube DOM In-Video HUD, Shorts Blocker, and Learning Vault Drawer      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Async Telemetry & API
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FASTAPI BACKEND (THE ML/RL CORE)                         │
│                                                                             │
│   1. Applied ML Semantic Classifier (apps/api/src/ml/classifier.py)         │
│      • Features: Sublinear TF-IDF + Unigram/Bigram N-Grams                  │
│      • Model: L2-Regularized Logistic Classifier with Sigmoid probabilities │
│      • Output: Calibrated P(Education) vs P(Entertainment)                  │
│                                                                             │
│   2. LinUCB Contextual Bandit RL Agent (apps/api/src/ml/rl_agent.py)        │
│      • Context Vector: [Streak, Fatigue Ratio, Quiz Rate, Completion Rate]  │
│      • Action Space: Standard 5:1, Burnout Relief 4:1, Mastery Jackpot 5:1  │
│      • Online Learning: Bayesian Ridge Regression Matrix Updates            │
│                                                                             │
│   3. Groq llama-3.1-8b-instant AI Quiz Engine (apps/api/src/services/quiz) │
│      • JSON-Mode LLM Micro-Quiz generator (250ms latency)                   │
│      • Concept-testing multiple choice with instant explanations            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 Mathematical Formulations

### 1. LinUCB Contextual Bandit Habit Policy
The RL Agent observes the user's cognitive state vector $x \in \mathbb{R}^5$:
$$x = \begin{bmatrix} 1.0 & \frac{\text{streak}}{30} & \frac{\text{spent\_mins}}{\text{budget}} & \text{quiz\_pass\_rate} & \text{completion\_rate} \end{bmatrix}^T$$

For each policy action arm $a \in \mathcal{A}$, the agent maintains a ridge regression matrix $A_a = D_a^T D_a + I_d$ and selects the action that maximizes the upper confidence bound:
$$a^* = \arg\max_{a \in \mathcal{A}} \left( \hat{\theta}_a^T x + \alpha \sqrt{x^T A_a^{-1} x} \right)$$

*Actions*:
- **$\text{Action } 0$ (Standard 5:1)**: $300\text{s}$ watch per $+1\text{m}$ wallet ($+5\text{m}$ quiz bonus).
- **$\text{Action } 1$ (Burnout Relief 4:1)**: $240\text{s}$ watch per $+1\text{m}$ wallet (reduces friction during high cognitive fatigue).
- **$\text{Action } 2$ (Mastery Challenge)**: $300\text{s}$ watch $+ +7\text{m}$ elevated quiz jackpot for consistent high streaks.
- **$\text{Action } 3$ (Bite-Sized Recovery)**: $200\text{s}$ micro-earning ratio to rebuild momentum after drop-offs.

---

### 2. Sublinear TF-IDF Text Classification
The ML engine extracts unigram and bigram tokens, weighted with sublinear term frequency:
$$\text{TF}(t, d) = 1 + \ln(\text{count}(t, d)), \quad \text{IDF}(t) = \ln\left(\frac{1 + N}{1 + \text{df}(t)}\right) + 1$$
$$P(y = \text{Education} \mid x) = \sigma(W \cdot \text{TF-IDF}(x) + b)$$

---

## ⚡ Key Features & UX Mechanics

- 🛡️ **3-Minute Pre-Commitment Buffer**: When the entertainment wallet drops to $\le 3$ minutes remaining, the extension pauses the entertainment video and prompts the user to queue at least 3 educational videos before Focus Mode locks.
- 🎓 **In-Video Learning Pass**: Educational videos bypass Focus Mode blurs and display a glowing glassmorphism HUD showing minting progress (`⚡ Minting +1 min: Xm Ys / 5m`).
- ❓ **80% AI Micro-Quiz**: At the 80% mark of an educational video, an interactive glassmorphic quiz pops up over the player, testing core concepts and awarding a **+5 Minute Mastery Bonus**.
- 🚫 **Strict Whitelist Vault Filter**: Prevents non-educational links (gaming, pranks, reactions, memes) from being added to the Learning Vault.
- ⏰ **Midnight Wallet Reset & Streak Engine**: Uses `chrome.alarms` to reset the daily wallet budget and update multi-day streaks at midnight.

---

## 🚀 Quickstart & Installation

### 1. Load the Chrome Extension (100% Free, Local)
1. Open Google Chrome and go to `chrome://extensions`.
2. Toggle on **Developer mode** (top-right).
3. Click **Load unpacked** (top-left).
4. Select the folder: `apps/extension`
5. Open [YouTube](https://www.youtube.com) and test!

---

### 2. Run the FastAPI Backend & AI Suite
```bash
cd apps/api

# 1. Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -e .

# 3. Configure Groq API Key (Optional for LLM Quizzes)
cp .env.example .env
# Edit .env and set GROQ_API_KEY=gsk_...

# 4. Start backend server
uvicorn src.main:app --reload --port 8000
```

Interactive API documentation will be live at `http://127.0.0.1:8000/docs`.

---

### 3. Run Automated Backend Test Suite
```bash
cd apps/api
python -m pytest
```
Output:
```text
======================== 9 passed in 2.38s ========================
```

---

## 📋 API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | System health check & version info |
| `GET` | `/api/v1/dashboard` | Aggregated user wallet, analytics, and vault state |
| `POST` | `/api/v1/wallet/boost` | Claim quick booster minutes |
| `POST` | `/api/v1/vault` | Add verified educational video to vault queue |
| `POST` | `/api/v1/learning/quiz` | Generate Groq `llama-3.1-8b-instant` 1-question micro-quiz |
| `POST` | `/api/v1/ml/classify` | TF-IDF + Logistic ML classification probabilities |
| `POST` | `/api/v1/ml/habit-policy` | LinUCB Contextual Bandit adaptive policy recommendation |
| `POST` | `/api/v1/ml/habit-feedback` | Online Bayesian RL policy update |

---

## 📜 License

MIT License. Designed for ethical digital health and habit transformation.
