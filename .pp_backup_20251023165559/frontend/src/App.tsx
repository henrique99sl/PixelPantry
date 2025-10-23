import React, { useEffect, useRef, useState } from "react";
import { listArt, saveArt, deleteArt, Artwork } from "./api";

function make2DArray(w: number, h: number, fill = ""): string[][] {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => fill));
}

function colorToCss(c: string) {
  return c || "transparent";
}

export default function App() {
  const [width, setWidth] = useState<number>(16);
  const [height, setHeight] = useState<number>(16);
  const [grid, setGrid] = useState<string[][]>(() => make2DArray(16, 16, ""));
  const [color, setColor] = useState<string>("#ff2d55");
  const [drawMode, setDrawMode] = useState<"paint" | "erase">("paint");
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setGrid(make2DArray(width, height, ""));
  }, [width, height]);

  useEffect(() => {
    loadGallery();
  }, []);

  async function loadGallery() {
    setLoading(true);
    try {
      const list = await listArt();
      setArtworks(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function paintAt(x: number, y: number) {
    setGrid(prev => {
      const next = prev.map(row => row.slice());
      next[y][x] = drawMode === "paint" ? color : "";
      return next;
    });
  }

  function handleMouse(e: React.MouseEvent, x: number, y: number) {
    if (e.buttons === 1) paintAt(x, y);
  }

  function exportCanvasDataUrl(scale = 16) {
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d")!;
    // background transparent
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
  }

  async function handleSave() {
    const dataUrl = exportCanvasDataUrl(16);
    setLoading(true);
    try {
      const art = await saveArt(dataUrl, width, height);
      setArtworks(prev => [art, ...prev]);
      alert("Saved!");
    } catch (e: any) {
      alert(e.message || "Save failed");
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setGrid(make2DArray(width, height, ""));
  }

  function downloadPNG() {
    const dataUrl = exportCanvasDataUrl(16);
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `pixel-${width}x${height}.png`;
    a.click();
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this artwork?")) return;
    try {
      await deleteArt(id);
      setArtworks(prev => prev.filter(a => a.id !== id));
    } catch {
      alert("Delete failed");
    }
  }

  return (
    <div className="container">
      <header>
        <h1>Pixel Pantry</h1>
        <div className="controls">
          <label>W:
            <input type="number" value={width} min={4} max={64} onChange={e => setWidth(Math.max(4, Math.min(64, Number(e.target.value))))} />
          </label>
          <label>H:
            <input type="number" value={height} min={4} max={64} onChange={e => setHeight(Math.max(4, Math.min(64, Number(e.target.value))))} />
          </label>
          <label>Show grid:
            <input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} />
          </label>
        </div>
      </header>

      <main>
        <section className="editor">
          <div className="toolbar">
            <input type="color" value={color} onChange={e => setColor(e.target.value)} />
            <button onClick={() => setDrawMode("paint")} className={drawMode === "paint" ? "active" : ""}>Paint</button>
            <button onClick={() => setDrawMode("erase")} className={drawMode === "erase" ? "active" : ""}>Erase</button>
            <button onClick={handleClear}>Clear</button>
            <button onClick={downloadPNG}>Download PNG</button>
            <button onClick={handleSave} disabled={loading}>Save</button>
          </div>

          <div className="grid" style={{ gridTemplateColumns: `repeat(${width}, 1fr)` }}>
            {grid.map((row, y) =>
              row.map((cell, x) => (
                <div
                  key={`${x}-${y}`}
                  className={`cell ${showGrid ? "with-grid" : ""}`}
                  onMouseDown={() => paintAt(x, y)}
                  onMouseEnter={(e) => handleMouse(e as any, x, y)}
                  style={{ background: colorToCss(cell) }}
                />
              ))
            )}
          </div>

        </section>

        <aside className="gallery">
          <h2>Gallery</h2>
          <div>
            <button onClick={loadGallery} disabled={loading}>Refresh</button>
          </div>
          <div className="thumbs">
            {artworks.map(a => (
              <div key={a.id} className="thumb">
                <img src={a.url} alt={`art-${a.id}`} />
                <div className="meta">
                  <small>{a.width}×{a.height}</small>
                  <div>
                    <button onClick={() => { const link = document.createElement("a"); link.href = a.url; link.download = a.filename; link.click(); }}>Download</button>
                    <button onClick={() => handleDelete(a.id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </main>

      <footer>
        <small>Local & simple — backend stores images in backend/art/</small>
      </footer>
    </div>
  );
}
