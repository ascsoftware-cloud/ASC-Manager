import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MailPlus, UserPlus, UsersRound } from "lucide-react";
import { ConfirmDangerDialog } from "@/components/confirm-danger";
import { DataTable } from "@/components/data-table";
import { ErrorPanel } from "@/components/error-panel";
import { Field, PageHeader } from "@/components/page-header";
import { SectionHeader } from "@/components/section-header";
import { StaffGate } from "@/components/staff-gate";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/ui/surface";
import { formatRelative } from "@/lib/format";
import { saveAction } from "@/lib/mutate";
import {
  listStaffFn,
  resendStaffInviteFn,
  setStaffActiveFn,
  type StaffAccount,
} from "@/lib/staff-users";
import { useAscStore, useCurrentUser } from "@/lib/store";
import { getSupabase } from "@/lib/supabase/client";
import type { User } from "@/lib/types";

export const Route = createFileRoute("/_app/admin")({
  component: () => (
    <StaffGate>
      <AdminPage />
    </StaffGate>
  ),
});

async function accessToken(): Promise<string> {
  const { data } = (await getSupabase()?.auth.getSession()) ?? { data: { session: null } };
  if (!data.session?.access_token) throw new Error("You have been signed out. Sign in again.");
  return data.session.access_token;
}

function AdminPage() {
  const me = useCurrentUser();
  const users = useAscStore((s) => s.users);
  const clients = useAscStore((s) => s.clients);
  const inviteUser = useAscStore((s) => s.inviteUser);

  const [staff, setStaff] = useState<StaffAccount[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deactivate, setDeactivate] = useState<StaffAccount | null>(null);
  const [reactivate, setReactivate] = useState<StaffAccount | null>(null);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      setStaff(await listStaffFn({ data: { accessToken: await accessToken() } }));
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const clientUsers = users.filter((u) => u.role === "client");
  const clientName = (u: User) => clients.find((c) => c.id === u.clientId)?.name ?? "";

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Admin"
        description="Who can sign in to ASC Manager, on our side and for each client."
        action={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="size-4" />
            Invite staff
          </Button>
        }
      />

      <section className="flex flex-col gap-3" aria-label="ASC staff">
        <SectionHeader title="ASC staff" detail="People who can see and manage every client." />
        {failed ? (
          <Surface>
            <ErrorPanel
              framed={false}
              title="We could not load the staff list"
              detail="Check your connection and try again."
              onRetry={() => void load()}
            />
          </Surface>
        ) : staff === null ? (
          <Surface className="space-y-3 p-5" aria-busy="true" aria-label="Loading staff">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
          </Surface>
        ) : (
          <DataTable
            label="ASC staff"
            rows={staff}
            getRowId={(a) => a.userId}
            searchText={(a) => `${a.name} ${a.email}`}
            searchPlaceholder="Search staff"
            initialSort={{ id: "name", dir: "asc" }}
            empty={{
              icon: UsersRound,
              title: "No staff accounts yet",
              detail: "Invite the first person to get started.",
              action: <Button onClick={() => setInviteOpen(true)}>Invite staff</Button>,
            }}
            columns={[
              {
                id: "name",
                header: "Name",
                sort: (a, b) => a.name.localeCompare(b.name),
                cell: (a) => (
                  <>
                    <p className="font-medium">
                      {a.name}
                      {a.userId === me?.id ? (
                        <span className="type-small ml-2 font-normal text-muted-foreground">
                          (you)
                        </span>
                      ) : null}
                    </p>
                    <p className="type-small text-muted-foreground">{a.email}</p>
                  </>
                ),
              },
              {
                id: "role",
                header: "Role",
                hideBelow: "md",
                cell: () => <Badge variant="muted">ASC staff</Badge>,
              },
              {
                id: "status",
                header: "Status",
                sort: (a, b) => a.status.localeCompare(b.status),
                cell: (a) =>
                  a.status === "deactivated" ? (
                    <StatusBadge tone="neutral" label="Deactivated" />
                  ) : (
                    <StatusBadge status={a.status === "invited" ? "invited" : "active"} />
                  ),
              },
              {
                id: "last",
                header: "Last sign-in",
                hideBelow: "sm",
                sort: (a, b) => (a.lastSignInAt ?? "").localeCompare(b.lastSignInAt ?? ""),
                cell: (a) =>
                  a.lastSignInAt ? (
                    formatRelative(a.lastSignInAt)
                  ) : (
                    <span className="text-muted-foreground">Not yet</span>
                  ),
              },
              {
                id: "actions",
                header: "Actions",
                align: "right",
                cell: (a) => (
                  <div className="flex justify-end gap-1">
                    {a.status === "invited" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          void saveAction("Invite sent", async () => {
                            await resendStaffInviteFn({
                              data: { accessToken: await accessToken(), userId: a.userId },
                            });
                          });
                        }}
                      >
                        <MailPlus className="size-3.5" />
                        Resend invite
                      </Button>
                    ) : null}
                    {a.status === "deactivated" ? (
                      <Button size="sm" variant="outline" onClick={() => setReactivate(a)}>
                        Reactivate
                      </Button>
                    ) : a.userId !== me?.id ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeactivate(a)}
                      >
                        Deactivate
                      </Button>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
        )}
      </section>

      <section className="flex flex-col gap-3" aria-label="Client logins">
        <SectionHeader
          title="Client logins"
          detail="Everyone who can sign in on a client's behalf."
        />
        <DataTable
          label="Client logins"
          rows={clientUsers}
          getRowId={(u) => u.id}
          searchText={(u) => `${u.name} ${u.email} ${clientName(u)}`}
          searchPlaceholder="Search by name, email or client"
          initialSort={{ id: "name", dir: "asc" }}
          empty={{
            icon: UsersRound,
            title: "No client logins yet",
            detail: "Create a client and invite their first person.",
            action: (
              <Button asChild>
                <Link to="/clients">Go to clients</Link>
              </Button>
            ),
          }}
          columns={[
            {
              id: "name",
              header: "Name",
              sort: (a, b) => a.name.localeCompare(b.name),
              cell: (u) => (
                <>
                  <p className="font-medium">{u.name}</p>
                  <p className="type-small text-muted-foreground">{u.email}</p>
                </>
              ),
            },
            {
              id: "client",
              header: "Client",
              sort: (a, b) => clientName(a).localeCompare(clientName(b)),
              cell: (u) =>
                u.clientId ? (
                  <Link
                    to="/clients/$clientId"
                    params={{ clientId: u.clientId }}
                    search={{ tab: "logins" }}
                    className="font-medium text-primary hover:underline"
                  >
                    {clientName(u) || "Open client"}
                  </Link>
                ) : null,
            },
            {
              id: "access",
              header: "Access",
              hideBelow: "sm",
              cell: (u) => (
                <Badge variant={u.access === "admin" ? "default" : "muted"}>
                  {u.access === "admin" ? "Account admin" : "Staff login"}
                </Badge>
              ),
            },
          ]}
        />
      </section>

      <InviteStaffDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvite={async (name, email) => {
          const ok = await saveAction("Invite sent", () =>
            inviteUser({ email, name, role: "operator", tenantId: null }),
          );
          if (ok) {
            setInviteOpen(false);
            void load();
          }
        }}
      />

      <ConfirmDangerDialog
        open={Boolean(deactivate)}
        title={`Deactivate ${deactivate?.name ?? "this account"}?`}
        description="They will not be able to sign in until you reactivate them. Nothing they created is deleted."
        confirmLabel="Deactivate"
        onOpenChange={(v) => {
          if (!v) setDeactivate(null);
        }}
        onConfirm={async () => {
          if (!deactivate) return;
          const ok = await saveAction("Account deactivated", async () => {
            await setStaffActiveFn({
              data: { accessToken: await accessToken(), userId: deactivate.userId, active: false },
            });
          });
          if (ok) {
            setDeactivate(null);
            void load();
          }
        }}
      />

      <ConfirmDangerDialog
        tone="neutral"
        open={Boolean(reactivate)}
        title={`Reactivate ${reactivate?.name ?? "this account"}?`}
        description="They will be able to sign in again."
        confirmLabel="Reactivate"
        onOpenChange={(v) => {
          if (!v) setReactivate(null);
        }}
        onConfirm={async () => {
          if (!reactivate) return;
          const ok = await saveAction("Account reactivated", async () => {
            await setStaffActiveFn({
              data: { accessToken: await accessToken(), userId: reactivate.userId, active: true },
            });
          });
          if (ok) {
            setReactivate(null);
            void load();
          }
        }}
      />
    </div>
  );
}

function InviteStaffDialog({
  open,
  onOpenChange,
  onInvite,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onInvite: (name: string, email: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    await onInvite(name.trim(), email.trim());
    setBusy(false);
    setName("");
    setEmail("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(e) => void submit(e)} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Invite staff</DialogTitle>
            <DialogDescription>
              We email them a link to set their own password. They will be able to see every client.
            </DialogDescription>
          </DialogHeader>
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Email address">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              Send invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
