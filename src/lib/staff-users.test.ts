import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createStaffService,
  staffStatus,
  type AuthState,
  type StaffStore,
} from "./staff-users-service.ts";

const NOW = Date.parse("2026-11-23T10:00:00Z");

function fakeStore(states: Record<string, AuthState>) {
  const calls: string[] = [];
  const store: StaffStore = {
    async operatorProfiles() {
      return [
        { userId: "gregory", email: "gregory@staff.example", name: "Gregory" },
        { userId: "tiaan", email: "tiaan@staff.example", name: "Tiaan" },
        { userId: "newhire", email: "newhire@staff.example", name: "Zanele" },
      ];
    },
    async authStates() {
      return new Map(Object.entries(states));
    },
    async invite(email) {
      calls.push(`invite:${email}`);
    },
    async setBanned(userId, banned) {
      calls.push(`ban:${userId}:${banned}`);
    },
  };
  return { store, calls };
}

const signedIn: AuthState = { lastSignInAt: "2026-11-20T08:00:00Z", bannedUntil: null };
const pending: AuthState = { lastSignInAt: null, bannedUntil: null };

function service(opts: { callerIsOperator: boolean; states?: Record<string, AuthState> }) {
  const { store, calls } = fakeStore(
    opts.states ?? { gregory: signedIn, tiaan: signedIn, newhire: pending },
  );
  let touchedStore = false;
  const svc = createStaffService({
    now: () => NOW,
    async requireOperator() {
      if (!opts.callerIsOperator) throw new Error("Forbidden.");
      touchedStore = true;
      return { callerId: "gregory", store };
    },
  });
  return { svc, calls, touched: () => touchedStore };
}

describe("staff status", () => {
  it("is invited until the first sign-in", () => {
    assert.equal(staffStatus(pending, NOW), "invited");
    assert.equal(staffStatus(undefined, NOW), "invited");
  });
  it("is active after a sign-in", () => {
    assert.equal(staffStatus(signedIn, NOW), "active");
  });
  it("is deactivated while a ban is in the future", () => {
    assert.equal(
      staffStatus({ ...signedIn, bannedUntil: "2100-01-01T00:00:00Z" }, NOW),
      "deactivated",
    );
    assert.equal(staffStatus({ ...signedIn, bannedUntil: "2020-01-01T00:00:00Z" }, NOW), "active");
  });
});

describe("staff actions are operator-only", () => {
  it("refuses to list staff for a caller who is not staff", async () => {
    const { svc, touched } = service({ callerIsOperator: false });
    await assert.rejects(svc.list("token"), /Forbidden/);
    assert.equal(touched(), false);
  });

  it("refuses to resend an invite for a caller who is not staff", async () => {
    const { svc, calls } = service({ callerIsOperator: false });
    await assert.rejects(svc.resendInvite("token", "newhire"), /Forbidden/);
    assert.deepEqual(calls, []);
  });

  it("refuses to switch an account off for a caller who is not staff", async () => {
    const { svc, calls } = service({ callerIsOperator: false });
    await assert.rejects(svc.setActive("token", "tiaan", false), /Forbidden/);
    assert.deepEqual(calls, []);
  });

  it("every server function goes through the operator check", () => {
    const wiring = readFileSync(new URL("./staff-users.server.ts", import.meta.url), "utf8");
    assert.match(wiring, /requireOperatorAdmin/);
    const fns = readFileSync(new URL("./staff-users.ts", import.meta.url), "utf8");
    const created = fns.match(/createServerFn/g) ?? [];
    const loaded = fns.match(/import\("\.\/staff-users\.server"\)/g) ?? [];
    assert.equal(created.length > 0, true);
    assert.equal(created.length - 1, loaded.length, "each server fn loads the .server module");
  });
});

describe("staff actions", () => {
  it("lists status and last sign-in", async () => {
    const { svc } = service({ callerIsOperator: true });
    const list = await svc.list("token");
    assert.deepEqual(
      list.map((a) => [a.name, a.status]),
      [
        ["Gregory", "active"],
        ["Tiaan", "active"],
        ["Zanele", "invited"],
      ],
    );
    assert.equal(list[0].lastSignInAt, "2026-11-20T08:00:00Z");
  });

  it("resends an invite only to someone who has not signed in", async () => {
    const { svc, calls } = service({ callerIsOperator: true });
    await svc.resendInvite("token", "newhire");
    assert.deepEqual(calls, ["invite:newhire@staff.example"]);
    await assert.rejects(svc.resendInvite("token", "tiaan"), /already signed in/);
    await assert.rejects(svc.resendInvite("token", "someone-else"), /not on the staff list/);
    assert.equal(calls.length, 1);
  });

  it("will not let you deactivate yourself", async () => {
    const { svc, calls } = service({ callerIsOperator: true });
    await assert.rejects(svc.setActive("token", "gregory", false), /your own account/);
    assert.deepEqual(calls, []);
  });

  it("will not switch off the last active account", async () => {
    const { svc, calls } = service({
      callerIsOperator: true,
      states: {
        gregory: signedIn,
        tiaan: { ...signedIn, bannedUntil: "2100-01-01T00:00:00Z" },
        newhire: { ...pending, bannedUntil: "2100-01-01T00:00:00Z" },
      },
    });
    await assert.rejects(svc.setActive("token", "gregory", false), /your own account|stay switched on/);
    assert.deepEqual(calls, []);
  });

  it("switches another account off and on", async () => {
    const { svc, calls } = service({ callerIsOperator: true });
    await svc.setActive("token", "tiaan", false);
    await svc.setActive("token", "tiaan", true);
    assert.deepEqual(calls, ["ban:tiaan:true", "ban:tiaan:false"]);
  });
});
