# Brain-Rot Balance

Brain-Rot Balance is a YouTube-focused Chrome extension concept designed to help users earn entertainment through learning instead of relying on hard blocking alone.

## Product Direction

The project is built around a simple loop:

1. Classify YouTube videos as educational, entertainment, or mixed.
2. Track a daily entertainment wallet measured in minutes.
3. Enter Focus Mode when the wallet reaches zero.
4. Redirect the user toward a Learning Vault.
5. Restore entertainment minutes only after verified educational engagement.

This is intended to become a polished, resume-grade project that combines:

- Chrome extension engineering with Manifest V3
- React and TypeScript frontend work
- user behavior tracking and analytics
- AI-assisted video classification
- learning verification and unlock logic
- local-first product design with room for optional backend services

## Repository Structure

```text
Brain-Rot Balance/
+-- .github/
¦   +-- workflows/
+-- apps/
¦   +-- extension/
¦   ¦   +-- public/
¦   ¦   ¦   +-- icons/
¦   ¦   +-- src/
¦   ¦       +-- background/
¦   ¦       +-- components/
¦   ¦       +-- content/
¦   ¦       +-- features/
¦   ¦       ¦   +-- analytics/
¦   ¦       ¦   +-- classification/
¦   ¦       ¦   +-- focus-mode/
¦   ¦       ¦   +-- learning-vault/
¦   ¦       ¦   +-- wallet/
¦   ¦       +-- hooks/
¦   ¦       +-- lib/
¦   ¦       +-- options/
¦   ¦       +-- popup/
¦   ¦       +-- styles/
¦   ¦       +-- types/
¦   +-- api/
¦       +-- src/
¦           +-- lib/
¦           +-- models/
¦           +-- routes/
¦           +-- services/
+-- docs/
¦   +-- assets/
+-- packages/
¦   +-- shared/
¦       +-- src/
¦           +-- constants/
¦           +-- types/
+-- .gitignore
```

## Folder Responsibilities

### `apps/extension`
The main Chrome extension product.

Expected responsibilities:

- content scripts for YouTube DOM integration
- background service worker for session and wallet logic
- popup UI for quick wallet and streak visibility
- options/dashboard pages for analytics, settings, and Learning Vault views
- feature modules for classification, wallet accounting, Focus Mode, and engagement verification

### `apps/api`
Optional backend for features that should not live fully inside the extension.

Possible future responsibilities:

- transcript ingestion
- embedding generation
- quiz generation
- lightweight recommendation logic
- sync or analytics APIs if cloud support is added later

This folder is optional for MVP and can remain unused in the first version.

### `packages/shared`
Shared types, constants, and utility contracts between the extension and any backend service.

### `docs`
Project documentation, architecture notes, product plans, UI references, demo assets, and screenshots.

## Recommended MVP Scope

The first working release should focus on these features only:

- YouTube video and Shorts detection
- entertainment wallet in minutes
- Focus Mode when wallet reaches zero
- Shorts hiding and URL blocking
- Learning Vault with saved educational videos
- simple learning verification signals
- local analytics dashboard

Avoid building advanced AI systems in version one. A reliable, polished MVP is much stronger than a wide but unfinished feature set.

## Suggested Build Order

### Phase 1
- Scaffold the extension
- Detect YouTube navigation and current video state
- Add local storage and session tracking

### Phase 2
- Implement wallet logic
- Implement Focus Mode
- Block Shorts and blur entertainment-heavy surfaces

### Phase 3
- Add Learning Vault
- Add verified learning flow
- Add minutes restoration logic

### Phase 4
- Add classification heuristics
- Add analytics dashboard
- Polish UX, docs, and demo assets

## Tech Direction

Recommended stack:

- Extension: Manifest V3 with React and TypeScript
- UI: Tailwind CSS
- Storage: chrome.storage.local plus IndexedDB
- Backend later if needed: FastAPI or Node.js
- AI later if needed: transcript analysis, embeddings, quiz generation

## Free-First Strategy

To keep the project free and easy to ship:

- use local-first storage for MVP
- avoid paid LLM calls in the main workflow
- start with heuristics before adding AI services
- publish source with clear install instructions for unpacked extension usage

## Next Steps

1. Initialize the extension tooling.
2. Add the manifest and content/background scripts.
3. Build the wallet and Focus Mode loop before adding AI features.
4. Treat advanced AI and cloud sync as later milestones.

## Resume Positioning

A finished MVP can be described as:

> Built a Chrome extension for YouTube that classifies educational and entertainment content, tracks a minute-based entertainment wallet, activates Focus Mode when the daily budget is exhausted, and restores access through verified learning engagement.
