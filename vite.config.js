import { defineConfig } from "vite";

// Use Vite's automatic JSX transform directly.
export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },

  server: {
    host: "0.0.0.0",
    allowedHosts: ["kinetic-cling-grunt.ngrok-free.dev"],
  },
});
