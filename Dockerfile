# Stage 1: build the Next.js frontend as static files.
FROM node:22-slim AS frontend
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# The NDA page reads templates from ../templates at build time.
COPY templates/ /src/templates/
RUN npm run build

# Stage 2: FastAPI backend serving the API and the static frontend.
FROM ghcr.io/astral-sh/uv:python3.14-trixie-slim
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_NO_DEV=1
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --locked --no-install-project
COPY backend/app/ ./app/
COPY --from=frontend /src/frontend/out/ ./static/
EXPOSE 8000
CMD ["uv", "run", "--no-sync", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
