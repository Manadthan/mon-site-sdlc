import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // Tests unitaires uniquement dans src/ ; les tests e2e (tests/e2e) sont lancés par Playwright.
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
