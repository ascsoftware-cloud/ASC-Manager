import { toast } from "sonner";

const FALLBACK = "That did not save. Please try again.";

/** Technical text never reaches a person: only our own plain sentences do. */
export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message.trim() : "";
  const technical =
    !msg ||
    msg.length > 140 ||
    /fetch|network|jwt|pgrst|violates|constraint|typeerror|undefined|null|\{|\}|\bSQL\b|\b[45]\d\d\b|stack|supabase|postgres/i.test(
      msg,
    );
  return technical ? FALLBACK : msg;
}

export async function saveAction(ok: string, fn: () => Promise<unknown>): Promise<boolean> {
  let toastId: string | number | undefined;
  const timer = setTimeout(() => {
    toastId = toast.loading("Saving…");
  }, 280);
  try {
    await fn();
    clearTimeout(timer);
    if (toastId !== undefined) toast.success(ok, { id: toastId });
    else toast.success(ok);
    return true;
  } catch (e) {
    clearTimeout(timer);
    if (typeof console !== "undefined") console.error(e);
    const msg = friendlyError(e);
    if (toastId !== undefined) toast.error(msg, { id: toastId });
    else toast.error(msg);
    return false;
  }
}
