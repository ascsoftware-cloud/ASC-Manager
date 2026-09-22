import { toast } from "sonner";

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
    const msg = e instanceof Error ? e.message : "Could not save";
    if (toastId !== undefined) toast.error(msg, { id: toastId });
    else toast.error(msg);
    return false;
  }
}
