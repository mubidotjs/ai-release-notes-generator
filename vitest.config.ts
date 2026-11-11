import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "shared/**/*.test.ts",
      "worker/**/*.test.ts",
      "web/**/*.test.tsx",
    ],
    environment: "node",
    restoreMocks: true,
  },
});
