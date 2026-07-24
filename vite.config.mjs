import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  cacheDir: ".vite-cache",
  server: { port: 4173 },
  preview: { port: 4173 },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"]
  }
});
