import { createFileRoute } from "@tanstack/react-router";

/**
 * PayFast tells us about every monthly payment here. It is public on purpose:
 * PayFast is not a signed-in user. Nothing is believed until the signature,
 * source, amount and PayFast's own confirmation all check out.
 */
export const Route = createFileRoute("/api/payfast/itn")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleItn } = await import("@/lib/billing.server");
        const result = await handleItn(request);
        return new Response(result.message, { status: result.status });
      },
    },
  },
});
