# prelegal

A platform for drafting legal agreements from [Common Paper](https://github.com/CommonPaper) templates, built as part of Ed Donner's coursework.

## Status

The V1 technical foundation is in place: a FastAPI backend that also serves the statically built Next.js frontend, a SQLite database, and Docker packaging with start and stop scripts. At `/draft` you chat with an AI assistant that helps you pick one of 11 Common Paper agreements (see `catalog.json`), asks for its key terms, fills in a live preview as you answer, and lets you download the result as a PDF. If you ask for a document it can't create, it suggests the closest one it can. Sign up and sign in are planned.

## Running with Docker

Requires Docker. The AI chat needs an [OpenRouter](https://openrouter.ai) API key in a `.env` file in the project root:

```bash
OPENROUTER_API_KEY=sk-or-...
```

It uses a free model, so replies can be slow or rate-limited.

```bash
# Mac
scripts/start-mac.sh
scripts/stop-mac.sh

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows (PowerShell)
scripts/start-windows.ps1
scripts/stop-windows.ps1
```

The app is then available at http://localhost:8000. The SQLite database is created from scratch each time the app starts, so data does not survive a restart.

## Project structure

```
backend/    FastAPI app (Python, managed with uv); serves /api and the built frontend
            app/documents.json defines each document's Cover Page fields and parties
frontend/   Next.js app (TypeScript, App Router), exported as static files
templates/  Common Paper agreement templates (see catalog.json)
scripts/    Start and stop scripts for each platform
```

## Local development

Backend (http://localhost:8000):

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload
uv run pytest
RUN_LIVE_TESTS=1 uv run pytest   # also calls OpenRouter
```

Frontend (http://localhost:3000; `/api/*` is proxied to the backend):

```bash
cd frontend
npm install
npm run dev
```

`npm run build` writes the static site to `frontend/out/`. Copy each `.env.example` to `.env` to override the defaults.

## License

Released under the [MIT License](LICENSE). Templates are from Common Paper under CC BY 4.0.
