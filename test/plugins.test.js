import { describe, it, expect } from "vitest";

describe("plugins (clipboard)", () => {
  it("navigator.clipboard is not available in jsdom", () => {
    // jsdom does not implement navigator.clipboard;
    // the actual code guards with a typeof check.
    expect(navigator.clipboard).toBeUndefined();
  });
});
