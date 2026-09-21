import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  authCallbackUrl,
  authEmailCallbackTarget,
} from "./email-callback.ts";

describe("authCallbackUrl", () => {
  it("keeps http on localhost", () => {
    assert.equal(
      authCallbackUrl("http://localhost:8080"),
      "http://localhost:8080/auth/callback",
    );
  });

  it("keeps the tab origin so a working http session can finish reset", () => {
    assert.equal(
      authCallbackUrl("http://manager.ascsoftware.co.za"),
      "http://manager.ascsoftware.co.za/auth/callback",
    );
  });
});

describe("authEmailCallbackTarget", () => {
  it("sends a Site URL fallback (?code= on /) to the callback", () => {
    assert.equal(
      authEmailCallbackTarget(
        "https://manager.ascsoftware.co.za/?code=1024a2ab-0b1e-480e-be62-1ab35ba82d9a",
      ),
      "/auth/callback?code=1024a2ab-0b1e-480e-be62-1ab35ba82d9a",
    );
  });

  it("leaves /auth/callback alone", () => {
    assert.equal(
      authEmailCallbackTarget(
        "https://manager.ascsoftware.co.za/auth/callback?code=abc",
      ),
      null,
    );
  });

  it("ignores ordinary pages", () => {
    assert.equal(
      authEmailCallbackTarget("https://manager.ascsoftware.co.za/"),
      null,
    );
  });
});
