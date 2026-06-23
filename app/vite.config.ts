import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  server: { host: true },
  plugins: [inspectAttr(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Librerie in chunk separati e stabili → il browser li tiene in cache
        // tra un deploy e l'altro (cambiamo il codice nostro, non React/GSAP).
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'react';
          if (id.includes('gsap')) return 'gsap';
          return 'vendor';
        },
      },
    },
  },
});
