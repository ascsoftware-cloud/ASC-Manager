import { supabaseUrl } from "./env";
import { requireSupabase } from "./client";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 4 * 1024 * 1024;

function extFor(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "jpg";
}

export function publicMediaUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = supabaseUrl();
  if (!base) return "";
  return `${base}/storage/v1/object/public/media/${path.replace(/^\/+/, "")}`;
}

export async function uploadTenantImage(tenantId: string, file: File): Promise<{
  path: string;
  url: string;
}> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Use JPG, PNG, WEBP or GIF.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Max 4 MB.");
  }
  const path = `${tenantId}/${crypto.randomUUID()}.${extFor(file.type)}`;
  const sb = requireSupabase();
  const { error } = await sb.storage.from("media").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error("Could not upload that file.");
  return { path, url: publicMediaUrl(path) };
}

export async function removeStoragePath(path: string): Promise<void> {
  if (!path || path.startsWith("http://") || path.startsWith("https://")) return;
  const sb = requireSupabase();
  await sb.storage.from("media").remove([path]);
}
