import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/version")({
  server: {
    handlers: {
      GET: () =>
        Response.json({ id: __BUILD_ID__ }, { headers: { "cache-control": "no-store" } }),
    },
  },
});
