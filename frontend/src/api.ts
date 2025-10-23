// api.ts
const BASE = "";          // mesmo host
const API_PREFIX = "/api"; // prefixo das APIs

function apiUrl(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${BASE}${API_PREFIX}${p}`.replace(/([^:]\/)\/+/g, "$1");
}

// --- Tipagem ---
export type Artwork = {
  id: number;
  filename: string;
  width: number;
  height: number;
  created_at: string;
  url: string;
};

// --- Normaliza URL para frontend ---
function normalizeArtworkUrl(a: Artwork): Artwork {
  if (!a.url) return a;
  if (/^https?:\/\//i.test(a.url)) return a;
  const normalized = `${BASE}${a.url}`.replace(/([^:]\/)\/+/g, "$1");
  return { ...a, url: normalized };
}

// --- Tratamento de respostas HTTP ---
async function handleResponse<T = any>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      (body && (body.detail || body.error || body.message)) ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }
  // sempre parse como JSON
  return res.json() as Promise<T>;
}

// --- Listar artworks ---
export async function listArt(): Promise<Artwork[]> {
  const res = await fetch(apiUrl("/art"), {
    method: "GET",
    credentials: "include",
  });
  const arr = (await handleResponse<Artwork[]>(res)) || [];
  // garantir que é array
  if (!Array.isArray(arr)) return [];
  return arr.map(normalizeArtworkUrl);
}

// --- Salvar nova artwork ---
export async function saveArt(
  dataUrl: string,
  width: number,
  height: number
): Promise<Artwork> {
  const form = new FormData();
  form.append("data_url", dataUrl);
  form.append("width", String(width));
  form.append("height", String(height));

  const res = await fetch(apiUrl("/save"), {
    method: "POST",
    body: form,
    credentials: "include",
  });
  const art = await handleResponse<Artwork>(res);
  return normalizeArtworkUrl(art);
}

// --- Deletar artwork ---
export async function deleteArt(id: number): Promise<void> {
  const res = await fetch(apiUrl(`/art/${id}`), {
    method: "DELETE",
    credentials: "include",
  });
  await handleResponse(res);
}
