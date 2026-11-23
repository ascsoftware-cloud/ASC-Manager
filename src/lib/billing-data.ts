import { useEffect } from "react";
import { create } from "zustand";
import type { PlanChoice } from "@/lib/billing-plans";
import { getSupabase } from "@/lib/supabase/client";
import { useCurrentUser } from "@/lib/store";

export type PlanStatus = "awaiting" | "active" | "failed" | "cancelled";

export type Plan = {
  id: string;
  clientId: string;
  amountZar: number;
  item: string;
  choice: PlanChoice;
  hasDatabase: boolean;
  status: PlanStatus;
  nextBillingOn: string | null;
  lastPaidAt: string | null;
  failedAt: string | null;
  createdAt: string;
};

export type Payment = {
  id: string;
  clientId: string;
  amountZar: number;
  status: "complete" | "failed" | "cancelled";
  paidAt: string;
};

type BillingState = {
  forUser: string | null;
  plans: Plan[];
  payments: Payment[];
  loaded: boolean;
  /** True when the billing tables could not be read, for example before the migration is applied. */
  unavailable: boolean;
  load: (userId: string, force?: boolean) => Promise<void>;
};

const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Billing data, read straight from the database. RLS decides what each person can see. */
export const useBillingStore = create<BillingState>()((set, get) => ({
  forUser: null,
  plans: [],
  payments: [],
  loaded: false,
  unavailable: false,
  load: async (userId, force = false) => {
    if (!force && get().forUser === userId) return;
    set({ forUser: userId, loaded: false });
    const sb = getSupabase();
    if (!sb) {
      set({ loaded: true, unavailable: true, plans: [], payments: [] });
      return;
    }
    const [subs, pays] = await Promise.all([
      sb.from("subscriptions").select("*"),
      sb.from("payments").select("*").order("paid_at", { ascending: false }).limit(200),
    ]);
    if (subs.error || pays.error) {
      set({ loaded: true, unavailable: true, plans: [], payments: [] });
      return;
    }
    set({
      loaded: true,
      unavailable: false,
      plans: (subs.data ?? []).map((r) => ({
        id: str(r.id),
        clientId: str(r.tenant_id),
        amountZar: Number(r.amount_zar),
        item: str(r.item),
        choice: (["single", "starter", "standard", "scale", "custom"].includes(r.package)
          ? r.package
          : "custom") as PlanChoice,
        hasDatabase: r.has_database === true,
        status: (["awaiting", "active", "failed", "cancelled"].includes(r.status)
          ? r.status
          : "awaiting") as PlanStatus,
        nextBillingOn: r.next_billing_on ? str(r.next_billing_on) : null,
        lastPaidAt: r.last_paid_at ? str(r.last_paid_at) : null,
        failedAt: r.failed_at ? str(r.failed_at) : null,
        createdAt: str(r.created_at),
      })),
      payments: (pays.data ?? []).map((r) => ({
        id: str(r.id),
        clientId: str(r.tenant_id),
        amountZar: Number(r.amount_zar),
        status: r.status as Payment["status"],
        paidAt: str(r.paid_at),
      })),
    });
  },
}));

/** Loads billing once per signed-in person and keeps it in step. */
export function useBilling() {
  const user = useCurrentUser();
  const state = useBillingStore();
  const load = useBillingStore((s) => s.load);
  useEffect(() => {
    if (user?.id) void load(user.id);
  }, [user?.id, load]);
  return {
    ...state,
    reload: () => (user?.id ? load(user.id, true) : Promise.resolve()),
  };
}

/** The monthly plan for one client, if there is one. */
export function usePlan(clientId: string | null | undefined) {
  const b = useBilling();
  const plan = clientId ? (b.plans.find((p) => p.clientId === clientId) ?? null) : null;
  const payments = clientId ? b.payments.filter((p) => p.clientId === clientId) : [];
  return { plan, payments, loaded: b.loaded, unavailable: b.unavailable, reload: b.reload };
}

/** Send the browser to PayFast: a form post for a new plan, or a plain redirect to update a card. */
export function goToPayfast(form: { action: string; fields: [string, string][] }) {
  if (form.fields.length === 0) {
    window.location.assign(form.action);
    return;
  }
  const el = document.createElement("form");
  el.method = "POST";
  el.action = form.action;
  for (const [name, value] of form.fields) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    el.appendChild(input);
  }
  document.body.appendChild(el);
  el.submit();
}
