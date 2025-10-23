from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List
import sqlite3
import datetime
import os
import base64
from pathlib import Path

# Config
DB_FILE = "pixel.db"
ART_DIR = Path("art")
ART_DIR.mkdir(exist_ok=True)

# Ensure DB
conn = sqlite3.connect(DB_FILE, check_same_thread=False)
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute(
    """
    CREATE TABLE IF NOT EXISTS artworks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        created_at TEXT NOT NULL
    )
    """
)
conn.commit()

app = FastAPI(title="Pixel Pantry API")

class ArtworkOut(BaseModel):
    id: int
    filename: str
    width: int
    height: int
    created_at: str
    url: str

@app.post("/save", response_model=ArtworkOut)
async def save_art(data_url: str = Form(...), width: int = Form(...), height: int = Form(...)):
    """
    Accepts a data URL (PNG) and stores it on disk, then inserts a DB record.
    Request form fields:
    - data_url: "data:image/png;base64,...."
    - width, height: integers
    """
    if not data_url.startswith("data:image/png;base64,"):
        raise HTTPException(status_code=400, detail="Only PNG data URLs supported")
    try:
        b64 = data_url.split(",", 1)[1]
        raw = base64.b64decode(b64)
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
        url=f"/art/{art_id}"
    )

@app.get("/art", response_model=List[ArtworkOut])
def list_art(limit: int = 100):
    cur = conn.cursor()
    cur.execute("SELECT * FROM artworks ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = cur.fetchall()
    result = []
    for r in rows:
        result.append(ArtworkOut(
            id=r["id"],
            filename=r["filename"],
            width=r["width"],
            height=r["height"],
            created_at=r["created_at"],
            url=f"/art/{r['id']}"
        ))
    return result

@app.get("/art/{art_id}")
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

@app.delete("/art/{art_id}")
def delete_art(art_id: int):
    cur = conn.cursor()
    cur.execute("SELECT filename FROM artworks WHERE id = ?", (art_id,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Artwork not found")
    filepath = ART_DIR / row["filename"]
    try:
        if filepath.exists():
            filepath.unlink()
    except Exception:
        pass
    cur.execute("DELETE FROM artworks WHERE id = ?", (art_id,))
    conn.commit()
    return {"deleted": True}

@app.get("/")
def root():
    return {"message": "Pixel Pantry API running"}
