# Brain-Rot Balance API

The FastAPI service powers the cloud-ready parts of the extension while keeping the product usable with zero paid AI services. The current implementation is intentionally local-first and deterministic: it uses an in-memory repository and a transparent classifier, so a contributor can run the API immediately. Database, transcript, embedding, and LLM providers can be introduced behind the service interfaces without changing the extension contract.

## Run locally

From `apps/api`:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
uvicorn src.main:app --reload
```

Open `http://127.0.0.1:8000/docs` for interactive API documentation.

## API shape

- `GET /api/v1/dashboard` returns the extension's initial dashboard payload.
- `POST /api/v1/videos/classify` classifies a video using title, description, and transcript text.
- `POST /api/v1/sessions/start` and `POST /api/v1/sessions/{id}/heartbeat` track engagement.
- `POST /api/v1/sessions/{id}/complete` settles wallet minutes for a watched video.
- `POST /api/v1/learning/verify` verifies a learning session and awards minutes when confidence is high enough.
- `GET|POST /api/v1/vault` manages the Learning Vault.
- `GET /api/v1/analytics/summary` returns product metrics for the dashboard.

## Production evolution

The repository interfaces in `src/repositories.py` are the seam for PostgreSQL/SQLModel persistence. The `VideoIntelligenceService` is the seam for transcript retrieval, sentence-transformer embeddings, and optional LLM classification. Keep those providers out of route handlers so local development remains free and reliable.
