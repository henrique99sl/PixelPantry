# Stage 1: Build frontend (Vite + React + TypeScript)
FROM node:18-alpine AS frontend-build
WORKDIR /src/frontend

COPY frontend/package.json frontend/package-lock.json* ./
COPY frontend/tsconfig.json frontend/vite.config.ts frontend/index.html ./
COPY frontend/src ./src

RUN npm ci --silent
RUN npm run build

# Stage 2: Runtime image (Python + FastAPI)
FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r ./backend/requirements.txt

COPY backend ./backend
COPY --from=frontend-build /src/frontend/dist ./backend/frontend_dist

# Criar diretórios permanentes
RUN mkdir -p ./backend/art ./backend/frontend_dist

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
