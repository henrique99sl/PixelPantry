# Pixel Pantry — Tiny Pixel Art Editor & Gallery

Pixel Pantry is a small, solo-friendly project for creating, saving and browsing pixel art locally.

Why this project?
- Creative and visual — fun to build and use.
- Small scope — perfect for a single developer to implement and iterate.
- Practical: learn canvas/grid rendering, data URLs, binary storage, and a simple API.

Features (scaffold)
- Draw pixel art on a configurable grid.
- Pick color, draw/erase, export PNG.
- Save artworks to backend (stored as PNG files) and view gallery.
- Simple SQLite metadata storage.

Tech
- Backend: FastAPI (Python) + SQLite
- Frontend: React + TypeScript (Vite)

Run locally

Backend
1. cd backend
2. python -m venv .venv
3. source .venv/bin/activate   # Windows: .venv\Scripts\activate
4. pip install -r requirements.txt
5. uvicorn main:app --reload --port 8000

Frontend
1. cd frontend
2. npm install
3. npm run dev
4. Open the URL shown by Vite (default http://localhost:5173)

Project layout
- backend/
  - main.py
  - requirements.txt
  - art/ (created automatically; PNGs are saved here)
  - pixel.db (created automatically)
- frontend/
  - package.json, tsconfig.json, vite.config.ts
  - index.html
  - src/ (React app: editor, gallery, API client)

Next steps you can implement
- Add undo/redo and multiple layers.
- Add animation frames / export spritesheet.
- Add tags, titles and share/export features.
- Add authentication if you want multi-user.

Enjoy building — start the backend and frontend and open the editor to draw your first pixel!
