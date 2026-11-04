import { useState, type FormEvent } from "react";
import { KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { ConfirmDangerDialog } from "@/components/confirm-danger";
import { EmptyState, Field, Surface, SurfaceHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { initials } from "@/lib/format";
import { saveAction } from "@/lib/mutate";
import { describeAccess, PERMISSIONS, type Access } from "@/lib/permissions";
import { useAscStore, useCurrentUser } from "@/lib/store";
import { ownSwitchableSites } from "@/lib/tenant-scope";
import type { Client, Site, User } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The people on one client account: add, edit, remove, and send a password
 * reset. Client admins see their own account; ASC staff open it from Clients.
 */
export function TeamManager({ clientId }: { clientId: string }) {
  const me = useCurrentUser();
  const users = useAscStore((s) => s.users);
  const client = useAscStore((s) => s.clients.find((c) => c.id === clientId));
  const allSites = useAscStore((s) => s.sites);
  const addTeamMember = useAscStore((s) => s.addTeamMember);
  const updateTeamMember = useAscStore((s) => s.updateTeamMember);
  const removeTeamMember = useAscStore((s) => s.removeTeamMember);
  const resetTeamPassword = useAscStore((s) => s.resetTeamPassword);

  const [editing, setEditing] = useState<{ member: User | null } | null>(null);
  const [resetFor, setResetFor] = useState<User | null>(null);
  const [removeFor, setRemoveFor] = useState<User | null>(null);

  // ASC staff name the account; a client admin's server call uses their own.
  const tenantArg = me?.role === "operator" ? clientId : undefined;
  const sites = ownSwitchableSites(allSites, clientId);
  const members = users
    .filter((u) => u.role === "client" && u.clientId === clientId)
    .sort(
      (a, b) =>
        Number(b.access === "admin") - Number(a.access === "admin") ||
        a.name.localeCompare(b.name),
    );

  return (
    <Surface>
      <SurfaceHeader
        title={`People on ${client?.name ?? "this account"}`}
        detail="Admins manage the team. Staff only see what you tick for them."
        action={
          <Button className="rounded-full" onClick={() => setEditing({ member: null })}>
            <Plus className="size-4" />
            Add a person
          </Button>
        }
      />
      {members.length === 0 ? (
        <EmptyState
          title="No logins yet"
          detail="Add the first person. They get an email to set their own password."
        />
      ) : (
        <ul className="divide-y divide-border">
          {members.map((m) => {
            const isMe = m.id === me?.id;
            return (
              <li
                key={m.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-champagne">
                    {initials(m.name) || "•"}
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-champagne">
                      {m.name}
                      {isMe ? (
                        <span className="text-sm font-normal text-muted-foreground">(you)</span>
                      ) : null}
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          m.access === "admin"
                            ? "bg-emerald/15 text-emerald"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {m.access === "admin" ? "Admin" : "Staff"}
                      </span>
                    </p>
                    <p className="truncate text-sm text-muted-foreground">{m.email}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {describeAccess(m, sites.length)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 sm:justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setEditing({ member: m })}>
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setResetFor(m)}>
                    <KeyRound className="size-3.5" />
                    Reset password
                  </Button>
                  {isMe ? null : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setRemoveFor(m)}
                    >
                      <Trash2 className="size-3.5" />
                      Remove
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <MemberDialog
        key={editing?.member?.id ?? (editing ? "new" : "closed")}
        open={Boolean(editing)}
        member={editing?.member ?? null}
        isMe={editing?.member?.id === me?.id}
        client={client}
        sites={sites}
        onOpenChange={(v) => {
          if (!v) setEditing(null);
        }}
        onSubmit={async (input) => {
          const member = editing?.member;
          const ok = member
            ? await saveAction(`${input.name} saved`, () =>
                updateTeamMember(member.id, input, tenantArg),
              )
            : await saveAction(
                `Invite sent to ${input.email}. They set their own password.`,
                () => addTeamMember(input, tenantArg),
              );
          if (ok) setEditing(null);
        }}
      />

      <ConfirmDangerDialog
        open={Boolean(resetFor)}
        tone="neutral"
        title={`Reset password for ${resetFor?.name ?? "this person"}?`}
        description={`We email ${resetFor?.email ?? "them"} a link to choose a new password. Their current password keeps working until they use it.`}
        confirmLabel="Send reset email"
        onOpenChange={(v) => {
          if (!v) setResetFor(null);
        }}
        onConfirm={async () => {
          if (!resetFor) return;
          const ok = await saveAction(`Reset email sent to ${resetFor.email}`, () =>
            resetTeamPassword(resetFor.id, tenantArg),
          );
          if (ok) setResetFor(null);
        }}
      />

      <ConfirmDangerDialog
        open={Boolean(removeFor)}
        title={`Remove ${removeFor?.name ?? "this person"}?`}
        description={`${removeFor?.email ?? "They"} will no longer be able to sign in. This cannot be undone, but you can invite them again later.`}
        confirmLabel="Remove person"
        onOpenChange={(v) => {
          if (!v) setRemoveFor(null);
        }}
        onConfirm={async () => {
          if (!removeFor) return;
          const ok = await saveAction(`${removeFor.name} removed`, () =>
            removeTeamMember(removeFor.id, tenantArg),
          );
          if (ok) setRemoveFor(null);
        }}
      />
    </Surface>
  );
}

type MemberInput = {
  name: string;
  email: string;
  access: Access;
  permissions: string[];
  siteIds: string[];
};

function MemberDialog({
  open,
  member,
  isMe,
  client,
  sites,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  member: User | null;
  isMe: boolean;
  client: Client | undefined;
  sites: Site[];
  onOpenChange: (v: boolean) => void;
  onSubmit: (input: MemberInput) => Promise<void>;
}) {
  const [name, setName] = useState(member?.name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [access, setAccess] = useState<Access>(member?.access ?? "staff");
  const [permissions, setPermissions] = useState<string[]>(member?.permissions ?? []);
  const [onlySome, setOnlySome] = useState((member?.siteIds.length ?? 0) > 0);
  const [siteIds, setSiteIds] = useState<string[]>(member?.siteIds ?? []);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Only offer pages whose module ASC switched on for this account.
  const pages = PERMISSIONS.filter((p) => !p.module || client?.modules[p.module]);

  function toggle(list: string[], value: string, on: boolean): string[] {
    return on ? [...list.filter((x) => x !== value), value] : list.filter((x) => x !== value);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (access === "staff" && permissions.length === 0) {
      setError("Tick at least one page, or make them an admin.");
      return;
    }
    if (access === "staff" && onlySome && siteIds.length === 0) {
      setError("Pick at least one site, or choose all sites.");
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        name: name.trim(),
        email: email.trim(),
        access,
        permissions: access === "staff" ? permissions : [],
        siteIds: access === "staff" && onlySome ? siteIds : [],
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={(e) => void submit(e)} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{member ? `Edit ${member.name}` : "Add a person"}</DialogTitle>
            <DialogDescription>
              {member
                ? "Change what they can see. It applies the next time they open the page."
                : "They get an email to set their own password. You never see it."}
            </DialogDescription>
          </DialogHeader>

          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Email" hint={member ? "To change the email, remove them and invite again." : undefined}>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={Boolean(member)}
            />
          </Field>

          <fieldset className="grid gap-2">
            <legend className="mb-1 text-[13px] font-medium text-muted-foreground">Role</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["staff", "Staff", "Sees only the pages and sites you choose."],
                  ["admin", "Admin", "Sees everything and manages the team."],
                ] as const
              ).map(([value, label, detail]) => (
                <button
                  key={value}
                  type="button"
                  disabled={isMe}
                  aria-pressed={access === value}
                  onClick={() => setAccess(value)}
                  className={cn(
                    "rounded-lg px-4 py-3 text-left shadow-[var(--shadow-border)] transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                    access === value
                      ? "bg-accent shadow-[0_0_0_2px_var(--color-emerald)]"
                      : "hover:bg-accent/60",
                  )}
                >
                  <span className="block font-medium text-champagne">{label}</span>
                  <span className="block text-sm text-muted-foreground">{detail}</span>
                </button>
              ))}
            </div>
            {isMe ? (
              <p className="text-sm text-muted-foreground">
                You cannot change your own role. Ask another admin.
              </p>
            ) : null}
          </fieldset>

          {access === "staff" ? (
            <>
              <fieldset className="grid gap-2">
                <legend className="mb-1 text-[13px] font-medium text-muted-foreground">
                  Pages they can open
                </legend>
                <div className="grid gap-1 sm:grid-cols-2">
                  {pages.map((p) => (
                    <label
                      key={p.key}
                      className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2 hover:bg-accent/60"
                    >
                      <input
                        type="checkbox"
                        className="mt-1 size-4 shrink-0 accent-emerald"
                        checked={permissions.includes(p.key)}
                        onChange={(e) =>
                          setPermissions((list) => toggle(list, p.key, e.target.checked))
                        }
                      />
                      <span>
                        <span className="block text-[15px] font-medium text-champagne">
                          {p.label}
                        </span>
                        <span className="block text-sm text-muted-foreground">{p.detail}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {sites.length > 1 ? (
                <fieldset className="grid gap-2">
                  <legend className="mb-1 text-[13px] font-medium text-muted-foreground">
                    Sites they can work on
                  </legend>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent/60">
                    <input
                      type="radio"
                      name="site-scope"
                      className="size-4 accent-emerald"
                      checked={!onlySome}
                      onChange={() => setOnlySome(false)}
                    />
                    <span className="text-[15px] text-champagne">All sites on this account</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent/60">
                    <input
                      type="radio"
                      name="site-scope"
                      className="size-4 accent-emerald"
                      checked={onlySome}
                      onChange={() => setOnlySome(true)}
                    />
                    <span className="text-[15px] text-champagne">Only some sites</span>
                  </label>
                  {onlySome ? (
                    <div className="ml-7 grid gap-1">
                      {sites.map((site) => (
                        <label
                          key={site.id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent/60"
                        >
                          <input
                            type="checkbox"
                            className="size-4 accent-emerald"
                            checked={siteIds.includes(site.id)}
                            onChange={(e) =>
                              setSiteIds((list) => toggle(list, site.id, e.target.checked))
                            }
                          />
                          <span className="text-[15px] text-champagne">{site.name}</span>
                        </label>
                      ))}
                    </div>
                  ) : null}
                </fieldset>
              ) : null}
            </>
          ) : null}

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {member ? "Save changes" : "Send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
