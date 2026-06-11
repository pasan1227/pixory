import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // Pin a non-UTC zone so UTC-vs-local-time bugs can't pass vacuously on
    // UTC-configured CI machines.
    env: { TZ: "Asia/Colombo" },
  },
});
