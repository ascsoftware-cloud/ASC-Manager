import { useEffect, useMemo, useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export function ClientJump({
  items,
}: {
  items: { to: string; label: string; hash?: string }[];
}) {
  const navigate = useNavigate();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => item.label.toLowerCase().includes(needle));
  }, [items, q]);

  useEffect(() => {
    setActive(0);
  }, [q, open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(item: { to: string; hash?: string }) {
    setOpen(false);
    setQ("");
    void navigate({ to: item.to, hash: item.hash });
  }

  const mod = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform) ? "⌘" : "Ctrl";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search pages"
        className="flex h-10 min-w-0 max-w-xl flex-1 items-center gap-2 rounded-lg border border-input bg-card px-3 text-left text-muted-foreground hover:bg-accent max-sm:h-11"
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="type-body truncate">Search pages</span>
        <span className="ml-auto hidden items-center gap-1 sm:flex" aria-hidden="true">
          <Kbd>{mod}</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setQ("");
        }}
      >
        <DialogContent className="top-[18%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="sr-only">
            <DialogTitle>Search pages</DialogTitle>
            <DialogDescription>Type to find a page, then press Enter.</DialogDescription>
          </DialogHeader>
          <div className="border-b border-border p-2">
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search pages"
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((i) => Math.min(i + 1, Math.max(matches.length - 1, 0)));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((i) => Math.max(i - 1, 0));
                } else if (e.key === "Enter" && matches[active]) {
                  e.preventDefault();
                  go(matches[active]);
                }
              }}
            />
          </div>
          <ul className="max-h-72 overflow-y-auto p-2">
            {matches.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">No match.</li>
            ) : (
              matches.map((item, i) => (
                <li key={`${item.to}#${item.hash ?? ""}`}>
                  <button
                    type="button"
                    onMouseEnter={() => {
                      setActive(i);
                      void router.preloadRoute({ to: item.to, hash: item.hash });
                    }}
                    onClick={() => go(item)}
                    className={cn(
                      "flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm",
                      i === active ? "bg-accent text-foreground" : "text-foreground hover:bg-accent/70",
                    )}
                  >
                    {item.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
