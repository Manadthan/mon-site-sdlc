import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      // iPhone 12 mini : écran 375 × 812, tactile, agent Safari iOS.
      name: "iphone-12-mini",
      use: {
        ...devices["iPhone 12 Mini"],
        viewport: { width: 375, height: 812 },
        // Chromium partout pour l'instant ; WebKit (moteur de Safari) pourra être ajouté en CI (#3).
        browserName: "chromium",
      },
    },
  ],
  // Teste le build de production, comme sur Vercel.
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
