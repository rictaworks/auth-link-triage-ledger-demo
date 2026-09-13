import { describe, expect, it } from "vitest";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@/lib/fontawesome";

describe("FontAwesome config", () => {
  it("disables autoAddCss so sizing CSS ships via the static bundle instead of a runtime flash", () => {
    expect(config.autoAddCss).toBe(false);
  });
});
