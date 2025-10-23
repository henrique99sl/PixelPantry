# Stage 1: Build frontend (Vite + React + TypeScript)
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
COPY frontend/tsconfig.json frontend/vite.config.ts frontend/index.html ./
COPY frontend/src ./src

RUN npm ci --silent && npm run build

# Stage 2: Runtime image (Python + FastAPI)
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Instala dependências Python
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir --upgrade -r ./backend/requirements.txt

# Copia backend + frontend build
COPY backend ./backend
COPY --from=frontend-build /app/frontend/dist ./backend/frontend_dist

# Cria diretórios persistentes
RUN mkdir -p ./backend/art

# Expõe porta para Render
EXPOSE 8000

# Comando para iniciar a aplicação
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
