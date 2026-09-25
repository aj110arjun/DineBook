import { defineConfig } from 'vite';

// Use Vite's automatic JSX transform directly. This avoids injecting a Fast
// Refresh runtime into the customer auth entry while keeping React support.
export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
});
