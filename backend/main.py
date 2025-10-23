from fastapi import FastAPI, HTTPException, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List
import sqlite3
import datetime
import base64
from pathlib import Path
import os

# --- Diretórios consistentes ---
BASE_DIR = Path("/app/backend")
DB_FILE = BASE_DIR / "pixel.db"
ART_DIR = BASE_DIR / "art"
FRONTEND_DIR = BASE_DIR / "frontend_dist"

# Criar diretórios se não existirem
ART_DIR.mkdir(parents=True, exist_ok=True)
FRONTEND_DIR.mkdir(parents=True, exist_ok=True)

# --- Conexão SQLite ---
conn = sqlite3.connect(DB_FILE, check_same_thread=False)
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute("""
CREATE TABLE IF NOT EXISTS artworks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    created_at TEXT NOT NULL
)
""")
conn.commit()

# --- FastAPI ---
app = FastAPI(title="Pixel Pantry API")

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Pode restringir ao frontend real
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Servir assets estáticos ---
if FRONTEND_DIR.exists():
    assets_dir = FRONTEND_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

# --- Pydantic model ---
class ArtworkOut(BaseModel):
    id: int
    filename: str
    width: int
    height: int
    created_at: str
    url: str

# --- API Endpoints ---
@app.post("/api/save", response_model=ArtworkOut)
async def save_art(data_url: str = Form(...), width: int = Form(...), height: int = Form(...)):
    if not data_url.startswith("data:image/png;base64,"):
        raise HTTPException(status_code=400, detail="Only PNG data URLs supported")
    try:
        raw = base64.b64decode(data_url.split(",", 1)[1])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid data URL")

    created_at = datetime.datetime.utcnow().isoformat()
    filename = f"art_{int(datetime.datetime.utcnow().timestamp()*1000)}.png"
    filepath = ART_DIR / filename
    with open(filepath, "wb") as f:
        f.write(raw)

    cur = conn.cursor()
    cur.execute(
        "INSERT INTO artworks (filename, width, height, created_at) VALUES (?, ?, ?, ?)",
        (filename, width, height, created_at)
    )
    conn.commit()
    art_id = cur.lastrowid

    return ArtworkOut(
        id=art_id,
        filename=filename,
        width=width,
        height=height,
        created_at=created_at,
        url=f"/api/art/{art_id}"
    )

@app.get("/api/art", response_model=List[ArtworkOut])
def list_art(limit: int = 100):
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM artworks ORDER BY created_at DESC LIMIT ?", (limit,))
        rows = cur.fetchall() or []
        return [
            ArtworkOut(
                id=r["id"],
                filename=r["filename"],
                width=r["width"],
                height=r["height"],
                created_at=r["created_at"],
                url=f"/api/art/{r['id']}"
            )
            for r in rows
        ]
    except Exception as e:
        print(f"[ERROR] list_art failed: {e}")
        return []

@app.get("/api/art/{art_id}")
def get_art(art_id: int):
    cur = conn.cursor()
    cur.execute("SELECT filename FROM artworks WHERE id = ?", (art_id,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Artwork not found")

    filepath = ART_DIR / row["filename"]
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File missing")

    return FileResponse(path=str(filepath), media_type="image/png")

@app.delete("/api/art/{art_id}")
def delete_art(art_id: int):
    cur = conn.cursor()
    cur.execute("SELECT filename FROM artworks WHERE id = ?", (art_id,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Artwork not found")

    filepath = ART_DIR / row["filename"]
    if filepath.exists():
        filepath.unlink()

    cur.execute("DELETE FROM artworks WHERE id = ?", (art_id,))
    conn.commit()
    return {"deleted": True}

# --- Health check ---
@app.get("/api/health")
def health():
    return {"message": "Pixel Pantry API running"}

# --- Catch-all SPA handler ---
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # rotas API não devem cair aqui
    if full_path.startswith("api") or full_path.startswith("assets"):
        raise HTTPException(status_code=404)

    index_file = FRONTEND_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"error": "Frontend not found"}
