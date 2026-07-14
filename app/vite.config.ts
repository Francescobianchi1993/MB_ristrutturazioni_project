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
          // react-pdf e il suo albero (pdfkit, fontkit, yoga…) pesano ~1 MB e
          // servono solo a chi scarica il PDF della stima. Non li assegnamo a
          // nessun chunk: così Rollup li aggancia da solo al chunk dell'import
          // dinamico (lib/pdf/scaricaStima) e restano fuori dal bundle iniziale.
          // Metterli in un chunk manuale non funziona: gli helper condivisi ci
          // finiscono dentro, l'entry se lo importa e Vite lo precarica.
          if (PDF_DEPS.some((dep) => id.includes(`/node_modules/${dep}/`))) return;
          return 'vendor';
        },
      },
    },
  },
});

/**
 * Pacchetti usati SOLO da @react-pdf/renderer. Quelli condivisi con il resto
 * dell'app (scheduler, tslib, react-is, …) restano in `vendor`: spostarli qui
 * trascinerebbe il chunk `pdf` nel caricamento iniziale, vanificando tutto.
 */
const PDF_DEPS = [
  '@react-pdf',
  '@noble',
  'fontkit',
  'yoga-layout',
  'linebreak',
  'bidi-js',
  'hyphen',
  'restructure',
  'unicode-properties',
  'unicode-trie',
  'dfa',
  'tiny-inflate',
  'brotli',
  'png-js',
  'jay-peg',
  'media-engine',
  'queue',
  'abs-svg-path',
  'parse-svg-path',
  'normalize-svg-path',
  'svg-arc-to-cubic-bezier',
  'fflate',
  'pako',
  'browserify-zlib',
  'vite-compatible-readable-stream',
  'js-md5',
  'hsl-to-hex',
  'hsl-to-rgb-for-reals',
  'color-string',
  'is-url',
  'emoji-regex-xs',
  'base64-js',
  'string_decoder',
  'safe-buffer',
  'util-deprecate',
  'require-from-string',
];
