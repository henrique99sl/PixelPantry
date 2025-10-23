import React, { useEffect, useState, useCallback } from "react";
import { listArt, saveArt, deleteArt, Artwork } from "./api";

function make2DArray(w: number, h: number, fill = ""): string[][] {
  return Array.from({ length: h }, () => Array(w).fill(fill));
}

function colorToCss(c: string) {
  return c || "transparent";
}

export default function App() {
  const [width, setWidth] = useState(16);
  const [height, setHeight] = useState(16);
  const [grid, setGrid] = useState<string[][]>(() => make2DArray(16, 16));
  const [color, setColor] = useState("#ff2d55");
  const [drawMode, setDrawMode] = useState<"paint" | "erase">("paint");
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

  // Reset grid when width/height change
  useEffect(() => setGrid(make2DArray(width, height)), [width, height]);

  // Load gallery on mount
  useEffect(() => {
    loadGallery();
  }, []);

  const loadGallery = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listArt();
      // Garantir que seja sempre array
      setArtworks(Array.isArray(list) ? list : []);
    } catch (e: any) {
      console.error("Failed to load gallery:", e);
      window.alert("Failed to load gallery: " + (e.message || e));
      setArtworks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const paintAt = useCallback(
    (x: number, y: number) => {
      setGrid((prev) => {
        const next = prev.map((r) => [...r]);
        next[y][x] = drawMode === "paint" ? color : "";
        return next;
      });
    },
    [color, drawMode]
  );

  const handleMouse = useCallback(
    (e: React.MouseEvent, x: number, y: number) => {
      if (e.buttons === 1) paintAt(x, y);
    },
    [paintAt]
  );

  const exportCanvasDataUrl = useCallback(
    (scale = 16) => {
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++) {
          const c = grid[j][i];
          if (c) {
            ctx.fillStyle = c;
            ctx.fillRect(i * scale, j * scale, scale, scale);
          }
        }
      }
      return canvas.toDataURL("image/png");
    },
    [grid, width, height]
  );

  const handleSave = useCallback(async () => {
    const dataUrl = exportCanvasDataUrl(16);
    setSaving(true);
    try {
      const art = await saveArt(dataUrl, width, height);
      setArtworks((prev) => [art, ...prev]);
      window.alert("Artwork saved!");
    } catch (e: any) {
      console.error("Save failed:", e);
      window.alert("Save failed: " + (e.message || e));
    } finally {
      setSaving(false);
    }
  }, [exportCanvasDataUrl, width, height]);

  const handleClear = useCallback(() => {
    setGrid(make2DArray(width, height));
  }, [width, height]);

  const handleDownload = useCallback(() => {
    const dataUrl = exportCanvasDataUrl(16);
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `pixel-${width}x${height}.png`;
    a.click();
  }, [exportCanvasDataUrl, width, height]);

  const handleDelete = useCallback(async (id: number) => {
    if (!window.confirm("Delete this artwork?")) return;
    try {
      await deleteArt(id);
      setArtworks((prev) => prev.filter((a) => a.id !== id));
    } catch (e: any) {
      console.error("Delete failed:", e);
      window.alert("Delete failed: " + (e.message || e));
    }
  }, []);

  return (
    <div className="app-container">
      {/* === HEADER === */}
      <header className="header">
        <div className="brand">
          <div className="logo" aria-hidden>
            PP
          </div>
          <div>
            <h1>Pixel Pantry</h1>
            <p className="muted">Tiny pixel editor & gallery</p>
          </div>
        </div>

        <div className="top-actions">
          <label>
            W:
            <input
              type="number"
              value={width}
              min={4}
              max={64}
              onChange={(e) =>
                setWidth(Math.max(4, Math.min(64, Number(e.target.value))))
              }
            />
          </label>
          <label>
            H:
            <input
              type="number"
              value={height}
              min={4}
              max={64}
              onChange={(e) =>
                setHeight(Math.max(4, Math.min(64, Number(e.target.value))))
              }
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
            />
            <span>Show grid</span>
          </label>
        </div>
      </header>

      {/* === MAIN CONTENT === */}
      <main className="main">
        <section className="editor">
          <div className="toolbar">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
            <button
              onClick={() => setDrawMode("paint")}
              className={drawMode === "paint" ? "active" : ""}
            >
              Paint
            </button>
            <button
              onClick={() => setDrawMode("erase")}
              className={drawMode === "erase" ? "active" : ""}
            >
              Erase
            </button>
            <button onClick={handleClear}>Clear</button>
            <button onClick={handleDownload}>Download PNG</button>
            <button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>

          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${width}, 1fr)`,
              gap: showGrid ? "1px" : "0",
            }}
          >
            {grid.flatMap((row, y) =>
              row.map((cell, x) => (
                <div
                  key={`${x}-${y}`}
                  className="cell"
                  onMouseDown={() => paintAt(x, y)}
                  onMouseEnter={(e) => handleMouse(e, x, y)}
                  style={{ background: colorToCss(cell) }}
                />
              ))
            )}
          </div>
        </section>

        <aside className="gallery">
          <div className="gallery-header">
            <h2>Gallery</h2>
            <button onClick={loadGallery} disabled={loading}>
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          <div className="thumbs">
            {(Array.isArray(artworks) ? artworks : []).map((a) => (
              <div key={a.id} className="thumb">
                <img src={a.url} alt={`art-${a.id}`} />
                <div className="meta">
                  <small>
                    {a.width}×{a.height}
                  </small>
                  <div>
                    <button
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = a.url;
                        link.download = a.filename;
                        link.click();
                      }}
                    >
                      Download
                    </button>
                    <button onClick={() => handleDelete(a.id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
            {(!Array.isArray(artworks) || artworks.length === 0) && !loading && (
              <p>No artworks yet.</p>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
