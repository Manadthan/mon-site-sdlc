import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

// iPhone 12 mini : écran 375 × 812, tactile, agent Safari iOS.
const iphone12Mini = { ...devices["iPhone 12 Mini"], viewport: { width: 375, height: 812 } };

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
      name: "iphone-12-mini",
      use: { ...iphone12Mini, browserName: "chromium" },
    },
    // WebKit = moteur de Safari, le navigateur de l'iPhone. Lancé seulement en CI :
    // il n'est pas installé dans l'environnement de Claude.
    ...(process.env.CI
      ? [{ name: "iphone-12-mini-webkit", use: { ...iphone12Mini, browserName: "webkit" as const } }]
      : []),
  ],
  // Teste le build de production, comme sur Vercel.
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
