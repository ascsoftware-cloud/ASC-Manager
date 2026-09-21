import { useEffect } from "react";
import { authEmailCallbackTarget } from "@/lib/auth/email-callback";

/** Recovery/invite mail often lands on Site URL (`/?code=`). Move it to the callback. */
export function AuthCodeRedirect() {
  useEffect(() => {
    const target = authEmailCallbackTarget(window.location.href);
    if (target) window.location.replace(target);
  }, []);
  return null;
}
