import { useState } from "react";
import { useActiveSite, useAscStore, useCurrentUser, useOwnSites } from "@/lib/store";
import type { Site } from "@/lib/types";

export function useDeskSite(clientId: string | null | undefined): {
  clientSites: Site[];
  siteId: string;
  site: Site | undefined;
  setSite: (id: string) => void;
} {
  const user = useCurrentUser();
  const allSites = useAscStore((s) => s.sites);
  const ownSites = useOwnSites();
  const activeSite = useActiveSite();
  const setActiveSite = useAscStore((s) => s.setActiveSite);
  const [pickedSite, setPickedSite] = useState("");
  const clientSites =
    user?.role === "client"
      ? ownSites
      : allSites.filter((row) => row.clientId === clientId && row.kind === "public");
  const stored = user?.role === "client" ? (activeSite?.id ?? "") : pickedSite;
  const siteId = clientSites.some((row) => row.id === stored)
    ? stored
    : (clientSites[0]?.id ?? "");
  const site = clientSites.find((row) => row.id === siteId);

  function setSite(id: string) {
    if (user?.role === "client") setActiveSite(id);
    else setPickedSite(id);
  }

  return { clientSites, siteId, site, setSite };
}
