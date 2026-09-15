function read(key: string): string {
  const vite = import.meta.env[key as keyof ImportMetaEnv];
  if (typeof vite === "string" && vite.trim()) return vite.trim();
  if (typeof process !== "undefined") {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return "";
}

export function supabaseUrl(): string {
  return read("VITE_SUPABASE_URL") || read("SUPABASE_URL");
}

export function supabaseAnonKey(): string {
  return read("VITE_SUPABASE_ANON_KEY");
}

export function appUrl(): string {
  const fromEnv = read("VITE_APP_URL");
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:8080";
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseAnonKey());
}
