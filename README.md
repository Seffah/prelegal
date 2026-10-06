# prelegal

A platform for drafting legal agreements, built as part of Ed Donner's coursework.

## Status

**This project is in the planning stage.** No application code has been written yet. The feature set, tech stack and architecture are still being worked out, and everything here may change.

## Goals

prelegal aims to help users draft common legal agreements quickly and consistently.

## Roadmap

- [ ] Define the scope and the first agreement types to support
- [ ] Choose the tech stack
- [ ] Design the architecture
- [ ] Build an initial prototype

## Project structure

```
backend/   FastAPI API (Python, managed with uv)
frontend/  Next.js web app (TypeScript, App Router)
```

## Getting started

Backend (runs on http://localhost:8000):

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload
uv run pytest
```

Frontend (runs on http://localhost:3000; `/api/*` is proxied to the backend):

```bash
cd frontend
npm install
npm run dev
```

Copy each `.env.example` to `.env` to override the defaults.

## Contributing

The project isn't ready for code contributions yet. Ideas and feedback are welcome through [GitHub issues](https://github.com/Seffah/prelegal/issues).

## License

Released under the [MIT License](LICENSE).
