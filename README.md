# Pixel Pantry

Pixel Pantry is a compact, single‑developer friendly pixel‑art editor with a local gallery. It’s designed to be lightweight, educational and practical: draw pixel art in the browser, export PNGs locally, and persist artworks to a small local backend (PNG files + SQLite metadata). The project is intentionally minimal so you can iterate quickly and extend it with animation frames, layers, undo/redo, sharing, and more.

This README explains everything: goals, architecture, why each technology was chosen, how data flows through the app, how to run it locally, API documentation, configuration, troubleshooting, and an extensible roadmap.

Table of contents
- Project goals
- Technologies & rationale
- High-level architecture & data flow
- Project structure
- Quick start (development)
- Frontend details (structure, components, UX)
- Backend details (endpoints, storage)
- API reference (endpoints, payloads, examples)
- Environment & configuration
- Common commands
- Testing, linting, CI suggestions
- Deployment options
- Security & CORS considerations
- Performance & scaling notes
- Troubleshooting / debugging
- Roadmap & feature ideas
- Contributing
- License

---

Project goals
-------------
- Provide a pleasant, local pixel‑art editing experience.
- Keep the codebase small and easy to understand for one developer.
- Demonstrate practical patterns: canvas export, data URLs, file uploads, SQLite persistence, and a simple REST API.
- Make the UI polished and extensible (themes, responsive, keyboard shortcuts).

Technologies & rationale
------------------------
Frontend
- React (with TypeScript)
  - Declarative UI model and component composition make it easy to split the editor into Toolbar, EditorGrid, and Gallery components.
  - TypeScript adds safety and developer ergonomics (autocompletion, refactorability).
- Vite
  - Fast dev server and HMR. Great DX for small React apps.
- Plain CSS (with a design token section)
  - Simplicity and full control over styling; CSS variables allow a theme system (light/dark).
- Why not a UI framework?
  - For this project, custom styling gives a unique, tight UI without the weight of a design system like Material or Tailwind. You can add one later if preferred.

Backend
- FastAPI (Python)
  - Clear, typed endpoints and great developer ergonomics. Ideal for small REST APIs and easy to extend.
- Uvicorn (ASGI server)
  - High-performance server recommended for FastAPI.
- SQLite
  - Zero configuration, file-based DB perfect for local or single-user apps; easy to migrate later to a server DB.
- Pillow (PIL)
  - Included to support server-side image processing if you want thumbnails or validations later.
- Why Python/FastAPI vs Node?
  - Either is fine; FastAPI is concise for small REST endpoints and is already included in the scaffold.

Why separate frontend + backend?
- Clear separation of concerns (UI vs persistence).
- Easier to add server-side features later (thumbnails, resizing, rate limits, auth).
- Allows serving the frontend statically in production while the API runs separately or in the same host.

High-level architecture & data flow
----------------------------------
- Client (browser, React) maintains an in-memory grid state (2D array of color strings).
- When the user clicks Save:
  - Frontend renders the grid into an offscreen HTML canvas (scale multiplier to get a crisp PNG).
  - Calls canvas.toDataURL("image/png") to obtain a base64 data URL.
  - Sends that data URL to the backend as multipart/form-data with width and height.
- Backend receives the data URL:
  - Validates and decodes the base64.
  - Writes a PNG file to disk (backend/art/art_<timestamp>.png).
  - Inserts a metadata row in SQLite (id, filename, width, height, created_at).
  - Returns metadata to the frontend (including a URL to the saved asset).
- Frontend lists /art to build the gallery and consumes GET /art/{id} to display/stream PNG.

Project structure
-----------------
(Top-level summary — actual files in scaffold)
- README.md
- backend/
  - main.py           — FastAPI server and endpoints
  - requirements.txt  — Python dependencies
  - art/              — PNG files (runtime)
  - pixel.db          — SQLite DB (runtime)
- frontend/
  - index.html
  - package.json
  - tsconfig.json
  - vite.config.ts
  - src/
    - main.tsx
    - App.tsx
    - api.ts           — wrapper for API calls
    - styles.css      — design tokens and component styles
    - components/     — (optional; split components here)
    - assets/         — logos, icons, favicon

Quick start: run locally (dev)
------------------------------
You will run two processes: backend (port 8000) and frontend (Vite, port 5173).

Backend
1. Open a terminal, go to backend/:
   cd backend
2. Create virtual environment and install dependencies:
   python3 -m venv .venv
   source .venv/bin/activate   # macOS/Linux
   .\.venv\Scripts\activate    # Windows PowerShell
   pip install -r requirements.txt
3. Start the server:
   uvicorn main:app --reload --port 8000
4. You should see: Uvicorn running on http://127.0.0.1:8000

Frontend
1. Open a separate terminal, go to frontend/:
   cd frontend
2. Install dependencies:
   npm install
3. Start the dev server:
   npm run dev
4. Open the URL shown by Vite (usually http://localhost:5173)

Notes
- If running both on the same machine, the frontend expects the API at http://localhost:8000 by default. You can override with VITE_API_URL in frontend/.env.
- The first Save will create backend/art/ and a pixel.db SQLite file (if not already present).

Frontend details
----------------
Core concepts
- Grid state: 2D array of strings where each string is a CSS color (e.g., '#ff2d55') or empty string for transparent.
- Painting: click or click+drag on cells updates the grid state. The grid is rendered as a CSS grid of div cells (or you can implement canvas rendering for performance).
- Export: render grid to HTML canvas with a scale multiplier (e.g., scale 16) and call toDataURL.
- Gallery: fetch list of artworks from the backend and show thumbnails; clicking Download calls the backend /art/{id} endpoint.

Suggested component breakdown (if you refactor)
- Header.tsx: logo, quick controls (W/H, show grid), Save/Download/Refresh.
- Toolbar.tsx: color picker, tool toggles (paint/erase), clear.
- EditorGrid.tsx: actual grid rendering and pointer handlers.
- Gallery.tsx + Thumb.tsx: gallery list and individual thumbnail actions.

Accessibility & keyboard UX
- Shortcuts implemented in scaffold suggestions:
  - B = paint tool
  - E = erase tool
  - S = Save
  - D = Download PNG
  - R = Refresh gallery
  - C = Clear canvas (prompts for confirmation)
- Use roles and aria-labels for grid and controls to improve screen reader support.

Backend details
---------------
FastAPI server main responsibilities:
- Validate data URL and accept only PNG data URLs by default.
- Save decoded bytes as a .png file in backend/art/.
- Insert metadata into SQLite (id, filename, width, height, created_at).
- Provide endpoints:
  - POST /save — save an artwork
  - GET /art — list artworks
  - GET /art/{id} — serve raw PNG
  - DELETE /art/{id} — delete an artwork
  - GET / — health / basic message

Why SQLite + filesystem?
- Simplicity: no external services or credentials. Suitable for single‑user local apps.
- Filesystem is the natural place for PNG blobs; SQLite stores structured metadata.
- If you later deploy remotely, migrating to cloud storage + managed DB is straightforward.

API reference
-------------
Base URL: http://localhost:8000 (default)

1) POST /save
- Description: Save a PNG image (data URL) and its metadata.
- Request: multipart/form-data
  - data_url: string (the full data URL "data:image/png;base64,...")
  - width: int
  - height: int
- Response (200):
  ```json
  {
    "id": 12,
    "filename": "art_1699999999999.png",
    "width": 16,
    "height": 16,
    "created_at": "2025-10-23T15:00:00.000000",
    "url": "/art/12"
  }
  ```
- Errors:
  - 400 if data_url not supported or invalid.

2) GET /art
- Description: Return a JSON list of saved artwork metadata (ordered by created_at desc).
- Optional query param: limit (default 100).
- Response: JSON array of objects like the save response.

3) GET /art/{id}
- Description: Serve PNG file for artwork id.
- Response: image/png content or 404.

4) DELETE /art/{id}
- Description: Delete artwork (file + DB row). Returns { "deleted": true }.

Examples (curl)
- Save (1x1 PNG sample):
  curl -X POST http://localhost:8000/save -F "data_url=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=" -F "width=1" -F "height=1"
- List:
  curl http://localhost:8000/art
- Download:
  curl -o art.png http://localhost:8000/art/1
- Delete:
  curl -X DELETE http://localhost:8000/art/1

Environment & configuration
---------------------------
- Frontend
  - VITE_API_URL (optional): override default API URL (http://localhost:8000)
  - Create `.env` or `.env.local` in frontend/ with:
    VITE_API_URL=http://localhost:8000

- Backend
  - By default main.py uses relative paths "pixel.db" and "art/".
  - In production you might expose ART_DIR and DB_FILE via environment variables (update main.py accordingly).
  - CORS: the scaffold permits all origins for developer convenience. Restrict in production.

Common commands
---------------
Frontend
- npm install
- npm run dev
- npm run build
- npm run preview

Backend
- python3 -m venv .venv
- source .venv/bin/activate
- pip install -r requirements.txt
- uvicorn main:app --reload --port 8000

Testing & linting (suggestions)
-------------------------------
- Add unit tests for frontend components (Vitest + React Testing Library).
- Add ESLint + Prettier for consistent code style.
- Add backend tests with pytest for endpoint behavior and DB assertions.
- Example quick setup:
  - Frontend: vitest + @testing-library/react
  - Backend: pytest + httpx + starlette.testclient

Deployment options
------------------
Single-machine / local
- Serve the backend with Uvicorn / Gunicorn and serve frontend static build from a small static server or from the same backend with a static files route.

Docker (recommended for reproducible deploy)
- Provide a Dockerfile for backend and a Dockerfile for frontend (or build once and copy static files into a simple Nginx image).
- Example high-level flow:
  - Build frontend: npm run build → dist/
  - Copy frontend/dist into backend static serve directory (or host in Nginx)
  - Run backend with gunicorn/uvicorn in container and mount a persistent volume for backend/art and pixel.db.

Cloud hosts
- Backend: DigitalOcean App Platform, Railway, Render, Heroku (container), or an EC2 droplet.
- Frontend: Vercel, Netlify (static), or serve via the backend host.
- If you deploy frontend separately, set VITE_API_URL accordingly.

Security & CORS
--------------
- Development scaffold sets CORS to allow all origins. Do not do this in production — restrict allowed origins to your frontend domain(s).
- Validate payloads:
  - The backend currently accepts only PNG data URLs. If you accept other formats, add validation.
  - Limit file size & rate-limit uploads to prevent abuse.
- If you add authentication:
  - Use JWT or session cookies depending on client needs.
  - Protect delete and save endpoints behind authentication.
- If you serve on the public internet:
  - HTTPS is required; use Let’s Encrypt or managed TLS in your hosting provider.

Performance & scaling notes
---------------------------
- For a single-user local app, the filesystem + SQLite approach is fast and simple.
- If usage increases:
  - Move PNG storage to object storage (S3) and store object keys in DB.
  - Move metadata to a managed DB (Postgres) and add indexes for queries.
  - Generate thumbnails on save to serve faster small images (Pillow on save or on a worker queue).
  - Use pagination for GET /art and lazy-load thumbnails in the frontend.
- Frontend optimizations:
  - Render grid using a single canvas rather than DOM cells for very large grids; for small grids (<=64x64) DOM is fine and simpler.
  - Memoize cells or use virtualization if rendering many UI elements.

Troubleshooting
---------------
- Uvicorn import error "Could not import module main"
  - Ensure you run uvicorn from backend/ directory or specify the module: `uvicorn backend.main:app --reload`
- Save fails with CORS errors
  - Ensure backend has CORS middleware and that the origin is allowed. For dev the scaffold allows all origins.
- Gallery empty even after Save
  - Check backend logs for POST /save errors. Confirm files present under backend/art/. Inspect pixel.db with sqlite3 CLI.
- Grid lines not visible when toggling show grid
  - Ensure CSS variables `--cell-gap` and `--cell-border` are present and that the `.grid` background switches to `var(--cell-border)` when showGrid=true (the scaffold has an inline style or toggles a `.with-grid` class).

Design decisions & notes (why things are implemented this way)
---------------------------------------------------------------
- Data URL POST: Exporting from the browser to a PNG data URL is straightforward and avoids file handling complexities in the frontend. The backend decodes and writes bytes.
- PNG on disk + SQLite metadata: simple, portable, and easy to inspect. This approach keeps the DB small and avoids storing large blobs inside SQLite.
- No auth by default: keeps the scaffold local and low friction. Add auth if you intend to share or multi-user.
- CSS-first approach: using CSS variables that form a small design system keeps the UI cohesive and easy to tweak.

Roadmap & feature ideas
-----------------------
Short-term (easy wins)
- Undo/redo stack for grid editing.
- Eyedropper tool.
- Bucket fill (flood fill).
- Save titles/tags for artworks, and show them in gallery.
- LocalStorage fallback — allow saving drafts offline and sync to backend later.

Medium-term
- Frames & animation export (GIF / spritesheet).
- Thumbnail generation on backend.
- Image metadata editor (rename, tags, description).
- User accounts & sharing (OAuth, JWT).
- Unit tests and CI pipeline.

Long-term / advanced
- Real-time multiplayer editing (operational transforms or CRDTs).
- Export to sprite sheets and more structured game assets.
- Collaborator/user galleries with permissions.

Contributing
------------
- Keep changes small and focused, open issues for bugs or feature requests.
- Suggested workflow:
  - Fork → branch → PR → review.
- Add tests for new functionality and keep code style consistent (use ESLint + Prettier in frontend; black/isort/ruff or similar in Python).

License
-------
Pick a license for your project. Example: MIT License — permissive and popular for small projects.

---

Acknowledgements & credits
--------------------------
- This scaffold was designed to be a small, practical playground for pixel art and simple client-server interactions. The stack (React + FastAPI + SQLite) is tuned for quick iteration.

---

Appendix: Useful commands cheat-sheet
------------------------------------
# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev

# Test API
curl http://localhost:8000/art

# Example save test
curl -X POST http://localhost:8000/save \
  -F "data_url=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=" \
  -F "width=1" -F "height=1"

---

Thanks — this README is intentionally detailed so you (and any contributor) can understand the design, run and extend Pixel Pantry. If you want, I can:
- add a ready-to-use Dockerfile and docker-compose for local dev,
- add ESLint + Prettier configs and example tests,
- or generate a step-by-step tutorial to add undo/redo or frames.


## Project Structure

```
.
├── backend
│   ├── __pycache__
│   ├── art              # Folder to store uploaded artwork
│   ├── frontend_dist     # Built frontend files
│   ├── main.py           # FastAPI app
│   ├── pixel.db          # SQLite database
│   └── requirements.txt  # Python dependencies
├── Dockerfile
├── frontend
│   ├── dist              # Local frontend build
│   ├── index.html        # Vite entry HTML
│   ├── node_modules
│   ├── package.json
│   ├── package-lock.json
│   ├── src
│   │   ├── api.ts        # API client
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── styles.css
│   ├── tsconfig.json
│   └── vite.config.ts
├── README.md
└── select
```

## Running Locally with Docker

```bash
docker build -t pixelpantry:latest .
docker run -d -p 8000:8000 --name pixelpantry pixelpantry:latest
```

Access the app at: `http://localhost:8000`

## Running Frontend / Backend Locally (Dev Mode)

### Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (Vite + React)

```bash
cd frontend
npm install
npm run dev
```

Access the frontend dev server at: `http://localhost:5173`

## API Endpoints

| Method | Endpoint      | Description                                           |
| ------ | ------------- | ----------------------------------------------------- |
| GET    | /api/health   | Check if API is running                               |
| GET    | /api/art      | List all artworks                                     |
| GET    | /api/art/{id} | Get artwork by ID                                     |
| POST   | /api/save     | Save new artwork (form data: data_url, width, height) |
| DELETE | /api/art/{id} | Delete artwork by ID                                  |

## Notes

* The frontend is served from `backend/frontend_dist` in production.
* Uploaded artworks are stored in `backend/art`.
* The database file is `backend/pixel.db`.
* `.dockerignore` and `.gitignore` should exclude `node_modules` and build artifacts.


