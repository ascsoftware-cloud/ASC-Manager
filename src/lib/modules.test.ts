import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_MODULES, sectionEnabled } from "./modules.ts";

describe("sectionEnabled", () => {
  it("hides this_sunday always", () => {
    assert.equal(
      sectionEnabled({ modules: { ...EMPTY_MODULES, advert: true } }, "this_sunday"),
      false,
    );
  });

  it("keeps welcome and hours on for every client", () => {
    assert.equal(sectionEnabled({ modules: EMPTY_MODULES }, "welcome"), true);
    assert.equal(sectionEnabled({ modules: EMPTY_MODULES }, "hours"), true);
  });

  it("gates website extras and site pictures on their module flags", () => {
    const off = { modules: EMPTY_MODULES };
    assert.equal(sectionEnabled(off, "seo"), false);
    assert.equal(sectionEnabled(off, "faq"), false);
    assert.equal(sectionEnabled(off, "testimonials"), false);
    assert.equal(sectionEnabled(off, "gallery"), false);
    assert.equal(sectionEnabled(off, "services"), false);
    assert.equal(sectionEnabled(off, "staff"), false);
    assert.equal(sectionEnabled(off, "this_week"), false);

    const on = {
      modules: {
        ...EMPTY_MODULES,
        seo: true,
        faq: true,
        testimonials: true,
        gallery: true,
        services: true,
        staff: true,
        advert: true,
      },
    };
    assert.equal(sectionEnabled(on, "seo"), true);
    assert.equal(sectionEnabled(on, "faq"), true);
    assert.equal(sectionEnabled(on, "testimonials"), true);
    assert.equal(sectionEnabled(on, "gallery"), true);
    assert.equal(sectionEnabled(on, "services"), true);
    assert.equal(sectionEnabled(on, "staff"), true);
    assert.equal(sectionEnabled(on, "this_week"), true);
  });
});
