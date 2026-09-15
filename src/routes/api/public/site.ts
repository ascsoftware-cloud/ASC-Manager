import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/public/site")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const host = new URL(request.url).searchParams.get("host")?.trim() ?? "";
        if (!host) {
          return Response.json({ error: "host is required" }, { status: 400 });
        }
        const url =
          process.env.VITE_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
        const anon = process.env.VITE_SUPABASE_ANON_KEY?.trim();
        if (!url || !anon) {
          return Response.json({ error: "not configured" }, { status: 503 });
        }
        const sb = createClient(url, anon, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data, error } = await sb.rpc("get_public_site", { p_host: host });
        if (error) {
          return Response.json({ error: "lookup failed" }, { status: 500 });
        }
        if (!data) {
          return Response.json({ error: "unknown host" }, { status: 404 });
        }
        return Response.json(data);
      },
    },
  },
});
