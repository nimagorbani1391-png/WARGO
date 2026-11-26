import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // GitHub Pages serves this project under /WARGO/, not the domain root.
  base: "/WARGO/",
  plugins: [react()],
  build: {
    target: "es2022",
    sourcemap: false,
  },
});
