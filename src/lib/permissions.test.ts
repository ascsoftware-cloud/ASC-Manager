import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canManageTeam,
  canUse,
  cleanPermissions,
  describeAccess,
  isAccountAdmin,
} from "./permissions.ts";
import { resolveActiveSiteId, sitesForUser } from "./tenant-scope.ts";
import type { Site, User } from "./types.ts";

function user(over: Partial<User>): User {
  return {
    id: "u",
    email: "u@example.com",
    name: "U",
    role: "client",
    clientId: "t1",
    access: "admin",
    permissions: [],
    siteIds: [],
    ...over,
  };
}

function site(id: string, clientId = "t1"): Site {
  return { id, clientId, name: id, host: id, url: `https://${id}`, kind: "public" };
}

describe("page permissions", () => {
  it("lets ASC staff and account admins open everything", () => {
    const operator = user({ role: "operator", clientId: null });
    const admin = user({ access: "admin" });
    for (const key of ["billing", "store", "business"] as const) {
      assert.equal(canUse(operator, key), true);
      assert.equal(canUse(admin, key), true);
    }
  });

  it("holds a staff login to the pages they were given", () => {
    const staff = user({ access: "staff", permissions: ["enquiries", "visitors"] });
    assert.equal(canUse(staff, "enquiries"), true);
    assert.equal(canUse(staff, "visitors"), true);
    assert.equal(canUse(staff, "billing"), false);
    assert.equal(canUse(staff, "store"), false);
  });

  it("gives a staff login with no pages nothing", () => {
    const staff = user({ access: "staff" });
    assert.equal(canUse(staff, "content"), false);
    assert.equal(canUse(undefined, "content"), false);
  });

  it("only account admins manage the team", () => {
    assert.equal(canManageTeam(user({ access: "admin" })), true);
    assert.equal(canManageTeam(user({ access: "staff", permissions: ["billing"] })), false);
    assert.equal(canManageTeam(user({ role: "operator", clientId: null })), false);
    assert.equal(isAccountAdmin(undefined), false);
  });

  it("drops unknown permission names and duplicates", () => {
    assert.deepEqual(cleanPermissions(["store", "store", "root", "billing"]), [
      "store",
      "billing",
    ]);
  });

  it("describes access in plain words", () => {
    assert.match(describeAccess(user({ access: "admin" }), 3), /Everything/);
    assert.equal(
      describeAccess(user({ access: "staff", permissions: ["store", "calendar"] }), 1),
      "Store, Calendar",
    );
    assert.equal(
      describeAccess(
        user({ access: "staff", permissions: ["store"], siteIds: ["a"] }),
        3,
      ),
      "Store · 1 of 3 sites",
    );
    assert.equal(
      describeAccess(user({ access: "staff", permissions: ["store"] }), 3),
      "Store · all sites",
    );
  });
});

describe("site access per login", () => {
  const sites = [site("a"), site("b"), site("c"), site("x", "other")];

  it("gives admins every site on the account", () => {
    assert.deepEqual(
      sitesForUser(sites, user({ access: "admin" })).map((s) => s.id),
      ["a", "b", "c"],
    );
  });

  it("gives a staff login with no site list every site", () => {
    assert.deepEqual(
      sitesForUser(sites, user({ access: "staff" })).map((s) => s.id),
      ["a", "b", "c"],
    );
  });

  it("holds a staff login to their chosen sites", () => {
    const staff = user({ access: "staff", siteIds: ["b", "x"] });
    assert.deepEqual(sitesForUser(sites, staff).map((s) => s.id), ["b"]);
  });

  it("never falls back to a site the login was not given", () => {
    const staff = user({ access: "staff", siteIds: ["c"] });
    assert.equal(resolveActiveSiteId(sites, "t1", "a", staff), "c");
    assert.equal(resolveActiveSiteId(sites, "t1", null, staff), "c");
  });

  it("returns nothing for a login with no account", () => {
    assert.deepEqual(sitesForUser(sites, undefined), []);
    assert.deepEqual(sitesForUser(sites, user({ clientId: null })), []);
  });
});
