import { toast } from "sonner";

export async function saveAction(ok: string, fn: () => Promise<void>): Promise<boolean> {
  try {
    await fn();
    toast.success(ok);
    return true;
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Could not save");
    return false;
  }
}
