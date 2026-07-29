import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Il repo contiene anche il sito Vite alla radice (con il suo lockfile):
  // ancoriamo il file-tracing alla cartella funnel/ per un deploy Vercel corretto.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
