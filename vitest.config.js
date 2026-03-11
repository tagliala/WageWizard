import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    coverage: {
      provider: "v8",
      exclude: ["src/index.js", "src/globals-shim.js"],
    },
  },
});
