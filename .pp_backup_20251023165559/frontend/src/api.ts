const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type Artwork = {
  id: number;
  filename: string;
  width: number;
  height: number;
  created_at: string;
  url: string;
};

export async function listArt(): Promise<Artwork[]> {
  const res = await fetch(`${BASE}/art`);
  if (!res.ok) throw new Error("Failed to list art");
  return res.json();
}

export async function saveArt(dataUrl: string, width: number, height: number): Promise<Artwork> {
  const form = new FormData();
  form.append("data_url", dataUrl);
  form.append("width", String(width));
  form.append("height", String(height));
  const res = await fetch(`${BASE}/save`, {
    method: "POST",
    body: form
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Save failed");
  }
  return res.json();
}

export async function deleteArt(id: number): Promise<void> {
  const res = await fetch(`${BASE}/art/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Delete failed");
}
