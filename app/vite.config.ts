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
      // Due entry: il sito (index.html) e l'anteprima isolata della Hero premium
      // (preview.html). L'anteprima non tocca in alcun modo il sito di produzione.
      input: {
        main: path.resolve(__dirname, 'index.html'),
        preview: path.resolve(__dirname, 'preview.html'),
      },
      output: {
        // Librerie in chunk separati e stabili → il browser li tiene in cache
        // tra un deploy e l'altro (cambiamo il codice nostro, non React/GSAP).
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'react';
          if (id.includes('gsap')) return 'gsap';
          // Lenis è usato SOLO dall'anteprima premium: chunk dedicato, così il
          // bundle di produzione (index.html) non lo carica nemmeno.
          if (id.includes('lenis')) return 'lenis';
          return 'vendor';
        },
      },
    },
  },
});
