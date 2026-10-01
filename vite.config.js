import { defineConfig } from "vite";

// Use Vite's automatic JSX transform directly.
export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },

  server: {
    host: "0.0.0.0",
    // Accept ngrok's changing public subdomain while keeping normal host checks.
    allowedHosts: [".ngrok-free.dev"],
    // API calls from the shared frontend URL are forwarded to the local API.
    // This keeps cookies same-origin and means visitors do not need localhost.
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            if (req.headers.host) proxyReq.setHeader("x-forwarded-host", req.headers.host);
            if (req.headers["x-forwarded-proto"]) {
              proxyReq.setHeader("x-forwarded-proto", req.headers["x-forwarded-proto"]);
            } else {
              proxyReq.setHeader("x-forwarded-proto", req.headers.host?.endsWith(".ngrok-free.dev") ? "https" : "http");
            }
          });
        },
      },
    },
  },
});
