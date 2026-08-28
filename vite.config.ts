import { defineConfig, type Plugin } from 'vite';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

function injectServiceWorkerAssets(): Plugin {
  return {
    name: 'inject-service-worker-assets',
    apply: 'build',
    async closeBundle() {
      const dist = resolve('dist');
      const assets = await readdir(resolve(dist, 'assets'));
      const hashed = assets
        .filter((file) => /\.(js|css)$/.test(file))
        .map((file) => `/assets/${file}`);
      const swPath = resolve(dist, 'sw.js');
      const source = await readFile(swPath, 'utf8');
      await writeFile(swPath, source.replace('"__BUILD_ASSETS__"', JSON.stringify(hashed)));
    }
  };
}

export default defineConfig({
  build: {
    target: 'es2022',
    sourcemap: true
  },
  plugins: [injectServiceWorkerAssets()]
});
